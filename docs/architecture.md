# Architecture: Type-Driven SQL Engine

## Overview

Type-first, pragmatic architecture for SQL on Google Sheets.

**Principles:**

- Reuse battle-tested parsers (don't roll custom SQL parser)
- Strict SQL scope: single-table queries only (joins/subqueries deferred)
- Document transaction limits upfront (best-effort, not ACID)
- Fail fast on heavy operations (hard limits on rows/memory/time)
- Pure logic testable in isolation from Sheets API

---

## Type Hierarchy

```typescript
type SQLValue = string | number | boolean | null;
type SQLRowArray = SQLValue[];
type SQLType = "INTEGER" | "REAL" | "TEXT" | "BLOB" | "NULL";

interface ColumnDef {
  name: string;
  type: SQLType;
  nullable: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  defaultValue?: SQLValue;
}

interface TableSchema {
  name: string;
  columns: ColumnDef[];
  sheetId: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

// Discriminated union for statements
type SQLStatement =
  | { type: "SELECT"; stmt: SelectStatement }
  | { type: "INSERT"; stmt: InsertStatement }
  | { type: "UPDATE"; stmt: UpdateStatement }
  | { type: "DELETE"; stmt: DeleteStatement }
  | { type: "CREATE_TABLE"; stmt: CreateTableStatement }
  | { type: "BEGIN" }
  | { type: "COMMIT" }
  | { type: "ROLLBACK" };

interface SelectStatement {
  columns: SelectColumn[];
  from: string; // Single table only
  where?: WhereClause;
  groupBy?: string[];
  having?: Expression;
  orderBy?: { column: string; desc: boolean }[];
  limit?: number;
  offset?: number;
}

interface InsertStatement {
  table: string;
  columns?: string[];
  values: SQLValue[][];
}

interface UpdateStatement {
  table: string;
  assignments: { column: string; value: Expression }[];
  where?: WhereClause;
}

interface DeleteStatement {
  table: string;
  where?: WhereClause;
}

interface CreateTableStatement {
  table: string;
  columns: ColumnDef[];
  ifNotExists?: boolean;
}

interface WhereClause {
  expr: Expression;
}

type Expression =
  | { type: "LITERAL"; value: SQLValue }
  | { type: "COLUMN"; name: string }
  | { type: "BINARY_OP"; left: Expression; op: string; right: Expression }
  | { type: "FUNCTION"; name: string; args: Expression[] }
  | { type: "PAREN"; expr: Expression };

interface QueryResult {
  columns: string[];
  rows: SQLRowArray[];
  affectedRowCount: number;
  lastInsertRowId?: number;
}

interface ExecutionContext {
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  schemas: Map<string, TableSchema>;
  inTransaction: boolean;
  transactionSnapshot?: Map<string, SQLRowArray[]>; // Per-table snapshots only
}
```

---

## SQL Scope: v1 Supported Features

**✅ Supported:**

- SELECT (single table, no joins/subqueries)
- WHERE, ORDER BY, GROUP BY, HAVING, LIMIT, OFFSET
- INSERT (single/multiple rows)
- UPDATE with WHERE
- DELETE with WHERE
- CREATE TABLE
- BEGIN/COMMIT/ROLLBACK transactions
- Parameter binding (? or :name)

**❌ Not v1:**

- JOINs, subqueries, CTEs, window functions
- ALTER TABLE (use create-copy pattern)
- UNION, INTERSECT, EXCEPT

---

## Architecture: 5 Layers

### 1. Parser

**Decision:** Use existing library (peg.js, peggy, or SQL.js) if bundle size <50KB after tree-shake. Fallback: hand-rolled recursive descent.

```typescript
class Parser {
  parse(sql: string, params?: QueryParam[]): SQLStatement[];
  // Key: parameter binding in parse stage, not query stage
  // No string concatenation with user input
}

class Canonicalizer {
  normalize(stmt: SQLStatement, schema: TableSchema): SQLStatement;
  // Normalize operators (!=, <>), validate columns exist, infer types
}
```

### 2. Executor

```typescript
class QueryExecutor {
  constructor(context: ExecutionContext);
  execute(stmt: SQLStatement): Promise<QueryResult>;
}

// Pure logic, testable without Sheets API
class FilterLogic {
  static applyWhere(
    rows: SQLRowArray[],
    where: WhereClause,
    schema: TableSchema,
  ): SQLRowArray[];
  static applyOrderBy(
    rows: SQLRowArray[],
    orderBy: any,
    schema: TableSchema,
  ): SQLRowArray[];
  static applyGroupBy(
    rows: SQLRowArray[],
    groupBy: string[],
  ): Map<string, SQLRowArray[]>;
  static applyLimit(
    rows: SQLRowArray[],
    limit: number,
    offset?: number,
  ): SQLRowArray[];
}

// Per-operation executors
class SelectExecutor {}
class InsertExecutor {}
class UpdateExecutor {}
class DeleteExecutor {}
class CreateTableExecutor {}
```

### 3. Sheets Adapter

```typescript
class SheetsAdapter {
  getTableData(tableName: string): Promise<SQLRowArray[]>;
  setRows(
    tableName: string,
    startRow: number,
    rows: SQLRowArray[],
  ): Promise<void>;
  appendRows(tableName: string, rows: SQLRowArray[]): Promise<void>;
  deleteRows(tableName: string, rowIndices: number[]): Promise<number>;
}

// Strict, reversible type conversions (all storage is string)
class TypeConverter {
  static stringToSQL(value: string, sqlType: SQLType): SQLValue;
  static sqlToString(value: SQLValue): string;
  static inferType(value: string): SQLType; // Conservative: prefer TEXT
  static coerceValue(value: SQLValue, targetType: SQLType): SQLValue;
}
```

**Rules:**

- Batch reads/writes only (never cell-by-cell)
- Empty string = NULL (canonical)
- Type inference conservative: only INTEGER if `/^-?\d+$/`, only REAL if `/^-?\d+\.\d+$/`, else TEXT

### 4. Transactions

```typescript
class TransactionManager {
  begin(): void;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  // Snapshot per-table, per-affected-range only (not whole sheet)
}

class LockManager {
  withLock<T>(fn: () => Promise<T>, timeoutMs?: number): Promise<T>;
  // Always release in finally; log SQLITE_BUSY on timeout
}
```

**⚠️ Transactions are BEST-EFFORT:**

- No isolation across script executions
- 6-minute execution timeout; long TXs may abort mid-flight
- Rollback from memory only; if script crashes, lost
- Use for small, fast TXs (<100 rows, <1 min)

### 5. Server

```typescript
class RequestHandler {
  async handle(body: string): Promise<string>;
  // Parse request → validate → execute → format response
}

function doPost(
  e: GoogleAppsScript.Events.DoPost,
): GoogleAppsScript.Content.TextOutput {
  // Entry point for HTTP POST
  // Use LockManager for concurrency control
}
```

---

## Schema Management

**Store in hidden `__gsheetql_schema` sheet, not ScriptProperties:**

```
| table_name | schema_json | version | updated_at |
| users      | {...}       | 1       | 1700000000 |
```

```typescript
class SchemaManager {
  loadSchemas(): Promise<Map<string, TableSchema>>;
  persistSchema(schema: TableSchema): Promise<void>;
  private ensureMetadataSheet(): GoogleAppsScript.Spreadsheet.Sheet;
}
```

Rationale: ScriptProperties ~9KB limit; metadata sheet unlimited + human-readable.

---

## Performance Constraints

```typescript
const LIMITS = {
  MAX_ROWS_PER_QUERY: 10000, // Fail if scan > 10K rows
  MAX_QUERY_TIME_MS: 30000, // Timeout after 30s
  MAX_MEMORY_BYTES: 50_000_000, // 50MB results
  MAX_RESPONSE_SIZE_BYTES: 10_000_000, // 10MB response
} as const;
```

**Enforcement:**

- Count rows while scanning; fail-fast if exceeds limit
- Track query start time; abort if > timeout
- Estimate result memory; return error if > limit
- Check response size before send

---

## Error Handling

```typescript
class SQLSheetsError extends Error {
  constructor(
    message: string,
    public code: string,
    public debugId?: string,
  ) {}
}

// Specific error classes
class ParseError extends SQLSheetsError {}
class ExecutionError extends SQLSheetsError {}
class SheetsAPIError extends SQLSheetsError {}
class ConstraintViolationError extends SQLSheetsError {}
class LockError extends SQLSheetsError {} // SQLITE_BUSY
class QueryLimitExceededError extends SQLSheetsError {}
```

**Response format (libsql-compatible):**

```json
{
  "error": {
    "code": "SQLITE_ERROR",
    "message": "User-friendly error",
    "debug_id": "req-xyz"
  }
}
```

Rules:

- Use libsql codes: SQLITE_ERROR, SQLITE_CONSTRAINT, SQLITE_BUSY, SHEETS_API_ERROR
- Include `debug_id` for tracing (random UUID per request)
- Never leak spreadsheet ID, sheet names, or API keys in errors
- Log full errors server-side

---

## HTTP API

**POST /v1/execute**

Request:

```json
{
  "statements": [{ "sql": "SELECT * FROM users WHERE age > ?", "args": [18] }]
}
```

Response:

```json
{
  "results": [
    {
      "columns": ["id", "name"],
      "rows": [
        [1, "Alice"],
        [2, "Bob"]
      ],
      "affected_row_count": 0,
      "last_insert_rowid": null
    }
  ],
  "metadata": {
    "schema_version": 1,
    "warnings": ["Query truncated to 10000 rows"]
  }
}
```

Features:

- Multiple statements per request
- Parameter binding (no concatenation)
- Metadata section (schema version, warnings)
- Dry-run mode: `"dry_run": true` (simulate without writes)
- Rate limiting: 60 req/min default, return 429 if exceeded

---

## Module Organization

```
src/
├── types/
│   ├── sql.ts          # SQLValue, SQLType, TableSchema
│   ├── ast.ts          # Statement, Expression types
│   ├── execution.ts    # QueryResult, ExecutionContext
│   └── index.ts
├── parser/
│   ├── parser.ts       # Parser class (or external lib wrapper)
│   ├── canonicalizer.ts
│   └── index.ts
├── executor/
│   ├── executor.ts     # Main orchestrator
│   ├── select.ts       # SelectExecutor
│   ├── insert.ts, update.ts, delete.ts, create.ts
│   ├── filter-logic.ts # Pure functions
│   └── index.ts
├── adapter/
│   ├── sheets.ts       # SheetsAdapter
│   ├── type-converter.ts
│   └── index.ts
├── transactions/
│   ├── manager.ts      # TransactionManager
│   ├── lock.ts         # LockManager
│   └── index.ts
├── server/
│   ├── handler.ts      # RequestHandler
│   ├── response.ts     # Response formatting
│   └── index.ts        # doPost entry point
└── index.ts            # Main exports
```

---

## Implementation Sequence (Critical Path)

1. **Parser decision** (Day 1): Reuse or hand-roll? Unblocks everything else.
2. **Schema migration** (Day 1-2): ScriptProperties → metadata sheet
3. **Type definitions** (Day 2-3): All core types from this doc
4. **TypeConverter + hard limits** (Day 3): Before any executor
5. **FilterLogic tests** (Day 3-4): Test pure functions first
6. **SelectExecutor** (Day 4-5): Build on FilterLogic
7. **Insert/Update/Delete** (Day 5-6): Reuse FilterLogic where possible
8. **Transactions + locks** (Day 6-7): Build in tests for contention + rollback
9. **Server + API** (Day 7-8): Wrap executors, format responses
10. **Polish + deployment** (Day 8+): Profiling, docs, clasp setup

---

## Key Decisions

| Decision                          | Rationale                                    |
| --------------------------------- | -------------------------------------------- |
| Reuse parser                      | Avoid complexity, use battle-tested lib      |
| Single-table queries only         | Joins expensive on sheets; defer             |
| Hidden metadata sheet for schema  | ScriptProperties size limits; human-readable |
| Pure FilterLogic functions        | Fully testable; infinitely faster unit tests |
| Batch Sheets API calls            | Minimize quota usage; dramatically faster    |
| Parameter binding in parser       | Prevent SQL injection by design              |
| Best-effort transactions          | GAS execution limits make ACID impossible    |
| Hard limits enforced early        | Prevent runaway queries, OOM, quota overages |
| TypeConverter strict + reversible | All data as string; explicit coercion rules  |

---

## Future (Post-v1)

- ALTER TABLE (create-copy pattern)
- Simple JOINs (with warnings + limits)
- Streaming API for large results
- Query optimization + execution plans
- Row-level access control

---

## Security & Deployment

**Deployment models:**

1. "Anyone" (public, no auth) — demo/test only
2. "Specific user/domain" — production recommended
3. Custom auth layer (OAuth, API key) — future

**Privacy rules:**

- ❌ Never expose spreadsheet ID, sheet IDs, internal names
- ✅ Log errors with debug_id for audit trail
- ✅ Require auth for sensitive deployments

---

## Testing Strategy

- **Unit:** Parser, FilterLogic, TypeConverter (pure functions, fast)
- **Integration:** Real test sheet via clasp, mock Sheets API where possible
- **E2E:** HTTP client against deployed web app
- **Concurrency:** Lock contention simulation, concurrent request handling
- **Failure modes:** Transaction rollback, lock timeout, query limit exceeded
