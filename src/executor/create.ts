/**
 * CREATE TABLE executor.
 */

import { SheetsAdapter } from "../adapter/sheets.js";
import { SchemaManager } from "../schema/manager.js";
import type { CreateTableStatement } from "../types/ast.js";
import type { ExecutionContext, QueryResult } from "../types/execution.js";
import type { TableSchema } from "../types/sql.js";
import { logger } from "../utils/logger.js";

export class CreateTableExecutor {
  constructor(private context: ExecutionContext) {}

  executeSync(stmt: CreateTableStatement): QueryResult {
    const { table, columns, ifNotExists } = stmt;

    try {
      const adapter = new SheetsAdapter({
        spreadsheet: this.context.spreadsheet,
      });
      const schemaManager = new SchemaManager({
        spreadsheet: this.context.spreadsheet,
      });

      // Check if table exists
      const exists = adapter.sheetExists(table);
      if (exists) {
        if (ifNotExists) {
          logger.info(`Table ${table} already exists, skipping CREATE`);
          return {
            columns: [],
            rows: [],
            affectedRowCount: 0,
          };
        }
        throw new Error(`Table ${table} already exists`);
      }

      // Create sheet and add header row
      const columnNames = columns.map(c => c.name);
      adapter.createSheet(table, columnNames);

      // Build schema and persist
      const sheetId = adapter.getSheetId(table);
      const now = Math.floor(Date.now() / 1000);

      const schema: TableSchema = {
        name: table,
        sheetId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        columns: columns.map(col => ({
          name: col.name,
          type: (col.type.toUpperCase() as any) || "TEXT",
          nullable: col.nullable !== false,
          primaryKey: col.primaryKey,
          unique: col.unique,
          defaultValue: col.defaultValue,
        })),
      };

      schemaManager.persistSchemaSync(schema);
      this.context.schemas.set(table, schema);

      logger.info(`Created table ${table} with ${columns.length} columns`);

      return {
        columns: [],
        rows: [],
        affectedRowCount: 0,
      };
    } catch (err) {
      logger.error(`CREATE TABLE failed for ${table}`, err);
      throw err;
    }
  }
}
