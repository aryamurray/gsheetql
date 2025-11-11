# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

gsheetql is a SQLite-compatible SQL interface for Google Sheets that enables modern TypeScript ORMs (like Kysely and Drizzle) to interact with spreadsheets as if they were databases. The project implements the libSQL/Hrana HTTP protocol to provide standards-compliant database operations.

## Development Commands

### Installation
```bash
bun install
```

### Running the Development Server
```bash
bun run src/index.ts
```

### Google Apps Script Deployment
```bash
# Login to Google
clasp login

# Create new project
clasp create --type api --title "gsheetql"

# Push code
clasp push

# Deploy
clasp deploy
```

### Testing
```bash
bun test
```

Note: The package.json specifies `"module": "index.ts"` but the actual entry point is `src/index.ts`.

## Architecture

### High-Level Design

The system is based on the existing **gsSQL** implementation, which is a complete SQL query engine for Google Sheets. We're modernizing it to TypeScript and adding libSQL/Hrana protocol compatibility for ORM support:

```
ORM (Kysely/Drizzle) → libSQL HTTP Protocol → gsheetql Server → SQL Parser → Query Executor → Google Sheets API
```

### Existing gsSQL Architecture (Reference Implementation)

The gsSQL codebase (provided in `C:\Users\Arya\Downloads\gsSQL-main`) contains a fully functional SQL engine with the following components:

#### 1. **SimpleParser.js** (~1355 lines) - Custom SQL Parser
- **Complete lexer and parser** built from scratch (no dependencies!)
- Parses SELECT statements into Abstract Syntax Tree (AST)
- **Supported SQL Features:**
  - SELECT with WHERE, JOIN (INNER, LEFT, RIGHT, FULL), ORDER BY, GROUP BY, HAVING, LIMIT
  - UNION, UNION ALL, INTERSECT, EXCEPT
  - Sub-queries (derived tables) in FROM and JOIN clauses
  - PIVOT operations
  - Bind variables (?1, ?2, etc.)
  - Aggregate functions (SUM, MIN, MAX, COUNT, AVG, DISTINCT, GROUP_CONCAT)
  - Correlated subqueries
  - Calculated fields and expressions
- **Key Classes:**
  - `SqlParse` - Main parser, converts SQL → AST
  - `CondLexer` - Lexical analyzer for tokenization
  - `CondParser` - Parses WHERE conditions
  - `SelectKeywordAnalysis` - Analyzes each SELECT component

#### 2. **Sql.js** (~1254 lines) - Query Execution Engine
- **Main Classes:**
  - `gsSQL()` - Entry point (Google Sheets custom function)
  - `Sql` - Main execution engine
  - `BindData` - Parameter binding for prepared statements
  - `TableAlias` - Manages table aliases
  - `TableExtract` - Extracts referenced tables from AST
  - `Pivot` - Handles PIVOT operations
  - `SqlSets` - Implements UNION/INTERSECT/EXCEPT logic
- **Execution Flow:**
  1. Parse SQL → AST
  2. Load table data from sheets
  3. Handle sub-queries (FROM and JOIN)
  4. Execute SELECT with WHERE filtering
  5. Apply JOINs
  6. GROUP BY and aggregations
  7. ORDER BY sorting
  8. LIMIT result set
  9. Return double array results

#### 3. **Table.js** (~550 lines) - Table & Schema Management
- **`Table` class:**
  - Loads data from Google Sheets (named ranges, A1 notation, sheet names)
  - Handles column titles or auto-generates (A, B, C...)
  - Creates indexes for efficient JOIN operations
  - `getRecords()` - Retrieve range of records
  - `createKeyFieldRecordMap()` - Index records by field values
- **`Schema` class:**
  - Manages column metadata (names, positions)
  - Handles table aliases
  - Field name variations (tablename.field, alias.field, field)
  - Virtual fields for derived tables

#### 4. **TableData.js** (~424 lines) - Data Loading & Caching
- **Sophisticated 3-tier caching strategy:**
  - **0 seconds**: No cache, read directly from sheets
  - **≤ 21600s (6 hours)**: Google Apps Script CacheService
  - **> 21600s**: ScriptProperties (persistent long-term storage)
- **Features:**
  - Locking mechanism for concurrent access (prevents race conditions)
  - Chunks large data into 100KB blocks for cache storage
  - Automatic cache expiration
  - Handles Google Sheets API rate limits
- **Loading Sources:**
  - Sheet names (loads entire sheet)
  - Named ranges
  - A1 notation (e.g., 'Sheet1!A1:C100')

#### 5. **JoinTables.js** (~689 lines) - JOIN Implementation
- **`JoinTables` class:**
  - Implements INNER, LEFT, RIGHT, FULL JOINs
  - Creates derived tables from JOIN operations
  - Handles complex JOIN conditions with AND/OR logic
- **`JoinTablesRecordIds` class:**
  - Finds matching record IDs between tables
  - Supports calculated fields in JOIN conditions
  - Optimized for equality joins (uses indexing)
  - Falls back to full scan for non-equality operators
- **JOIN Strategy:**
  1. Index the join fields
  2. For each left table record, find matching right table records
  3. Create derived table with combined columns
  4. Update virtual field list with new column positions

#### 6. **Views.js** (large file, not fully analyzed)
- Handles derived tables and views
- Field calculations and SQL functions
- WHERE condition evaluation
- GROUP BY and ORDER BY logic
- Aggregate function calculations

#### 7. **ScriptSettings.js** (~239 lines) - Long-term Cache
- Uses Google Apps Script Properties for persistent storage
- Handles cache expiration (days)
- Bulk get/set operations

#### 8. **Select2Object.js** (~249 lines) - Utility
- Converts SELECT results (double arrays) to JavaScript objects
- Column names become object properties
- Useful for programmatic access

### New Architecture (Modern TypeScript Implementation)

We'll modernize gsSQL with the following components:

#### 1. HTTP Server (libSQL/Hrana Protocol) - NEW
- Wraps the existing SQL engine with HTTP interface
- Implements Hrana v3 HTTP protocol for SQLite compatibility
- Accepts SQL queries over HTTP POST requests
- Returns results in libSQL-compatible JSON format
- **Package**: `libsql-stateless` (1.15kB) or `@libsql/hrana-client`
- Located in: `src/server/`

#### 2. SQL Parser - MODERNIZE EXISTING
- **Keep the custom parser** from SimpleParser.js
- Port to TypeScript with proper types
- Add support for INSERT, UPDATE, DELETE parsing
- **No external dependencies needed** - parser is already complete!
- Located in: `src/parser/`

#### 3. Query Executor - EXTEND EXISTING
- Port Sql.js execution engine to TypeScript
- **Add missing operations:**
  - INSERT - append rows to sheets
  - UPDATE - modify existing rows
  - DELETE - remove rows (mark as deleted or shift rows)
  - CREATE TABLE - create new sheet tabs
  - DROP TABLE - delete sheet tabs
- Add transaction support (batch operations with rollback)
- Located in: `src/executor/`

#### 4. Google Sheets Adapter - MODERNIZE EXISTING
- Port TableData.js caching logic to TypeScript
- Replace Google Apps Script APIs with googleapis (Node.js)
- Keep the sophisticated 3-tier caching strategy
- Add rate limiting and retry logic
- Handle authentication (OAuth2, Service Account)
- Located in: `src/adapters/sheets.ts`

#### 5. Schema Manager - MODERNIZE EXISTING
- Port Table.js and Schema class to TypeScript
- Keep existing field mapping and indexing logic
- Add metadata sheet for storing:
  - Column types and constraints
  - Primary keys
  - Indexes
  - Foreign key relationships (logical only)
- Located in: `src/schema/`

#### 6. JOIN Engine - PORT EXISTING
- Port JoinTables.js to TypeScript
- Keep existing JOIN algorithms (already optimized)
- Add proper TypeScript types
- Located in: `src/executor/joins.ts`

#### 7. ORM Driver Interface - NEW
- Implement SQLite-compatible driver for Kysely
- Implement Drizzle driver adapter
- Use libSQL client interface
- Located in: `src/drivers/`

### Data Model Mapping

| SQL Concept | Google Sheets Equivalent |
|-------------|-------------------------|
| Database | Spreadsheet |
| Table | Sheet (tab) |
| Column | First row (header) |
| Row | Spreadsheet row |
| Primary Key | First column (by convention) |
| Index | Metadata in `__metadata__` sheet |
| Schema | `__schema__` sheet with type info |

### Runtime & Build System
- **Runtime**: Bun (v1.2.23+) for local development
- **Deployment**: Google Apps Script (via clasp)
- **Language**: TypeScript with strict mode enabled
- **Module System**: ESNext with "Preserve" mode for bundler compatibility

### TypeScript Configuration
The project uses strict TypeScript settings:
- Strict mode enabled
- No unchecked indexed access
- No fallthrough cases in switch statements
- Bundler module resolution
- No emit (Bun handles execution directly)

## Project Structure

```
gsheetql/
├── src/
│   ├── index.ts              # Main entry point, HTTP server
│   ├── server/
│   │   ├── hrana.ts          # Hrana HTTP protocol handler
│   │   └── router.ts         # Request routing
│   ├── parser/
│   │   ├── index.ts          # SQL parser wrapper
│   │   └── validator.ts      # Query validation
│   ├── executor/
│   │   ├── index.ts          # Main query executor
│   │   ├── select.ts         # SELECT query handler
│   │   ├── insert.ts         # INSERT query handler
│   │   ├── update.ts         # UPDATE query handler
│   │   ├── delete.ts         # DELETE query handler
│   │   └── ddl.ts            # CREATE/ALTER/DROP handlers
│   ├── adapters/
│   │   ├── sheets.ts         # Google Sheets API wrapper
│   │   └── cache.ts          # Caching layer
│   ├── schema/
│   │   ├── manager.ts        # Schema management
│   │   └── types.ts          # Type definitions
│   ├── drivers/
│   │   ├── kysely.ts         # Kysely dialect
│   │   └── drizzle.ts        # Drizzle adapter
│   └── types/
│       └── index.ts          # Shared type definitions
├── tests/                    # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## Key Dependencies

### Production
- **libsql-stateless** or **@libsql/hrana-client**: libSQL HTTP protocol implementation
- **googleapis**: Google Sheets API v4 client (replaces Apps Script APIs)
- **zod**: Runtime type validation (already installed)
- **NO SQL parser dependency needed** - we have a complete custom parser!

### Development
- **@google/clasp**: Optional - for Apps Script deployment
- **@types/bun**: Bun TypeScript types
- **typescript**: TypeScript compiler
- **@types/node**: Node.js types

## Migration Strategy from gsSQL JavaScript to TypeScript

### Phase 1: Port Core Parser & Executor (Priority: HIGH)
1. **Port SimpleParser.js → src/parser/** (Week 1-2)
   - Convert `SqlParse` class to TypeScript
   - Add AST type definitions (SelectAST, WhereAST, JoinAST, etc.)
   - Convert `CondLexer` and `CondParser` to TypeScript
   - Convert `SelectKeywordAnalysis` to TypeScript
   - Add types for all AST nodes
   - **Keep all existing logic** - the parser is battle-tested!
   - Add support for INSERT, UPDATE, DELETE AST generation

2. **Port Sql.js → src/executor/** (Week 2-3)
   - Convert `Sql` class to TypeScript executor
   - Add proper types for execution context
   - Keep existing SELECT execution logic
   - Port `BindData`, `TableAlias`, `TableExtract` classes
   - Convert `SqlSets` (UNION/INTERSECT/EXCEPT) logic
   - Port `Pivot` implementation

3. **Port Table.js & Schema → src/schema/** (Week 3)
   - Convert `Table` class with typed table data
   - Convert `Schema` class with typed column metadata
   - Add TypeScript interfaces for field definitions
   - Keep existing indexing and field mapping logic

4. **Port TableData.js → src/adapters/sheets.ts** (Week 3-4)
   - Replace Google Apps Script APIs with googleapis
   - Port 3-tier caching strategy to Node.js
   - Use node-cache or redis for short-term cache
   - Use filesystem or database for long-term cache
   - Keep the locking mechanism (use node-locks or redis locks)
   - Keep chunk storage strategy for large data

### Phase 2: Add Missing Write Operations (Priority: HIGH)
5. **Implement INSERT** (Week 4)
   - Add INSERT AST types to parser
   - Parse INSERT INTO syntax with VALUES
   - Implement executor logic:
     - Validate columns exist
     - Append rows using `sheets.spreadsheets.values.append`
     - Handle auto-generated columns (timestamps, IDs)
   - Add support for bulk inserts

6. **Implement UPDATE** (Week 4-5)
   - Add UPDATE AST types to parser
   - Parse UPDATE ... SET ... WHERE syntax
   - Implement executor logic:
     - Use WHERE logic to find affected rows
     - Update cells using `sheets.spreadsheets.values.update`
     - Support calculated SET values
   - Add batch update support

7. **Implement DELETE** (Week 5)
   - Add DELETE AST types to parser
   - Parse DELETE FROM ... WHERE syntax
   - Implement executor logic:
     - Use WHERE logic to find affected rows
     - **Strategy A**: Mark rows as deleted (soft delete)
     - **Strategy B**: Use `batchUpdate` to delete rows (shifts remaining rows)
   - Document limitations of each strategy

8. **Implement DDL (CREATE/DROP TABLE)** (Week 5)
   - Add DDL AST types to parser
   - CREATE TABLE → Create new sheet tab with column headers
   - DROP TABLE → Delete sheet tab
   - ALTER TABLE → Modify column headers (limited support)

### Phase 3: HTTP Server & libSQL Protocol (Priority: MEDIUM)
9. **Build HTTP Server** (Week 6)
   - Implement Hrana v3 HTTP protocol using `libsql-stateless`
   - Create request/response handlers
   - Map libSQL requests to SQL executor
   - Handle bind parameters
   - Return results in libSQL format

10. **Add Transaction Support** (Week 6-7)
    - Implement basic transaction tracking
    - Batch multiple operations
    - **Limited rollback** - Google Sheets API doesn't support true transactions
    - Use shadow sheet for staging changes before commit
    - Document transaction limitations

### Phase 4: ORM Compatibility (Priority: MEDIUM)
11. **Port JoinTables.js → src/executor/joins.ts** (Week 7)
    - Convert `JoinTables` class to TypeScript
    - Convert `JoinTablesRecordIds` class
    - Keep existing JOIN algorithms (already optimized)
    - Add proper TypeScript types for join operations

12. **Implement Kysely Dialect** (Week 8)
    - Create custom Kysely dialect for gsheetql
    - Implement SQLite-compatible driver interface
    - Test with common Kysely queries
    - Handle type conversions

13. **Implement Drizzle Adapter** (Week 8)
    - Create Drizzle driver for gsheetql
    - Map Drizzle queries to libSQL protocol
    - Test with common Drizzle queries

### Phase 5: Testing & Documentation (Priority: HIGH)
14. **Unit Tests** (Ongoing)
    - Test parser with various SQL queries
    - Test executor logic for each operation
    - Test caching mechanisms
    - Mock Google Sheets API for tests

15. **Integration Tests** (Week 9)
    - Test against real Google Sheets
    - Test ORM compatibility (Kysely, Drizzle)
    - Performance testing with large datasets
    - Test concurrent access scenarios

16. **Documentation** (Week 9-10)
    - API documentation
    - Migration guide from gsSQL
    - ORM setup guides
    - Performance tuning guide
    - Limitations and workarounds

## TypeScript Modernization Guidelines

### Coding Standards

1. **Use Modern TypeScript Features**
   - Classes with proper access modifiers (private, protected, public)
   - Async/await instead of callbacks
   - Optional chaining (`?.`) and nullish coalescing (`??`)
   - Template literals for strings
   - Destructuring for objects and arrays
   - Spread operator for immutability

2. **Type Safety**
   - Define interfaces for all AST nodes
   - Use discriminated unions for AST variants
   - Avoid `any` - use `unknown` when type is truly unknown
   - Use generics for reusable components
   - Define strict types for Google Sheets API responses

3. **Error Handling**
   - Create custom error classes (e.g., `SqlParseError`, `ExecutionError`)
   - Use Result types for operations that can fail
   - Proper error messages with context

4. **Code Organization**
   - One class per file
   - Barrel exports (index.ts) for each directory
   - Group related functionality in directories
   - Keep files under 500 lines when possible

5. **Documentation**
   - TSDoc comments for all public APIs
   - Inline comments for complex logic
   - README in each major directory

### Example: Converting gsSQL to Modern TypeScript

**Before (gsSQL JavaScript):**
```javascript
class SqlParse {
    static sql2ast(sqlStatement) {
        const query = SqlParse.filterCommentsFromStatement(sqlStatement)
        const myKeyWords = SqlParse.generateUsedKeywordList(query);
        // ... more code
        return result;
    }
}
```

**After (Modern TypeScript):**
```typescript
interface SelectAST {
  SELECT: SelectField[];
  FROM?: FromClause;
  WHERE?: WhereClause;
  JOIN?: JoinClause[];
  'ORDER BY'?: OrderByClause[];
  'GROUP BY'?: GroupByClause[];
  LIMIT?: LimitClause;
}

interface SelectField {
  name: string;
  as?: string;
  order?: 'ASC' | 'DESC';
}

class SqlParser {
  /**
   * Parses SQL SELECT statement into Abstract Syntax Tree
   * @param sqlStatement - SQL string to parse
   * @returns Typed AST representing the query
   * @throws SqlParseError if syntax is invalid
   */
  static parseSelectStatement(sqlStatement: string): SelectAST {
    const query = this.filterComments(sqlStatement);
    const keywords = this.extractKeywords(query);
    // ... more code with proper types
    return result;
  }

  private static filterComments(statement: string): string {
    return statement
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join(' ');
  }

  private static extractKeywords(query: string): string[] {
    // Implementation with proper typing
  }
}
```

## Technical Considerations

### SQL to Sheets Translation Strategy

**SELECT queries** (Already Implemented in gsSQL):
- Parse WHERE clause → Evaluate in-memory on fetched data
- Parse ORDER BY → Sort results in-memory
- Parse LIMIT → Slice result array
- Parse JOIN → Create derived table with indexed lookups
- Parse GROUP BY + Aggregates → Group records and calculate
- Complex queries → Fetch all referenced table data, process in-memory
- **Performance**: Indexing optimizes joins, but large tables fetch entire sheet

**INSERT queries** (To Be Implemented):
- Extract values → Use `spreadsheets.values.append`
- Validate columns exist in schema
- Support bulk inserts (batch append operations)
- Handle default values and auto-increment

**UPDATE queries** (To Be Implemented):
- Use existing WHERE evaluation logic to find affected rows
- Extract SET values → Use `spreadsheets.values.update` or `batchUpdate`
- Support calculated SET values
- Batch multiple updates into single API call

**DELETE queries** (To Be Implemented):
- Use existing WHERE evaluation logic to find affected rows
- **Strategy A (Soft Delete)**: Add `__deleted__` column, mark as deleted
  - Pros: Fast, reversible, maintains row numbers
  - Cons: Increases sheet size, requires filtering in SELECT
- **Strategy B (Hard Delete)**: Use `batchUpdate` to delete rows
  - Pros: Actually removes data, cleaner
  - Cons: Shifts row numbers, slower, not reversible

### Performance Considerations (From gsSQL Experience)

1. **3-Tier Caching Strategy** (Already Implemented)
   - Level 1: No cache (always fresh, 0 seconds)
   - Level 2: Short-term cache (6 hours max, fast access)
   - Level 3: Long-term cache (days/weeks, persistent storage)
   - Large datasets chunked into 100KB blocks
   - Concurrent access handled with locking

2. **JOIN Optimization** (Already Implemented)
   - Indexed joins for equality conditions (`=`)
   - Hash maps for O(1) lookups on join keys
   - Falls back to full scan for non-equality operators
   - Supports calculated fields in join conditions

3. **Batch Operations**
   - Group multiple API calls into single batch request
   - Google Sheets API allows up to 100 requests per batch
   - Reduces network overhead and API quota usage

4. **Lazy Loading**
   - Only fetch sheets that are referenced in query
   - Cache loaded sheets for subsequent queries
   - Invalidate cache based on configurable TTL

5. **Rate Limiting**
   - Google Sheets API: 100 requests per 100 seconds per user
   - Implement exponential backoff with jitter
   - Queue requests when approaching limits

6. **Memory Management**
   - Stream large result sets instead of loading entirely
   - Consider pagination for very large tables
   - Release memory after query completion

### Known Limitations (From gsSQL + Google Sheets API)

1. **JOINs are In-Memory Only**
   - No native SQL JOIN support from Google Sheets
   - Must fetch both tables entirely and join in application
   - Large table joins (>10k rows each) may be slow
   - **Mitigation**: Caching, indexing, query optimization

2. **No True Transactions**
   - Google Sheets API doesn't support atomic transactions
   - Best-effort batching with no rollback guarantee
   - Partial failures possible in batch operations
   - **Mitigation**: Use shadow sheets for staging, validate before commit

3. **Type System Limitations**
   - Google Sheets stores everything as string, number, or boolean
   - No native DATE, TIMESTAMP, BLOB types
   - Type coercion required during read/write
   - **Mitigation**: Metadata sheet to track intended types

4. **Concurrent Write Conflicts**
   - Google Sheets API has eventual consistency
   - Multiple clients may conflict on same rows
   - No optimistic locking mechanism
   - **Mitigation**: Document limitations, add version column for detection

5. **Performance with Large Datasets**
   - Fetching 10k+ rows can be slow (seconds)
   - Google Sheets not designed as database
   - API quotas limit throughput
   - **Mitigation**: Aggressive caching, partition large tables across sheets

6. **Limited SQL Feature Support**
   - No window functions
   - No recursive CTEs
   - No triggers or stored procedures
   - Limited ALTER TABLE support
   - **Mitigation**: Document supported SQL subset clearly

## Development Workflow

1. **Local Development**: Use Bun to run and test locally with mock Sheets API
2. **Testing**: Write unit tests for parser, executor, and adapters
3. **Integration Tests**: Test against real Google Sheets (test spreadsheet)
4. **Deployment**: Use clasp to deploy to Google Apps Script
5. **Versioning**: Tag releases when ORM compatibility is verified

## Debugging Tips

- Use `console.log` for Apps Script debugging (shows in execution logs)
- Test SQL queries directly against parser before executor
- Use Google Sheets API Explorer to verify API calls
- Check Apps Script execution logs for errors
- Monitor API quota usage in Google Cloud Console
