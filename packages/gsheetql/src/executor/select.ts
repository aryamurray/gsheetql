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

  /**
   * Extract column name from potentially qualified name (e.g., "table.column" -> "column")
   */
  private getColumnName(qualifiedName: string): string {
    const parts = qualifiedName.split(".");
    return parts[parts.length - 1]; // Return last part after dot
  }

  /**
   * Check if any of the selected columns are aggregate functions
   */
  private hasAggregateFunction(selectColumns: any[]): boolean {
    return selectColumns.some(col =>
      col.expr.type === "FUNCTION"
      && ["COUNT", "SUM", "AVG", "MIN", "MAX"].includes(col.expr.name.toUpperCase()),
    );
  }

  executeSync(stmt: SelectStatement): QueryResult {
    const { from: tableName, columns: selectColumns, where, groupBy, having, orderBy, limit, offset } = stmt;

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

      // Apply WHERE filter first
      if (where) {
        rows = this.filterRows(rows, headers, where);
      }

      // Handle GROUP BY if present, or aggregates without GROUP BY
      let selectedColumns = headers;
      let selectedColumnIndices: number[] = [];
      const isSelectAll = selectColumns.length === 1 && selectColumns[0].expr.type === "STAR";
      const hasAggregates = this.hasAggregateFunction(selectColumns);

      if (groupBy && groupBy.length > 0) {
        // Perform grouping
        rows = this.groupRows(rows, headers, groupBy, selectColumns, having);

        // After grouping, columns are the group keys + aggregate results
        if (!isSelectAll) {
          // Specific columns selected - extract from select list with aliases
          selectedColumns = selectColumns.map((col: any) => {
            // Use alias if provided, otherwise use expression name
            if (col.alias) {
              return col.alias;
            }
            if (col.expr.type === "FUNCTION") {
              return col.expr.name.toLowerCase();
            }
            const colName = this.getColumnName(col.expr.name);
            return colName;
          });
        }
      } else if (hasAggregates) {
        // Aggregate functions without GROUP BY - treat entire result set as one group
        const aggregateRow: any[] = [];

        for (const selectCol of selectColumns) {
          const expr = selectCol.expr;

          if (expr.type === "FUNCTION") {
            const funcName = expr.name.toUpperCase();
            let aggValue: any = null;

            switch (funcName) {
              case "COUNT": {
                if (expr.args.length === 0) {
                  // COUNT(*) - count all rows
                  aggValue = rows.length;
                } else {
                  // COUNT(column) - count non-null values
                  const arg = expr.args[0] as any;
                  const colName = this.getColumnName(arg.name);
                  const colIdx = headers.indexOf(colName);
                  aggValue = rows.filter(r => r[colIdx] !== null && r[colIdx] !== "").length;
                }
                break;
              }
              case "SUM": {
                const arg = expr.args[0] as any;
                const colName = this.getColumnName(arg.name);
                const colIdx = headers.indexOf(colName);
                aggValue = rows.reduce((sum, r) => sum + Number(r[colIdx] || 0), 0);
                break;
              }
              case "AVG": {
                const arg = expr.args[0] as any;
                const colName = this.getColumnName(arg.name);
                const colIdx = headers.indexOf(colName);
                const sum = rows.reduce((s, r) => s + Number(r[colIdx] || 0), 0);
                aggValue = rows.length > 0 ? sum / rows.length : null;
                break;
              }
              case "MIN": {
                const arg = expr.args[0] as any;
                const colName = this.getColumnName(arg.name);
                const colIdx = headers.indexOf(colName);
                const values = rows.map(r => Number(r[colIdx])).filter(v => !Number.isNan(v));
                aggValue = values.length > 0 ? Math.min(...values) : null;
                break;
              }
              case "MAX": {
                const arg = expr.args[0] as any;
                const colName = this.getColumnName(arg.name);
                const colIdx = headers.indexOf(colName);
                const values = rows.map(r => Number(r[colIdx])).filter(v => !Number.isNan(v));
                aggValue = values.length > 0 ? Math.max(...values) : null;
                break;
              }
            }

            aggregateRow.push(aggValue);
          }
        }

        rows = [aggregateRow];
        selectedColumns = selectColumns.map((col: any) => {
          if (col.alias) {
            return col.alias;
          }
          if (col.expr.type === "FUNCTION") {
            return col.expr.name.toLowerCase();
          }
          return col.expr.name;
        });
      } else {
        // No GROUP BY and no aggregates - determine which columns to select
        if (!isSelectAll) {
          // Specific columns selected
          selectedColumns = selectColumns.map((col: any) => {
            const colName = this.getColumnName(col.expr.name);
            const colIndex = headers.indexOf(colName);
            if (colIndex === -1) {
              throw new Error(`Column ${col.expr.name} not found`);
            }
            selectedColumnIndices.push(colIndex);
            // Use alias if provided, otherwise use column name
            return col.alias || colName;
          });
        } else {
          // SELECT * - use all columns
          selectedColumnIndices = headers.map((_, i) => i);
        }

        // Project selected columns only
        if (!isSelectAll) {
          rows = rows.map(row =>
            selectedColumnIndices.map(idx => row[idx]),
          );
        }
      }

      // Apply ORDER BY
      if (orderBy && orderBy.length > 0) {
        rows = this.sortRows(rows, selectedColumns, orderBy);
      }

      // Apply OFFSET
      if (offset && offset > 0) {
        rows = rows.slice(offset);
      }

      // Apply LIMIT (limit === 0 is valid and means return 0 rows)
      if (limit !== null && limit !== undefined && limit >= 0) {
        rows = rows.slice(0, limit);
      }

      logger.info(`Selected ${rows.length} rows from ${tableName}`);

      // Convert rows to proper types based on schema
      const schema = this.context.schemas.get(tableName);
      if (schema) {
        rows = rows.map((row: any[]) => {
          return row.map((value, idx) => {
            const columnName = selectedColumns[idx];
            if (!columnName)
              return value;

            const colDef = schema.columns.find(
              c => c.name === columnName,
            );
            if (!colDef)
              return value;

            // Convert based on column type
            if (value === null || value === undefined || value === "") {
              return null;
            }

            switch (colDef.type) {
              case "INTEGER": {
                const intVal = Number(value);
                return !Number.isNaN(intVal) && Number.isInteger(intVal) ? intVal : value;
              }
              case "REAL": {
                const floatVal = Number(value);
                return !Number.isNaN(floatVal) ? floatVal : value;
              }
              case "TEXT":
              case "BLOB":
              default:
                return value;
            }
          });
        });
      }

      return {
        columns: selectedColumns,
        rows,
        affectedRowCount: 0,
      };
    } catch (err) {
      logger.error(`SELECT failed for ${tableName}`, err);
      throw err;
    }
  }

  private evaluateHaving(
    _selectColumns: any[],
    having: any,
    originalHeaders: string[],
    groupRows: any[][],
  ): boolean {
    // Create a special context for HAVING evaluation where aggregate functions
    // can be recalculated if needed
    const havingEvaluator = (expr: any): any => {
      if (expr.type === "LITERAL") {
        return expr.value;
      }

      if (expr.type === "FUNCTION") {
        // Aggregate function in HAVING - calculate it from groupRows
        const funcName = expr.name.toUpperCase();
        switch (funcName) {
          case "COUNT": {
            if (expr.args.length === 0 || expr.args[0].type === "STAR") {
              return groupRows.length;
            } else {
              const colName = this.getColumnName(expr.args[0].name);
              const colIdx = originalHeaders.indexOf(colName);
              return groupRows.filter(r => r[colIdx] !== null && r[colIdx] !== "").length;
            }
          }
          case "SUM": {
            const colName = this.getColumnName(expr.args[0].name);
            const colIdx = originalHeaders.indexOf(colName);
            return groupRows.reduce((sum, r) => sum + Number(r[colIdx] || 0), 0);
          }
          case "AVG": {
            const colName = this.getColumnName(expr.args[0].name);
            const colIdx = originalHeaders.indexOf(colName);
            const sum = groupRows.reduce((s, r) => s + Number(r[colIdx] || 0), 0);
            return groupRows.length > 0 ? sum / groupRows.length : null;
          }
          case "MIN": {
            const colName = this.getColumnName(expr.args[0].name);
            const colIdx = originalHeaders.indexOf(colName);
            const values = groupRows.map(r => Number(r[colIdx])).filter(v => !Number.isNan(v));
            return values.length > 0 ? Math.min(...values) : null;
          }
          case "MAX": {
            const colName = this.getColumnName(expr.args[0].name);
            const colIdx = originalHeaders.indexOf(colName);
            const values = groupRows.map(r => Number(r[colIdx])).filter(v => !Number.isNan(v));
            return values.length > 0 ? Math.max(...values) : null;
          }
          default:
            throw new Error(`Unsupported aggregate in HAVING: ${funcName}`);
        }
      }

      if (expr.type === "BINARY_OP") {
        const op = expr.op.toUpperCase();
        const left = havingEvaluator(expr.left);
        const right = havingEvaluator(expr.right);

        switch (op) {
          case "=":
            return Number(left) === Number(right);
          case "!=":
          case "<>":
            return Number(left) !== Number(right);
          case ">":
            return Number(left) > Number(right);
          case ">=":
            return Number(left) >= Number(right);
          case "<":
            return Number(left) < Number(right);
          case "<=":
            return Number(left) <= Number(right);
          case "AND":
            return this.isTruthy(left) && this.isTruthy(right);
          case "OR":
            return this.isTruthy(left) || this.isTruthy(right);
          default:
            return null;
        }
      }

      throw new Error(`Unsupported expression in HAVING: ${expr.type}`);
    };

    return this.isTruthy(havingEvaluator(having));
  }

  private filterRows(
    rows: any[][],
    headers: string[],
    where: WhereClause,
  ): any[][] {
    return rows.filter(row =>
      this.isTruthy(this.evaluateExpression(row, headers, where.expr)),
    );
  }

  private groupRows(
    rows: any[][],
    headers: string[],
    groupByColumns: string[],
    selectColumns: any[],
    having?: any,
  ): any[][] {
    // Map group by column names to indices
    const groupByIndices = groupByColumns.map(colName => {
      const colName2 = this.getColumnName(colName);
      const idx = headers.indexOf(colName2);
      if (idx === -1) {
        throw new Error(`Column ${colName} not found in GROUP BY`);
      }
      return idx;
    });

    // Group rows by the GROUP BY columns
    const groups = new Map<string, any[][]>();
    for (const row of rows) {
      // Create group key from GROUP BY column values
      const groupKey = groupByIndices.map(idx => row[idx]).join("\x00");
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    }

    // Build result rows with aggregates
    const resultRows: any[][] = [];
    for (const [_, groupRows] of groups.entries()) {
      // Create a row with group key values + aggregate calculations
      const resultRow: any[] = [];

      // First, add the group key columns
      for (const idx of groupByIndices) {
        resultRow.push(groupRows[0][idx]); // All rows in group have same values
      }

      // Then, calculate aggregates for non-group-by columns in SELECT
      for (const selectCol of selectColumns) {
        const expr = selectCol.expr;

        if (expr.type === "FUNCTION") {
          // Aggregate function
          const funcName = expr.name.toUpperCase();
          let aggValue: any = null;

          switch (funcName) {
            case "COUNT": {
              if (expr.args.length === 0 || (expr.args[0].type === "STAR")) {
                aggValue = groupRows.length;
              } else {
                // COUNT(column) - count non-null values
                const colName = this.getColumnName(expr.args[0].name);
                const colIdx = headers.indexOf(colName);
                aggValue = groupRows.filter(r => r[colIdx] !== null && r[colIdx] !== "").length;
              }
              break;
            }
            case "SUM": {
              const colName = this.getColumnName(expr.args[0].name);
              const colIdx = headers.indexOf(colName);
              aggValue = groupRows.reduce((sum, r) => sum + Number(r[colIdx] || 0), 0);
              break;
            }
            case "AVG": {
              const colName = this.getColumnName(expr.args[0].name);
              const colIdx = headers.indexOf(colName);
              const sum = groupRows.reduce((s, r) => s + Number(r[colIdx] || 0), 0);
              aggValue = groupRows.length > 0 ? sum / groupRows.length : null;
              break;
            }
            case "MIN": {
              const colName = this.getColumnName(expr.args[0].name);
              const colIdx = headers.indexOf(colName);
              const values = groupRows.map(r => Number(r[colIdx])).filter(v => !Number.isNan(v));
              aggValue = values.length > 0 ? Math.min(...values) : null;
              break;
            }
            case "MAX": {
              const colName = this.getColumnName(expr.args[0].name);
              const colIdx = headers.indexOf(colName);
              const values = groupRows.map(r => Number(r[colIdx])).filter(v => !Number.isNan(v));
              aggValue = values.length > 0 ? Math.max(...values) : null;
              break;
            }
            default:
              throw new Error(`Unsupported aggregate function: ${funcName}`);
          }

          resultRow.push(aggValue);
        } else if (expr.type === "COLUMN") {
          // Group by column - should already be in resultRow
          const colName = this.getColumnName(expr.name);
          const colIdx = headers.indexOf(colName);
          const idx = groupByIndices.indexOf(colIdx);
          if (idx !== -1) {
            // Already added, don't add again
          } else {
            resultRow.push(groupRows[0][colIdx]);
          }
        } else {
          // Other expressions - evaluate on first row of group
          const val = this.evaluateExpression(groupRows[0], headers, expr);
          resultRow.push(val);
        }
      }

      // Apply HAVING filter if present
      if (having) {
        // Evaluate HAVING - need special handling for aggregates in HAVING clause
        if (this.evaluateHaving(selectColumns, having, headers, groupRows)) {
          resultRows.push(resultRow);
        }
      } else {
        resultRows.push(resultRow);
      }
    }

    return resultRows;
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
      const leftVal = this.getExpressionValue(row, headers, expr.left);
      const rightVal = this.getExpressionValue(row, headers, expr.right);

      switch (op) {
        case "=": {
          // SQL NULL semantics: NULL = anything is always false
          // Check for actual null from parser (when comparing with NULL literal)
          if (leftVal === null || rightVal === null) {
            return false;
          }
          // Type-aware comparison: try numeric comparison first
          const leftNum = Number(leftVal);
          const rightNum = Number(rightVal);
          if (!Number.isNan(leftNum) && !Number.isNan(rightNum)) {
            return leftNum === rightNum;
          }
          return String(leftVal) === String(rightVal);
        }
        case "!=":
        case "<>": {
          // SQL NULL semantics: NULL != anything is always false
          if (leftVal === null || rightVal === null) {
            return false;
          }
          // Type-aware comparison
          const leftNum = Number(leftVal);
          const rightNum = Number(rightVal);
          if (!Number.isNan(leftNum) && !Number.isNan(rightNum)) {
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
        case "IS": {
          // IS NULL checks for null or empty string
          // Normalize both values: null/undefined/empty-string all represent NULL
          const leftIsNull
            = leftVal === null || leftVal === undefined || leftVal === "";
          const rightIsNull
            = rightVal === null || rightVal === undefined || rightVal === "";

          if (rightIsNull) {
            // Right side is NULL, check if left side is also NULL
            return leftIsNull;
          }
          return leftVal === rightVal;
        }
        case "IS NOT": {
          // IS NOT NULL checks for not null and not empty string
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
            // Right side is NULL, return if left is NOT NULL
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
      const colName = this.getColumnName(expr.name);
      const colIndex = headers.indexOf(colName);
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
          return Number(rightVal) !== 0
            ? Number(leftVal) / Number(rightVal)
            : null;
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
    const args = expr.args.map((arg: any) =>
      this.getExpressionValue(row, headers, arg),
    );

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
        return String(args[0] ?? "").substring(
          Number(args[1] || 0),
          Number(args[2]),
        );
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
        const colName = this.getColumnName(order.column);
        const colIndex = headers.indexOf(colName);
        if (colIndex === -1) {
          continue;
        }

        const aVal = a[colIndex];
        const bVal = b[colIndex];

        // Try numeric comparison first
        const aNum = Number(aVal);
        const bNum = Number(bVal);

        let cmp = 0;
        if (!Number.isNan(aNum) && !Number.isNan(bNum)) {
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
