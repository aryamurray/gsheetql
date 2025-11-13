/**
 * UPDATE statement executor.
 * Supports: UPDATE table SET col=value, ... WHERE condition
 */

import { SheetsAdapter } from "../adapter/sheets.js";
import type { UpdateStatement } from "../types/ast.js";
import type { ExecutionContext, QueryResult } from "../types/execution.js";
import { logger } from "../utils/logger.js";

export class UpdateExecutor {
  constructor(private context: ExecutionContext) {}

  /**
   * Extract column name from potentially qualified name (e.g., "table.column" -> "column")
   */
  private getColumnName(qualifiedName: string): string {
    const parts = qualifiedName.split(".");
    return parts[parts.length - 1]; // Return last part after dot
  }

  executeSync(stmt: UpdateStatement): QueryResult {
    const { table, assignments, where } = stmt;

    try {
      const adapter = new SheetsAdapter({
        spreadsheet: this.context.spreadsheet,
      });

      // Check table exists
      if (!adapter.sheetExists(table)) {
        throw new Error(`Table ${table} does not exist`);
      }

      // Read all data
      const allData = adapter.readRangeSync(table);

      if (allData.length === 0) {
        throw new Error(`Table ${table} is empty`);
      }

      const headers = allData[0] as string[];
      const dataRows = allData.slice(1);

      // Find rows to update based on WHERE clause
      const rowIndicesToUpdate: number[] = [];
      if (where) {
        for (let i = 0; i < dataRows.length; i++) {
          if (
            this.isTruthy(
              this.evaluateExpression(dataRows[i], headers, where.expr),
            )
          ) {
            rowIndicesToUpdate.push(i);
          }
        }
      } else {
        // No WHERE clause - update all rows
        for (let i = 0; i < dataRows.length; i++) {
          rowIndicesToUpdate.push(i);
        }
      }

      // Apply assignments to matching rows
      let affectedCount = 0;
      for (const rowIndex of rowIndicesToUpdate) {
        const row = dataRows[rowIndex];

        // Apply each assignment
        for (const assignment of assignments) {
          const colName = this.getColumnName(assignment.column);
          const colIndex = headers.indexOf(colName);
          if (colIndex === -1) {
            throw new Error(
              `Column ${assignment.column} not found in table ${table}`,
            );
          }

          // Evaluate the value expression
          const newValue = this.evaluateExpression(
            row,
            headers,
            assignment.value,
          );
          row[colIndex]
            = newValue === null || newValue === undefined ? "" : String(newValue);
        }

        affectedCount++;
      }

      // Save snapshot if in transaction
      if (this.context.inTransaction && this.context.transactionSnapshot) {
        if (!this.context.transactionSnapshot.has(table)) {
          this.context.transactionSnapshot.set(table, allData);
        }
      }

      // Write back all data (including unchanged rows) to preserve row order
      if (affectedCount > 0) {
        adapter.writeRangeSync(table, 2, dataRows);
      }

      logger.info(`Updated ${affectedCount} rows in ${table}`);

      return {
        columns: [],
        rows: [],
        affectedRowCount: affectedCount,
      };
    } catch (err) {
      logger.error(`UPDATE failed for ${table}`, err);
      throw err;
    }
  }

  private evaluateExpression(row: any[], headers: string[], expr: any): any {
    if (expr.type === "LITERAL") {
      return expr.value;
    }

    if (expr.type === "COLUMN") {
      const colName = this.getColumnName(expr.name);
      const colIndex = headers.indexOf(colName);
      if (colIndex === -1) {
        throw new Error(`Column ${expr.name} not found`);
      }
      return row[colIndex];
    }

    if (expr.type === "PAREN") {
      return this.evaluateExpression(row, headers, expr.expr);
    }

    if (expr.type === "UNARY_OP") {
      const val = this.evaluateExpression(row, headers, expr.operand);
      switch (expr.op.toUpperCase()) {
        case "NOT":
          return !this.isTruthy(val);
        case "-":
          return -Number(val);
        case "+":
          return Number(val);
        default:
          throw new Error(`Unsupported unary operator: ${expr.op}`);
      }
    }

    if (expr.type === "BINARY_OP") {
      const op = expr.op.toUpperCase();

      // Logical operators
      if (op === "AND") {
        return (
          this.isTruthy(this.evaluateExpression(row, headers, expr.left))
          && this.isTruthy(this.evaluateExpression(row, headers, expr.right))
        );
      }

      if (op === "OR") {
        return (
          this.isTruthy(this.evaluateExpression(row, headers, expr.left))
          || this.isTruthy(this.evaluateExpression(row, headers, expr.right))
        );
      }

      // Comparison operators
      const leftVal = this.evaluateExpression(row, headers, expr.left);
      const rightVal = this.evaluateExpression(row, headers, expr.right);

      switch (op) {
        case "=": {
          // Type-aware comparison: try numeric comparison first
          const leftNum = Number(leftVal);
          const rightNum = Number(rightVal);
          if (!isNaN(leftNum) && !isNaN(rightNum)) {
            return leftNum === rightNum;
          }
          return String(leftVal) === String(rightVal);
        }
        case "!=":
        case "<>": {
          // Type-aware comparison
          const leftNum = Number(leftVal);
          const rightNum = Number(rightVal);
          if (!isNaN(leftNum) && !isNaN(rightNum)) {
            return leftNum !== rightNum;
          }
          return String(leftVal) !== String(rightVal);
        }
        case ">":
          return Number(leftVal) > Number(rightVal);
        case ">=":
          return Number(leftVal) >= Number(rightVal);
        case "<":
          return Number(leftVal) < Number(rightVal);
        case "<=":
          return Number(leftVal) <= Number(rightVal);
        case "LIKE":
          return String(leftVal).includes(String(rightVal).replace(/%/g, ""));
        case "IS":
          const leftIsNull
            = leftVal === null || leftVal === undefined || leftVal === "";
          const rightIsNull
            = rightVal === null || rightVal === undefined || rightVal === "";

          if (rightIsNull) {
            return leftIsNull;
          }
          return leftVal === rightVal;
        case "IS NOT":
          const leftIsNotNull = !(
            leftVal === null
            || leftVal === undefined
            || leftVal === ""
          );
          const rightIsNotNull = !(
            rightVal === null
            || rightVal === undefined
            || rightVal === ""
          );

          if (!rightIsNotNull) {
            return leftIsNotNull;
          }
          return leftVal !== rightVal;
        case "+":
          return Number(leftVal) + Number(rightVal);
        case "-":
          return Number(leftVal) - Number(rightVal);
        case "*":
          return Number(leftVal) * Number(rightVal);
        case "/":
          return Number(rightVal) !== 0
            ? Number(leftVal) / Number(rightVal)
            : null;
        default:
          throw new Error(`Unsupported operator: ${op}`);
      }
    }

    if (expr.type === "FUNCTION") {
      return this.evaluateFunction(row, headers, expr);
    }

    throw new Error(`Unsupported expression type: ${expr.type}`);
  }

  private evaluateFunction(row: any[], headers: string[], expr: any): any {
    const name = expr.name.toUpperCase();
    const args = expr.args.map((arg: any) =>
      this.evaluateExpression(row, headers, arg),
    );

    switch (name) {
      case "UPPER":
        return String(args[0] ?? "").toUpperCase();
      case "LOWER":
        return String(args[0] ?? "").toLowerCase();
      case "LENGTH":
        return String(args[0] ?? "").length;
      case "TRIM":
        return String(args[0] ?? "").trim();
      case "SUBSTR":
        return String(args[0] ?? "").substring(
          Number(args[1] ?? 0),
          Number(args[2] ?? undefined),
        );
      case "ABS":
        return Math.abs(Number(args[0] ?? 0));
      case "ROUND":
        return (
          Math.round(
            Number(args[0] ?? 0) * 10 ** Number(args[1] ?? 0),
          ) / 10 ** Number(args[1] ?? 0)
        );
      case "COALESCE":
        return (
          args.find((a: any) => a !== null && a !== undefined && a !== "")
          ?? null
        );
      default:
        throw new Error(`Unsupported function: ${name}`);
    }
  }

  private isTruthy(value: any): boolean {
    return (
      value !== null
      && value !== undefined
      && value !== false
      && value !== ""
      && value !== 0
    );
  }
}
