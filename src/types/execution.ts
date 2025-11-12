/**
 * Execution context and query result types.
 */

import type { SQLRowArray, TableSchema } from "./sql.js";

/** Runtime context for query execution */
export type ExecutionContext = {
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  schemas: Map<string, TableSchema>;
  inTransaction: boolean;
  transactionSnapshot?: Map<string, SQLRowArray[]>;
};

/** Query execution result */
export type QueryResult = {
  columns: string[];
  rows: SQLRowArray[];
  affectedRowCount: number;
  lastInsertRowId?: number;
};

/** Batch query results (multiple statements) */
export type BatchQueryResult = {
  results: QueryResult[];
  metadata: {
    schemaVersion: number;
    warnings?: string[];
  };
};
