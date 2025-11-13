- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.


## Project Overview

This project implements a SQL interface for Google Apps Script, enabling SQL queries to be executed against Google Sheets data. Each sheet is treated as a database table, supporting core SQLite operations (SELECT, INSERT, UPDATE, DELETE, transactions, etc.) through an HTTP API compatible with libsql conventions.

**Scope:**
- Core SQLite functionality only (no extensions or stored procedures)
- Concurrent request handling via LockService
- Text-based data model (all data as strings, converted as needed)
- HTTP interface via GAS doPost() method

**Tech Stack:**
- TypeScript (modern, strict mode)
- esbuild (bundler for Apps Script runtime)
- Google Apps Script runtime with clasp for deployment
- HTTP interface compatible with libsql server protocol

## Implementation Tracking

Feature implementation progress is tracked in **IMPLEMENT.md**. When completing features:

1. **Before starting work:** Review IMPLEMENT.md for which features are marked complete
2. **After completing a feature:** Update IMPLEMENT.md by changing `[ ]` to `[x]` for completed items
3. **In commit messages:** Reference which features were implemented (e.g., "add GROUP BY support")
4. **Priorities:** Features are organized by priority (High/Medium/Low) - focus on High Priority first

**Example workflow:**
```
# Feature: Add GROUP BY support
1. Implement in code
2. Add tests
3. Update IMPLEMENT.md: change "[ ] GROUP BY clause" to "[x] GROUP BY clause"
4. Commit with message: "implement GROUP BY and aggregate functions"
```

## Architecture

### High-Level Design

```
HTTP POST → doPost(e) → LockService.acquire() → SQL Parser → Query Executor
                                                       ↓
                                                Sheets Adapter
                                                       ↓
                                              Google Sheets API
                                                       ↓
                                                JSON Response
```

### Key Components

1. **HTTP Handler** (`src/server/`)
   - `doPost(e)` - Main entry point for HTTP requests
   - Request parsing and validation
   - Response formatting (JSON, libsql-compatible)
   - Concurrent request handling via LockService

2. **SQL Parser** (`src/parser/`)
   - Parses SQL statements into AST
   - Validates syntax and semantics
   - Supports core SQLite dialect only

3. **Query Executor** (`src/executor/`)
   - Executes parsed SQL statements
   - Handles query logic and data manipulation
   - Coordinates with Sheets Adapter

4. **Sheets Adapter** (`src/adapter/`)
   - Translates operations to Google Sheets API calls
   - Manages sheet-table mappings
   - All data handled as text (strings)

5. **Transaction Manager** (`src/transactions/`)
   - Implements basic transaction support
   - Uses LockService for isolation
   - Snapshot-based rollback

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Prefer functional patterns over OOP where appropriate
- Use descriptive variable names (full words, not abbreviations)
- Keep functions small and focused (single responsibility)
- Add JSDoc comments for public APIs

**Example:**
```typescript
/**
 * Executes a SQL query against a Google Sheet table.
 * @param query - The SQL query string
 * @param params - Query parameters for prepared statements
 * @returns Query results in libsql-compatible format
 */
export async function executeQuery(
  query: string,
  params?: QueryParams
): Promise<QueryResult> {
  // Implementation
}
```

### File Organization

```
src/
├── server/
│   ├── index.ts         # doPost() entry point
│   ├── handlers.ts      # Request handlers
│   └── response.ts      # Response formatting
├── parser/
│   ├── lexer.ts         # Tokenization
│   ├── parser.ts        # SQL parsing
│   └── ast.ts           # AST type definitions
├── executor/
│   ├── select.ts        # SELECT execution
│   ├── insert.ts        # INSERT execution
│   ├── update.ts        # UPDATE execution
│   ├── delete.ts        # DELETE execution
│   └── index.ts         # Main executor
├── adapter/
│   ├── sheets.ts        # Google Sheets API wrapper
│   ├── mapping.ts       # Table-sheet mapping
│   └── conversion.ts    # String conversion utilities
├── transactions/
│   ├── manager.ts       # Transaction coordination
│   ├── lock.ts          # LockService wrapper
│   └── snapshot.ts      # Snapshot for rollback
├── utils/
│   └── validation.ts    # Input validation
└── index.ts             # Main entry point (exports doPost)
```

### TypeScript Conventions

1. **Use Google Apps Script types wherever available:**
```typescript
import GoogleAppsScript = GoogleAppsScript;

function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  return SpreadsheetApp.getActiveSpreadsheet();
}
```

2. **Define clear interfaces for data structures:**
```typescript
interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  sheetId: number;
}

interface ColumnDefinition {
  name: string;
  type: SQLiteType;
  nullable: boolean;
  defaultValue?: string; // Always string since all data is text
}

type SQLiteType = 'INTEGER' | 'REAL' | 'TEXT' | 'BLOB' | 'NULL';
```

3. **Use discriminated unions for AST nodes:**
```typescript
type SQLStatement =
  | { type: 'SELECT'; select: SelectStatement }
  | { type: 'INSERT'; insert: InsertStatement }
  | { type: 'UPDATE'; update: UpdateStatement }
  | { type: 'DELETE'; delete: DeleteStatement }
  | { type: 'CREATE_TABLE'; createTable: CreateTableStatement };
```

### doPost() Entry Point

The main HTTP handler uses GAS's `doPost()` method:

```typescript
/**
 * Main entry point for HTTP POST requests.
 * This is called automatically by Google Apps Script.
 */
function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  try {
    // Parse request body
    const request = JSON.parse(e.postData.contents);
    
    // Acquire lock for concurrent request handling
    const lock = LockService.getScriptLock();
    const acquired = lock.tryLock(30000); // 30 second timeout
    
    if (!acquired) {
      return createErrorResponse('SQLITE_BUSY', 'Database is locked');
    }
    
    try {
      // Execute SQL statements
      const result = executeStatements(request.statements);
      return createSuccessResponse(result);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return createErrorResponse('SQLITE_ERROR', error.message);
  }
}

/**
 * Format success response as JSON.
 */
function createSuccessResponse(data: unknown): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Format error response as JSON.
 */
function createErrorResponse(code: string, message: string): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify({
    error: { code, message }
  }))
  .setMimeType(ContentService.MimeType.JSON);
}
```

### Concurrency Handling with LockService

Google Apps Script provides `LockService` for handling concurrent requests:

```typescript
/**
 * Lock manager for coordinating concurrent access.
 */
class LockManager {
  private lock: GoogleAppsScript.Lock.Lock;
  
  constructor() {
    // Use ScriptLock for cross-user concurrency
    this.lock = LockService.getScriptLock();
  }
  
  /**
   * Acquire lock with timeout.
   * @param timeoutMs - Maximum time to wait for lock
   * @returns true if lock acquired, false otherwise
   */
  acquire(timeoutMs: number = 30000): boolean {
    return this.lock.tryLock(timeoutMs);
  }
  
  /**
   * Release the lock.
   */
  release(): void {
    this.lock.releaseLock();
  }
  
  /**
   * Execute function with lock held.
   */
  withLock<T>(fn: () => T, timeoutMs: number = 30000): T {
    const acquired = this.acquire(timeoutMs);
    if (!acquired) {
      throw new Error('Failed to acquire lock');
    }
    
    try {
      return fn();
    } finally {
      this.release();
    }
  }
}
```

**Lock Types in GAS:**
- `getScriptLock()` - Prevents concurrent access from any user
- `getUserLock()` - Prevents concurrent access from same user only
- `getDocumentLock()` - Document-level lock (for this use case, use ScriptLock)

**Best Practices:**
- Always use `tryLock()` with timeout instead of `waitLock()`
- Always release locks in a `finally` block
- Keep lock duration as short as possible
- For read-only operations, consider skipping locks if consistency isn't critical

### esbuild Configuration

The project uses esbuild to bundle TypeScript for the Apps Script runtime. Key considerations:

- Target: ES2020 (Apps Script V8 runtime)
- Bundle format: IIFE or ESM (depending on Apps Script configuration)
- Minification: Optional (recommended for production)
- Source maps: Development only

**Sample esbuild config:**
```typescript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  platform: 'neutral', // Apps Script is neither node nor browser
  target: 'es2020',
  format: 'iife',
  globalName: 'SQLSheets',
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV === 'development',
});
```

## HTTP API Specification

### Compatibility with libsql

The HTTP interface should be compatible with libsql server conventions for ease of client adoption.

#### Execute Query Endpoint

**POST** `/v1/execute`

**Request:**
```json
{
  "statements": [
    {
      "sql": "SELECT * FROM users WHERE age > ?",
      "args": [18]
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "columns": ["id", "name", "age"],
      "rows": [
        [1, "Alice", 25],
        [2, "Bob", 30]
      ],
      "affected_row_count": 0,
      "last_insert_rowid": null
    }
  ]
}
```

#### Transaction Endpoint

**POST** `/v1/transaction`

**Request:**
```json
{
  "statements": [
    {
      "sql": "BEGIN TRANSACTION"
    },
    {
      "sql": "INSERT INTO users (name, age) VALUES (?, ?)",
      "args": ["Charlie", 28]
    },
    {
      "sql": "COMMIT"
    }
  ]
}
```

### Error Responses

**Format:**
```json
{
  "error": {
    "message": "Syntax error near 'SELEC'",
    "code": "SQLITE_ERROR",
    "details": {
      "line": 1,
      "column": 1
    }
  }
}
```

**Error Codes:**
- `SQLITE_ERROR` - General SQL error
- `SQLITE_CONSTRAINT` - Constraint violation
- `SQLITE_BUSY` - Resource locked
- `SHEETS_API_ERROR` - Google Sheets API error

## Data Type Mapping

### Core Principle: Everything is Text

All data in Google Sheets is stored and transmitted as **text (strings)**. Type conversions happen at the application layer when needed for SQL operations.

### SQL Types to Storage

| SQLite Type | Storage Format | Conversion Notes |
|-------------|----------------|------------------|
| INTEGER | String | `"123"`, `"-456"` - Parse with `parseInt()` |
| REAL | String | `"3.14"`, `"-2.5e3"` - Parse with `parseFloat()` |
| TEXT | String | Direct storage, no conversion |
| BLOB | Base64 String | Encode/decode as needed |
| NULL | Empty string `""` | Empty cells represent NULL |
| BOOLEAN | String | `"true"` or `"false"` (case-insensitive) |

### HTTP JSON to Storage

All JSON values are stringified when storing:

```typescript
// Example conversions
const jsonValue = 42;
const storedValue = String(jsonValue); // "42"

const jsonArray = [1, 2, 3];
const storedArray = JSON.stringify(jsonArray); // "[1,2,3]"
```

### Storage to HTTP JSON

Convert strings back to appropriate JSON types based on SQL type:

```typescript
function convertToJSON(value: string, sqlType: SQLiteType): unknown {
  // NULL semantics: empty strings, null, undefined all represent SQL NULL
  // Return JSON null for NULL values
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  switch (sqlType) {
    case 'INTEGER':
      const intVal = parseInt(value, 10);
      return !isNaN(intVal) ? intVal : value;
    case 'REAL':
      const floatVal = parseFloat(value);
      return !isNaN(floatVal) ? floatVal : value;
    case 'TEXT':
      return value;
    case 'BLOB':
      return value; // Already base64 string
    case 'NULL':
      return null;
    default:
      return value;
  }
}
```

**Key Point:** While Google Sheets stores NULL as empty strings internally, the HTTP API returns `null` (JSON null) for NULL values. This provides:
- Type-safe JavaScript clients (use `=== null` to check for NULL)
- Standard REST API behavior (matches other SQL databases)
- Proper JSON semantics for clients

### Type Inference

When SQL type is not explicitly specified (e.g., in SELECT * queries), infer type from value:

```typescript
function inferType(value: string): SQLiteType {
  if (value === '') return 'NULL';
  if (/^-?\d+$/.test(value)) return 'INTEGER';
  if (/^-?\d+\.\d+$/.test(value)) return 'REAL';
  if (value === 'true' || value === 'false') return 'INTEGER'; // SQLite stores booleans as integers
  return 'TEXT';
}
```

### Schema Storage

First row of each sheet contains column headers:

```
| id | name | age | email |
|----|------|-----|-------|
| 1  | Alice| 25  | a@example.com |
| 2  | Bob  | 30  | b@example.com |
```

Type information can be stored in:
1. **Script Properties** (recommended for simplicity)
2. **Hidden metadata sheet** (if more complex schema needed later)

```typescript
// Store schema in Script Properties
const props = PropertiesService.getScriptProperties();
props.setProperty('schema:users', JSON.stringify({
  id: 'INTEGER',
  name: 'TEXT',
  age: 'INTEGER',
  email: 'TEXT'
}));
```

## Core Features Implementation

### 1. SELECT Queries

**Supported:**
- Column selection (including `*`)
- WHERE clauses with comparison operators
- ORDER BY (ASC/DESC)
- LIMIT and OFFSET
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- GROUP BY and HAVING
- JOINs (INNER, LEFT, RIGHT, FULL)
- Subqueries

**Implementation Strategy:**
```typescript
// 1. Parse SQL → AST
// 2. Identify target sheet(s)
// 3. Fetch data range from Sheets API
// 4. Apply WHERE filter in memory (convert to JS predicates)
// 5. Apply ORDER BY/GROUP BY in memory
// 6. Apply LIMIT/OFFSET
// 7. Format results
```

**Optimization:**
- Use `getDataRange().getValues()` for bulk reads
- Cache schema information
- Push-down predicates where possible (e.g., range queries)

### 2. INSERT Queries

**Supported:**
- Single row inserts
- Multiple row inserts
- Column-specific inserts
- DEFAULT values

**Implementation:**
```typescript
// 1. Parse INSERT statement
// 2. Validate against schema
// 3. Apply defaults for missing columns
// 4. Append rows to sheet using appendRow() or setValues()
// 5. Return last_insert_rowid (row number)
```

**Considerations:**
- Auto-increment behavior (row number as ID)
- Handle unique constraints
- Batch inserts for performance

### 3. UPDATE Queries

**Supported:**
- Conditional updates (WHERE clause)
- Multiple column updates
- Update entire table

**Implementation:**
```typescript
// 1. Parse UPDATE statement
// 2. Fetch matching rows (using WHERE logic)
// 3. Modify values in memory
// 4. Write back using setValues() for range
// 5. Return affected_row_count
```

**Performance:**
- Batch updates using range operations
- Minimize API calls

### 4. DELETE Queries

**Supported:**
- Conditional deletes (WHERE clause)
- Delete all rows (TRUNCATE-like)

**Implementation:**
```typescript
// 1. Parse DELETE statement
// 2. Identify rows to delete (WHERE clause)
// 3. Delete rows using deleteRow() or deleteRows()
// 4. Return affected_row_count
```

**Considerations:**
- Row deletion shifts subsequent rows (handle carefully)
- Consider soft-delete for transactions

### 5. Transactions

**Supported:**
- BEGIN TRANSACTION
- COMMIT
- ROLLBACK

**Implementation Strategy:**
```typescript
// 1. Store original state (snapshot of affected ranges)
// 2. Apply operations to sheet
// 3. On COMMIT: clear snapshot
// 4. On ROLLBACK: restore from snapshot
```

**Limitations:**
- Apps Script lacks true ACID transactions
- Best-effort isolation using locking service
- Recovery from crashes is limited

### 6. CREATE TABLE

**Supported:**
- Create new sheet with schema
- Column definitions
- Constraints (PRIMARY KEY, NOT NULL, UNIQUE)

**Implementation:**
```typescript
// 1. Parse CREATE TABLE statement
// 2. Create new sheet in spreadsheet
// 3. Write header row with column names
// 4. Store schema metadata (possibly in hidden sheet)
```

### 7. Prepared Statements

**Supported:**
- Positional parameters (`?`)
- Named parameters (`:name`, `@name`, `$name`)

**Implementation:**
```typescript
// 1. Parse SQL with parameter placeholders
// 2. Store parsed AST with parameter positions
// 3. Bind parameters at execution time
// 4. Prevent SQL injection by design
```

## Performance Optimization

### Batch Operations

The primary optimization strategy is to minimize Google Sheets API calls through batching:

**Reading Data:**
```typescript
// ✅ GOOD: Read entire range at once
const values = sheet.getDataRange().getValues();

// ❌ BAD: Read cell by cell
for (let i = 1; i <= sheet.getLastRow(); i++) {
  const value = sheet.getRange(i, 1).getValue();
}
```

**Writing Data:**
```typescript
// ✅ GOOD: Write multiple rows at once
const data = [
  ['Alice', 25],
  ['Bob', 30],
  ['Charlie', 28]
];
sheet.getRange(2, 1, data.length, data[0].length).setValues(data);

// ❌ BAD: Write row by row
for (const row of data) {
  sheet.appendRow(row);
}
```

**Updating Data:**
```typescript
// ✅ GOOD: Update range
const updates = [[newValue1], [newValue2], [newValue3]];
sheet.getRange(startRow, col, updates.length, 1).setValues(updates);

// ❌ BAD: Update cells individually
sheet.getRange(row1, col).setValue(newValue1);
sheet.getRange(row2, col).setValue(newValue2);
```

### Query Execution Strategy

**For SELECT queries:**
1. Read entire sheet data once with `getDataRange().getValues()`
2. Filter in memory (JavaScript)
3. Sort in memory
4. Apply LIMIT/OFFSET
5. Return results

**For INSERT queries:**
1. Prepare all rows to insert
2. Use single `setValues()` call for multiple rows
3. Return result

**For UPDATE queries:**
1. Read affected range once
2. Modify in memory
3. Write back with single `setValues()` call

**For DELETE queries:**
1. Identify rows to delete (read once)
2. Delete in reverse order (to maintain row indices)
3. Consider batching deletes if API supports it

### Transaction Optimization

During transactions:
- Take snapshot of affected ranges only (not entire sheet)
- Keep snapshot in memory
- On ROLLBACK, restore with single `setValues()` call

### Connection Reuse

```typescript
// Reuse spreadsheet connection
let cachedSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet | null = null;

function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  if (!cachedSpreadsheet) {
    cachedSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }
  return cachedSpreadsheet;
}
```

## Testing Strategy

### Local Development with clasp

Use [clasp](https://github.com/google/clasp) for local development and testing:

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google account
clasp login

# Create new project (or clone existing)
clasp create --type standalone --title "SQL Sheets"

# Push code to Apps Script
clasp push

# Pull code from Apps Script
clasp pull

# Open project in browser
clasp open
```

### Development Workflow

1. Write TypeScript locally
2. Build with esbuild
3. Push with clasp
4. Test in Apps Script environment
5. View logs with `clasp logs`

### Unit Tests

Test core logic without Apps Script dependencies:

```typescript
// Test SQL parser
describe('SQL Parser', () => {
  it('should parse SELECT statement', () => {
    const sql = 'SELECT id, name FROM users WHERE age > 18';
    const ast = parse(sql);
    expect(ast.type).toBe('SELECT');
    expect(ast.select.columns).toHaveLength(2);
  });
  
  it('should parse INSERT statement', () => {
    const sql = "INSERT INTO users (name, age) VALUES ('Alice', 25)";
    const ast = parse(sql);
    expect(ast.type).toBe('INSERT');
  });
});

// Test query executor logic (with mock data)
describe('Query Executor', () => {
  it('should filter rows with WHERE clause', () => {
    const data = [
      ['id', 'name', 'age'],
      ['1', 'Alice', '25'],
      ['2', 'Bob', '17'],
      ['3', 'Charlie', '30']
    ];
    
    const result = executeWhere(data, { 
      column: 'age', 
      operator: '>', 
      value: '18' 
    });
    
    expect(result).toHaveLength(2); // Alice and Charlie
  });
});
```

### Integration Tests

Test against real Google Sheets using clasp:

```typescript
// integration-test.ts
function testSelect() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('test_users');
  
  // Setup test data
  sheet.clear();
  sheet.appendRow(['id', 'name', 'age']);
  sheet.appendRow(['1', 'Alice', '25']);
  sheet.appendRow(['2', 'Bob', '30']);
  
  // Test query
  const result = executeQuery('SELECT * FROM test_users WHERE age > 20');
  
  Logger.log('Test result: ' + JSON.stringify(result));
  console.assert(result.rows.length === 2, 'Should return 2 rows');
}

// Run from Apps Script editor or with clasp
function runAllTests() {
  testSelect();
  // Add more tests...
}
```

### Testing HTTP Endpoint

Use curl or Postman to test the deployed web app:

```bash
# Deploy as web app via Apps Script UI
# Copy the web app URL

# Test POST request
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      {
        "sql": "SELECT * FROM users",
        "args": []
      }
    ]
  }' \
  https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### Logging and Debugging

```typescript
// Use Logger for persistent logs
Logger.log('Executing query: ' + sql);

// Use console.log for execution logs (visible in clasp logs)
console.log('[DEBUG] Query result:', result);

// View logs with clasp
// $ clasp logs
```

### Test Data Setup

Create a separate test spreadsheet:

```typescript
function setupTestData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create test tables
  const users = ss.insertSheet('users');
  users.appendRow(['id', 'name', 'email', 'age']);
  users.appendRow(['1', 'Alice', 'alice@example.com', '25']);
  users.appendRow(['2', 'Bob', 'bob@example.com', '30']);
  
  const orders = ss.insertSheet('orders');
  orders.appendRow(['id', 'user_id', 'amount', 'status']);
  orders.appendRow(['1', '1', '99.99', 'completed']);
  orders.appendRow(['2', '1', '49.99', 'pending']);
  orders.appendRow(['3', '2', '199.99', 'completed']);
}
```

## Error Handling

### Error Hierarchy

```typescript
class SQLSheetsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
  }
}

class ParseError extends SQLSheetsError {}
class ExecutionError extends SQLSheetsError {}
class SheetsAPIError extends SQLSheetsError {}
class TransactionError extends SQLSheetsError {}
```

### Error Recovery

- Graceful degradation for unsupported features
- Clear error messages with suggestions
- Rollback on critical errors in transactions

## Security Considerations

### SQL Injection Prevention

- Use prepared statements exclusively for user input
- Validate and sanitize all inputs
- Never concatenate user input into SQL strings

### Access Control

- Leverage Google Sheets native permissions
- No additional auth layer needed (Apps Script handles this)
- Consider row-level security for sensitive data

### Rate Limiting

- Implement request throttling to prevent abuse
- Use Apps Script quotas awareness
- Return 429 Too Many Requests when limits exceeded

## Common Patterns & Examples

### Creating a Table

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  age INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Complex Query

```sql
SELECT 
  u.name,
  COUNT(o.id) as order_count,
  SUM(o.amount) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.age >= 18
GROUP BY u.id, u.name
HAVING total_spent > 100
ORDER BY total_spent DESC
LIMIT 10;
```

### Transaction Example

```sql
BEGIN TRANSACTION;

INSERT INTO accounts (id, balance) VALUES (1, 1000);
INSERT INTO accounts (id, balance) VALUES (2, 500);

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
```

## Debugging & Troubleshooting

### Logging

Use `console.log()` in Apps Script, which outputs to Execution Log:

```typescript
function debugQuery(sql: string) {
  console.log('[DEBUG] Executing SQL:', sql);
  console.log('[DEBUG] Timestamp:', new Date().toISOString());
}
```

### Common Issues

1. **"Sheet not found" errors:**
   - Verify sheet name matches table name
   - Check for case sensitivity

2. **"Invalid range" errors:**
   - Ensure sheet is not empty
   - Check for proper header row

3. **Performance degradation:**
   - Check query complexity
   - Review number of API calls
   - Consider breaking into smaller queries

## Deployment

### clasp Deployment Workflow

**Initial Setup:**
```bash
# Install dependencies
npm install -g @google/clasp
npm install

# Login to Google
clasp login

# Initialize project
clasp create --type standalone --title "SQL for Google Sheets"

# This creates:
# - .clasp.json (project configuration)
# - appsscript.json (Apps Script manifest)
```

**Build and Deploy:**
```bash
# Build TypeScript with esbuild
npm run build

# Push to Apps Script
clasp push

# Deploy as web app
clasp deploy --description "Production v1.0"

# List deployments
clasp deployments

# Open in browser
clasp open
```

**Configuration Files:**

`.clasp.json`:
```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "./dist"
}
```

`appsscript.json`:
```json
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "ANYONE_ANONYMOUS",
    "executeAs": "USER_DEPLOYING"
  }
}
```

### Web App Configuration

After pushing code, configure the web app in Apps Script UI:

1. Click "Deploy" → "New deployment"
2. Select type: "Web app"
3. Description: "SQL HTTP API v1"
4. Execute as: "Me"
5. Who has access: "Anyone" (or restrict as needed)
6. Click "Deploy"
7. Copy the web app URL

**Important:** The web app URL will be in format:
```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

### Environment Configuration

Use Script Properties for environment-specific config:

```typescript
// Set properties via code (run once)
function setupConfig() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    'MAX_QUERY_TIMEOUT': '30000',
    'MAX_ROWS_PER_QUERY': '10000',
    'ENABLE_TRANSACTIONS': 'true'
  });
}

// Read properties in code
const config = {
  maxQueryTimeout: parseInt(
    PropertiesService.getScriptProperties().getProperty('MAX_QUERY_TIMEOUT') || '30000'
  ),
  maxRowsPerQuery: parseInt(
    PropertiesService.getScriptProperties().getProperty('MAX_ROWS_PER_QUERY') || '10000'
  ),
  enableTransactions: 
    PropertiesService.getScriptProperties().getProperty('ENABLE_TRANSACTIONS') === 'true',
};
```

Or set properties via clasp:

```bash
# Script Properties can also be managed in the Apps Script UI:
# Project Settings → Script Properties
```

### Continuous Deployment

**GitHub Actions Example:**
```yaml
name: Deploy to Apps Script
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Setup clasp
        run: |
          npm install -g @google/clasp
          echo "$CLASP_CREDENTIALS" > ~/.clasprc.json
        env:
          CLASP_CREDENTIALS: ${{ secrets.CLASP_CREDENTIALS }}
      
      - name: Deploy
        run: |
          clasp push
          clasp deploy --description "Auto-deploy from GitHub"
```

### Monitoring and Logs

**View logs:**
```bash
# Stream logs in real-time
clasp logs

# View logs in browser
clasp open --logs
```

**Stackdriver Logging:**
```typescript
// Logs automatically go to Stackdriver (Google Cloud Logging)
console.log('Info message');
console.error('Error message');
console.warn('Warning message');
```

### Version Management

**Create versioned deployments:**
```bash
# Deploy new version
clasp deploy --description "v1.1.0 - Added transaction support"

# List all deployments
clasp deployments

# Undeploy old versions
clasp undeploy <deploymentId>
```

### Rollback Strategy

If a deployment has issues:

1. Keep previous working version deployed
2. Deploy new version as separate deployment
3. Test new deployment URL
4. If issues, switch back to previous deployment
5. Undeploy broken version

```bash
# Deploy without undeploying previous
clasp deploy --description "v1.2.0"

# If broken, undeploy and revert
clasp undeploy <broken_deployment_id>
```

## Future Enhancements

- [ ] Query optimization and execution plan analysis
- [ ] Aggregate function support beyond COUNT, SUM, AVG, MIN, MAX
- [ ] Window functions (ROW_NUMBER, RANK, etc.)
- [ ] Common Table Expressions (CTEs / WITH clause)
- [ ] Bulk import/export (CSV, JSON)
- [ ] Query result streaming for large datasets
- [ ] Multi-spreadsheet queries (federated queries)
- [ ] ALTER TABLE support for schema changes
- [ ] Index hints for query optimization
- [ ] Query cost estimation

## Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [SQLite SQL Syntax](https://www.sqlite.org/lang.html)
- [libsql HTTP Protocol](https://github.com/libsql/libsql)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [esbuild Documentation](https://esbuild.github.io/)

## Contributing Guidelines

When working on this project, Claude should:

1. **Prioritize correctness over cleverness:** Clear, maintainable code is better than overly clever solutions
2. **Write tests first for new features:** TDD approach ensures robustness
3. **Document complex algorithms:** Add comments explaining the "why", not just the "what"
4. **Consider Apps Script limitations:** Be aware of execution time limits and API quotas
5. **Maintain libsql compatibility:** Any API changes should maintain backward compatibility
6. **Optimize for common cases:** Most queries will be simple SELECTs and INSERTs

## Key Principles

- **Simplicity First:** Core SQLite functionality only - no extensions or stored procedures
- **Text-Based Model:** All data is text; type conversions at application layer only
- **Concurrency via LockService:** Use GAS's LockService for safe concurrent access
- **Batch Operations:** Minimize Sheets API calls through batching
- **libsql Compatibility:** Maintain HTTP protocol compatibility for client adoption
- **Type Safety:** Leverage TypeScript fully; use GAS types where available
- **clasp-First Development:** Use clasp for local development and deployment