/**
 * SELECT statement executor.
 * Supports: SELECT *, WHERE, ORDER BY, LIMIT, OFFSET
 */

import { SheetsAdapter } from "../adapter/sheets.js";
import type { SelectStatement, WhereClause } from "../types/ast.js";
import type { ExecutionContext, QueryResult } from "../types/execution.js";
import { logger } from "../utils/logger.js";

export class SelectExecutor {
  constructor(private context: ExecutionContext) {}

  executeSync(stmt: SelectStatement): QueryResult {
    const { from: tableName, where, orderBy, limit, offset } = stmt;

    try {
      const adapter = new SheetsAdapter({
        spreadsheet: this.context.spreadsheet,
      });

      // Check table exists
      if (!adapter.sheetExists(tableName)) {
        throw new Error(`Table ${tableName} does not exist`);
      }

      // Read all data
      const allData = adapter.readRangeSync(tableName);

      if (allData.length === 0) {
        throw new Error(`Table ${tableName} is empty`);
      }

      const headers = allData[0] as string[];
      let rows = allData.slice(1);

      // Apply WHERE filter
      if (where) {
        rows = this.filterRows(rows, headers, where);
      }

      // Apply ORDER BY
      if (orderBy && orderBy.length > 0) {
        rows = this.sortRows(rows, headers, orderBy);
      }

      // Apply OFFSET
      if (offset && offset > 0) {
        rows = rows.slice(offset);
      }

      // Apply LIMIT
      if (limit && limit > 0) {
        rows = rows.slice(0, limit);
      }

      logger.info(
        `Selected ${rows.length} rows from ${tableName}`,
      );

      return {
        columns: headers,
        rows: rows,
        affectedRowCount: 0,
      };
    } catch (err) {
      logger.error(`SELECT failed for ${tableName}`, err);
      throw err;
    }
  }

  private filterRows(
    rows: any[][],
    headers: string[],
    where: WhereClause,
  ): any[][] {
    return rows.filter((row) => this.isTruthy(this.evaluateExpression(row, headers, where.expr)));
  }

  private evaluateExpression(row: any[], headers: string[], expr: any): any {
    if (expr.type === "LITERAL") {
      return expr.value;
    }

    if (expr.type === "COLUMN") {
      return this.getExpressionValue(row, headers, expr);
    }

    if (expr.type === "PAREN") {
      return this.evaluateExpression(row, headers, expr.expr);
    }

    if (expr.type === "UNARY_OP") {
      const val = this.getExpressionValue(row, headers, expr.operand);
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
          this.isTruthy(this.evaluateExpression(row, headers, expr.left)) &&
          this.isTruthy(this.evaluateExpression(row, headers, expr.right))
        );
      }

      if (op === "OR") {
        return (
          this.isTruthy(this.evaluateExpression(row, headers, expr.left)) ||
          this.isTruthy(this.evaluateExpression(row, headers, expr.right))
        );
      }

      // Comparison operators
      const leftVal = this.getExpressionValue(row, headers, expr.left);
      const rightVal = this.getExpressionValue(row, headers, expr.right);

      switch (op) {
        case "=":
          return leftVal === rightVal;
        case "!=":
        case "<>":
          return leftVal !== rightVal;
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
          return leftVal === rightVal;
        case "IS NOT":
          return leftVal !== rightVal;
        case "+":
          return Number(leftVal) + Number(rightVal);
        case "-":
          return Number(leftVal) - Number(rightVal);
        case "*":
          return Number(leftVal) * Number(rightVal);
        case "/":
          return Number(leftVal) / Number(rightVal);
        default:
          throw new Error(`Unsupported operator: ${op}`);
      }
    }

    throw new Error(`Unsupported expression type: ${expr.type}`);
  }

  private getExpressionValue(row: any[], headers: string[], expr: any): any {
    if (expr.type === "LITERAL") {
      return expr.value;
    }

    if (expr.type === "COLUMN") {
      const colIndex = headers.indexOf(expr.name);
      if (colIndex === -1) {
        throw new Error(`Column ${expr.name} not found`);
      }
      return row[colIndex];
    }

    if (expr.type === "PAREN") {
      return this.getExpressionValue(row, headers, expr.expr);
    }

    if (expr.type === "UNARY_OP") {
      const val = this.getExpressionValue(row, headers, expr.operand);
      switch (expr.op.toUpperCase()) {
        case "NOT":
          return !this.isTruthy(val);
        case "-":
          return -Number(val);
        case "+":
          return Number(val);
        default:
          return val;
      }
    }

    if (expr.type === "BINARY_OP") {
      const op = expr.op.toUpperCase();
      const leftVal = this.getExpressionValue(row, headers, expr.left);
      const rightVal = this.getExpressionValue(row, headers, expr.right);

      switch (op) {
        case "+":
          return Number(leftVal) + Number(rightVal);
        case "-":
          return Number(leftVal) - Number(rightVal);
        case "*":
          return Number(leftVal) * Number(rightVal);
        case "/":
          return Number(rightVal) !== 0 ? Number(leftVal) / Number(rightVal) : null;
        case "AND":
          return this.isTruthy(leftVal) && this.isTruthy(rightVal);
        case "OR":
          return this.isTruthy(leftVal) || this.isTruthy(rightVal);
        default:
          return null;
      }
    }

    if (expr.type === "FUNCTION") {
      return this.evaluateFunction(row, headers, expr);
    }

    throw new Error(`Unsupported expression type: ${expr.type}`);
  }

  private evaluateFunction(row: any[], headers: string[], expr: any): any {
    const name = expr.name.toUpperCase();
    const args = expr.args.map((arg: any) => this.getExpressionValue(row, headers, arg));

    switch (name) {
      case "UPPER":
        return String(args[0] ?? "").toUpperCase();
      case "LOWER":
        return String(args[0] ?? "").toLowerCase();
      case "LENGTH":
      case "LEN":
        return String(args[0] ?? "").length;
      case "TRIM":
        return String(args[0] ?? "").trim();
      case "SUBSTR":
      case "SUBSTRING":
        return String(args[0] ?? "").substring(Number(args[1] || 0), Number(args[2]));
      case "ABS":
        return Math.abs(Number(args[0] || 0));
      case "ROUND":
        return Math.round(Number(args[0] || 0));
      case "COALESCE":
        return args.find((v: any) => v !== null && v !== undefined && v !== "");
      default:
        throw new Error(`Unsupported function: ${name}`);
    }
  }

  private sortRows(
    rows: any[][],
    headers: string[],
    orderBy: Array<{ column: string; desc: boolean }>,
  ): any[][] {
    return rows.sort((a, b) => {
      for (const order of orderBy) {
        const colIndex = headers.indexOf(order.column);
        if (colIndex === -1) {
          continue;
        }

        const aVal = a[colIndex];
        const bVal = b[colIndex];

        // Try numeric comparison first
        const aNum = Number(aVal);
        const bNum = Number(bVal);

        let cmp = 0;
        if (!isNaN(aNum) && !isNaN(bNum)) {
          cmp = aNum - bNum;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }

        if (cmp !== 0) {
          return order.desc ? -cmp : cmp;
        }
      }

      return 0;
    });
  }

  private isTruthy(value: any): boolean {
    if (value === null || value === undefined || value === "") {
      return false;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "boolean") {
      return value;
    }
    return true;
  }
}
