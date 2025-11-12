/**
 * Google Sheets API adapter.
 * Batch operations only (never cell-by-cell).
 */

import type { SQLRowArray } from "../types/sql.js";
import { logger } from "../utils/logger.js";

export type SheetsAdapterConfig = {
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
};

export class SheetsAdapter {
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

  constructor(config: SheetsAdapterConfig) {
    this.spreadsheet = config.spreadsheet;
  }

  /**
   * Get sheet by name. Throws if not found.
   */
  private getSheet(tableName: string): GoogleAppsScript.Spreadsheet.Sheet {
    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      throw new Error(`Sheet not found: ${tableName}`);
    }
    return sheet;
  }

  /**
   * Read all data from a sheet as 2D array (synchronous).
   * First row (header) is included.
   */
  readRangeSync(tableName: string): SQLRowArray[] {
    try {
      const sheet = this.getSheet(tableName);
      const range = sheet.getDataRange();
      const values = range.getValues();

      logger.debug(`Read ${values.length} rows from ${tableName}`);
      return values as SQLRowArray[];
    }
    catch (err) {
      logger.error(`Failed to read from ${tableName}`, err);
      throw err;
    }
  }

  /**
   * Write rows to a sheet, replacing from startRow (synchronous).
   * startRow is 1-indexed.
   */
  writeRangeSync(
    tableName: string,
    startRow: number,
    values: SQLRowArray[],
  ): void {
    if (values.length === 0) {
      return;
    }

    try {
      const sheet = this.getSheet(tableName);
      const numRows = values.length;
      const numCols = values[0]?.length || 1;

      const range = sheet.getRange(startRow, 1, numRows, numCols);
      range.setValues(values as (string | number | boolean)[][]);

      logger.debug(
        `Wrote ${numRows} rows to ${tableName} starting at row ${startRow}`,
      );
    }
    catch (err) {
      logger.error(`Failed to write to ${tableName}`, err);
      throw err;
    }
  }

  /**
   * Append rows to end of sheet (synchronous).
   */
  appendRowsSync(tableName: string, rows: SQLRowArray[]): void {
    if (rows.length === 0) {
      return;
    }

    try {
      const sheet = this.getSheet(tableName);
      for (const row of rows) {
        sheet.appendRow(row);
      }

      logger.debug(`Appended ${rows.length} rows to ${tableName}`);
    }
    catch (err) {
      logger.error(`Failed to append to ${tableName}`, err);
      throw err;
    }
  }

  /**
   * Delete rows by indices (1-indexed).
   * Deletes in reverse order to maintain index stability.
   */
  async deleteRows(tableName: string, rowIndices: number[]): Promise<number> {
    if (rowIndices.length === 0) {
      return 0;
    }

    try {
      const sheet = this.getSheet(tableName);
      const sorted = [...rowIndices].sort((a, b) => b - a);

      for (const rowIndex of sorted) {
        sheet.deleteRow(rowIndex);
      }

      logger.debug(`Deleted ${sorted.length} rows from ${tableName}`);
      return sorted.length;
    }
    catch (err) {
      logger.error(`Failed to delete from ${tableName}`, err);
      throw err;
    }
  }

  /**
   * Create a new sheet with header row.
   */
  async createSheet(
    tableName: string,
    columns: string[],
  ): Promise<GoogleAppsScript.Spreadsheet.Sheet> {
    try {
      const sheet = this.spreadsheet.insertSheet(tableName);
      sheet.appendRow(columns);

      logger.debug(`Created sheet ${tableName} with ${columns.length} columns`);
      return sheet;
    }
    catch (err) {
      logger.error(`Failed to create sheet ${tableName}`, err);
      throw err;
    }
  }

  /**
   * Check if sheet exists.
   */
  sheetExists(tableName: string): boolean {
    return this.spreadsheet.getSheetByName(tableName) !== null;
  }

  /**
   * Get sheet ID (useful for schema storage).
   */
  getSheetId(tableName: string): number {
    const sheet = this.getSheet(tableName);
    return sheet.getSheetId();
  }
}
