/**
 * Core SQL type definitions and schema types.
 */

/** SQL values stored and transmitted as strings */
export type SQLValue = string | number | boolean | null;

/** Array of SQL values (one row) */
export type SQLRowArray = SQLValue[];

/** SQL type identifiers (SQLite-compatible) */
export type SQLType = "INTEGER" | "REAL" | "TEXT" | "BLOB" | "NULL";

/** Column definition with metadata */
export type ColumnDef = {
  name: string;
  type: SQLType;
  nullable: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  defaultValue?: SQLValue;
};

/** Complete table schema */
export type TableSchema = {
  name: string;
  columns: ColumnDef[];
  sheetId: number;
  version: number;
  createdAt: number;
  updatedAt: number;
};

/** Query parameter for prepared statements */
export type QueryParam = {
  position?: number; // For positional parameters (?)
  name?: string; // For named parameters (:name, @name, $name)
  value: SQLValue;
};
