/**
 * Abstract syntax tree types for SQL statements.
 * Uses discriminated unions for type-safe pattern matching.
 */

import type { SQLValue } from "./sql.js";

/** Base expression node */
export type Expression =
  | { type: "LITERAL"; value: SQLValue }
  | { type: "COLUMN"; name: string }
  | { type: "BINARY_OP"; left: Expression; op: string; right: Expression }
  | { type: "FUNCTION"; name: string; args: Expression[] }
  | { type: "PAREN"; expr: Expression };

/** WHERE clause */
export type WhereClause = {
  expr: Expression;
};

/** SELECT column specification */
export type SelectColumn = {
  expr: Expression | { type: "STAR" };
  alias?: string;
};

/** SELECT statement */
export type SelectStatement = {
  columns: SelectColumn[];
  from: string;
  where?: WhereClause;
  groupBy?: string[];
  having?: Expression;
  orderBy?: Array<{ column: string; desc: boolean }>;
  limit?: number;
  offset?: number;
};

/** INSERT statement */
export type InsertStatement = {
  table: string;
  columns?: string[];
  values: SQLValue[][];
};

/** UPDATE statement */
export type UpdateStatement = {
  table: string;
  assignments: Array<{ column: string; value: Expression }>;
  where?: WhereClause;
};

/** DELETE statement */
export type DeleteStatement = {
  table: string;
  where?: WhereClause;
};

/** CREATE TABLE statement */
export type CreateTableStatement = {
  table: string;
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    primaryKey?: boolean;
    unique?: boolean;
    defaultValue?: SQLValue;
  }>;
  ifNotExists?: boolean;
};

/** Transaction control statements */
export type TransactionStatement = {
  type: "BEGIN" | "COMMIT" | "ROLLBACK";
};

/** Discriminated union of all SQL statement types */
export type SQLStatement =
  | { type: "SELECT"; stmt: SelectStatement }
  | { type: "INSERT"; stmt: InsertStatement }
  | { type: "UPDATE"; stmt: UpdateStatement }
  | { type: "DELETE"; stmt: DeleteStatement }
  | { type: "CREATE_TABLE"; stmt: CreateTableStatement }
  | { type: "BEGIN" | "COMMIT" | "ROLLBACK" };
