/**
 * Schema management using hidden metadata sheet.
 * Stores table schemas in __gsheetql_schema sheet for persistence.
 */

import { SheetsAdapter } from "../adapter/sheets.js";
import type { TableSchema } from "../types/sql.js";
import { logger } from "../utils/logger.js";

const METADATA_SHEET_NAME = "__gsheetql_schema";

export type SchemaManagerConfig = {
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
};

export class SchemaManager {
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  private adapter: SheetsAdapter;
  private schemaCache: Map<string, TableSchema> = new Map();

  constructor(config: SchemaManagerConfig) {
    this.spreadsheet = config.spreadsheet;
    this.adapter = new SheetsAdapter({ spreadsheet: this.spreadsheet });
  }

  /**
   * Ensure metadata sheet exists. Create if missing.
   */
  private ensureMetadataSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    let sheet = this.spreadsheet.getSheetByName(METADATA_SHEET_NAME);

    if (!sheet) {
      logger.info(`Creating metadata sheet ${METADATA_SHEET_NAME}`);
      sheet = this.spreadsheet.insertSheet(METADATA_SHEET_NAME);
      sheet.appendRow([
        "table_name",
        "schema_json",
        "version",
        "created_at",
        "updated_at",
      ]);
      // Hide the metadata sheet
      sheet.hideSheet();
    }

    return sheet;
  }

  /**
   * Load all schemas into cache from metadata sheet (synchronous).
   */
  loadSchemasSync(): Map<string, TableSchema> {
    try {
      this.ensureMetadataSheet();
      const rows = this.adapter.readRangeSync(METADATA_SHEET_NAME);

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const [tableName, schemaJson] = rows[i];
        if (tableName && schemaJson) {
          const schema = JSON.parse(String(schemaJson)) as TableSchema;
          this.schemaCache.set(String(tableName), schema);
        }
      }

      logger.debug(
        `Loaded ${this.schemaCache.size} schemas from metadata sheet`,
      );
      return new Map(this.schemaCache);
    } catch (err) {
      logger.error("Failed to load schemas", err);
      throw err;
    }
  }

  /**
   * Persist a schema to metadata sheet (synchronous).
   */
  persistSchemaSync(schema: TableSchema): void {
    try {
      this.ensureMetadataSheet();
      const rows = this.adapter.readRangeSync(METADATA_SHEET_NAME);

      // Find existing row or append new
      let foundRow = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === schema.name) {
          foundRow = i + 1; // Convert to 1-indexed
          break;
        }
      }

      const now = Math.floor(Date.now() / 1000);
      const schemaJson = JSON.stringify(schema);
      const updateRow = [
        schema.name,
        schemaJson,
        schema.version,
        schema.createdAt,
        now,
      ];

      if (foundRow > 0) {
        this.adapter.writeRangeSync(METADATA_SHEET_NAME, foundRow, [
          updateRow as any,
        ]);
        logger.debug(`Updated schema for table ${schema.name}`);
      } else {
        this.adapter.appendRowsSync(METADATA_SHEET_NAME, [updateRow as any]);
        logger.debug(`Persisted new schema for table ${schema.name}`);
      }

      // Update cache
      this.schemaCache.set(schema.name, schema);
    } catch (err) {
      logger.error(`Failed to persist schema for ${schema.name}`, err);
      throw err;
    }
  }

  /**
   * Get schema for a table.
   */
  getSchema(tableName: string): TableSchema | undefined {
    return this.schemaCache.get(tableName);
  }

  /**
   * Delete schema for a table (synchronous).
   */
  deleteSchemaSync(tableName: string): void {
    try {
      this.ensureMetadataSheet();
      const rows = this.adapter.readRangeSync(METADATA_SHEET_NAME);

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === tableName) {
          const sheet = this.spreadsheet.getSheetByName(METADATA_SHEET_NAME);
          if (sheet) {
            sheet.deleteRow(i + 1);
          }
          this.schemaCache.delete(tableName);
          logger.debug(`Deleted schema for table ${tableName}`);
          return;
        }
      }
    } catch (err) {
      logger.error(`Failed to delete schema for ${tableName}`, err);
      throw err;
    }
  }
}
