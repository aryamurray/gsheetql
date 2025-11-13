/**
 * INSERT statement executor.
 */

import { SheetsAdapter } from "../adapter/sheets.js";
import type { InsertStatement } from "../types/ast.js";
import type { ExecutionContext, QueryResult } from "../types/execution.js";
import { logger } from "../utils/logger.js";

export class InsertExecutor {
  constructor(private context: ExecutionContext) {}

  executeSync(stmt: InsertStatement): QueryResult {
    const { table, columns, values } = stmt;

    try {
      const adapter = new SheetsAdapter({
        spreadsheet: this.context.spreadsheet,
      });

      // Check table exists
      if (!adapter.sheetExists(table)) {
        throw new Error(`Table ${table} does not exist`);
      }

      // Read schema for the table
      const schema = this.context.schemas.get(table);
      if (!schema) {
        throw new Error(`Schema for table ${table} not found`);
      }

      // Get current data to find last row
      const currentData = adapter.readRangeSync(table);
      const headerRow = currentData[0] || [];

      // Build rows to insert
      const rowsToInsert: any[][] = [];

      for (const valueRow of values) {
        const insertedRow: any[] = [];

        if (columns) {
          // Map specified columns to values
          const row = Array.from({ length: headerRow.length }).fill("");

          for (let i = 0; i < columns.length; i++) {
            const colName = columns[i];
            const colIndex = headerRow.indexOf(colName);

            if (colIndex === -1) {
              throw new Error(`Column ${colName} not found in table ${table}`);
            }

            // Extract value from literal expressions or use raw value
            let val: any = valueRow[i];
            if (
              val !== null
              && typeof val === "object"
              && "type" in val
              && (val as any).type === "LITERAL"
            ) {
              val = (val as any).value;
            }
            row[colIndex]
              = val === null || val === undefined ? "" : String(val);
          }

          insertedRow.push(...row);
        } else {
          // All columns in order
          if (valueRow.length !== headerRow.length) {
            throw new Error(
              `Expected ${headerRow.length} values, got ${valueRow.length}`,
            );
          }

          // Convert null values to empty strings for sheets storage
          insertedRow.push(
            ...valueRow.map((v: any) => {
              // Extract value from literal expressions or use raw value
              if (
                v !== null
                && typeof v === "object"
                && "type" in v
                && v.type === "LITERAL"
              ) {
                v = v.value;
              }
              return v === null || v === undefined ? "" : String(v);
            }),
          );
        }

        rowsToInsert.push(insertedRow);
      }

      // Save snapshot if in transaction
      if (this.context.inTransaction && this.context.transactionSnapshot) {
        if (!this.context.transactionSnapshot.has(table)) {
          this.context.transactionSnapshot.set(table, currentData);
        }
      }

      // Append rows to sheet
      adapter.appendRowsSync(table, rowsToInsert);

      // Return result
      const lastInsertRowId = currentData.length + rowsToInsert.length;

      logger.info(`Inserted ${rowsToInsert.length} rows into ${table}`);

      return {
        columns: [],
        rows: [],
        affectedRowCount: rowsToInsert.length,
        lastInsertRowId,
      };
    } catch (err) {
      logger.error(`INSERT failed for ${table}`, err);
      throw err;
    }
  }
}
