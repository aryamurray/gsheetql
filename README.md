# gsheetql

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-4285f4?style=flat-square&logo=google)](https://developers.google.com/apps-script)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-vitest-6e9f18?style=flat-square&logo=vitest)](https://vitest.dev)

A SQL interface for Google Sheets powered by Google Apps Script. Write standard SQL queries against your spreadsheets using an HTTP API compatible with [libsql](https://libsql.org/) server conventions.

---

## Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Architecture](#-architecture)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Overview

**gsheetql** bridges Google Sheets and SQL. Instead of manual data manipulation, write SQL queries directly against your spreadsheets. Each sheet becomes a database table, supporting core SQLite operations (SELECT, INSERT, UPDATE, DELETE, transactions) through a simple HTTP API.

**Why gsheetql?**
- 📊 No database infrastructure needed—use Sheets as your data store
- 🔗 Standard SQL syntax—queries work with any SQL client
- 🌐 HTTP API—easy integration with any application
- 🔒 Built-in concurrency control via LockService
- 📱 Google Apps Script—runs serverless on Google's infrastructure

---

## ✨ Features

### Core SQL Operations
- ✅ **SELECT** queries with WHERE, ORDER BY, LIMIT, OFFSET
- ✅ **INSERT** single and multiple rows
- ✅ **UPDATE** with WHERE conditions
- ✅ **DELETE** with conditional filtering
- ✅ **Transactions** (BEGIN, COMMIT, ROLLBACK)
- ✅ **CREATE TABLE** with schema definition

### Advanced Query Support
- ✅ Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- ✅ GROUP BY and HAVING clauses
- ✅ JOINs (INNER, LEFT, RIGHT, FULL)
- ✅ Subqueries
- ✅ Prepared statements (parameterized queries)

### Infrastructure
- ✅ libsql-compatible HTTP API
- ✅ Concurrent request handling with LockService
- ✅ Comprehensive error handling
- ✅ Text-based data model (type conversions handled automatically)
- ✅ Type-safe implementation in TypeScript

---

## 🎯 Quick Start

### Deploy & Test (2 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/gsheetql.git
cd gsheetql

# 2. Install dependencies
npm install

# 3. Login to Google Apps Script
npm run login

# 4. Deploy to Apps Script
npm run deploy

# 5. Note the web app URL and test it:
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      {
        "sql": "SELECT * FROM your_sheet_name",
        "args": []
      }
    ]
  }' \
  https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

---

## 📦 Installation

### Prerequisites
- Node.js 18+ or Bun
- Google account with Google Apps Script enabled
- A Google Sheet to query

### Setup

1. **Clone & install:**
   ```bash
   git clone https://github.com/yourusername/gsheetql.git
   cd gsheetql
   npm install
   ```

2. **Authenticate with Google:**
   ```bash
   npm run login
   ```
   This opens a browser to authorize clasp with your Google account.

3. **Configure (optional):**
   Create `.clasp.json` for existing projects or let clasp generate it.

4. **Build & deploy:**
   ```bash
   npm run build      # Compile TypeScript
   npm run push       # Push to Apps Script
   npm run deploy     # Create web app deployment
   ```

---

## 🔌 Usage

### Basic SELECT

```json
POST /v1/execute
Content-Type: application/json

{
  "statements": [
    {
      "sql": "SELECT id, name, email FROM users WHERE age > ?",
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
      "columns": ["id", "name", "email"],
      "rows": [
        [1, "Alice", "alice@example.com"],
        [2, "Bob", "bob@example.com"]
      ],
      "affected_row_count": 0,
      "last_insert_rowid": null
    }
  ]
}
```

### INSERT Multiple Rows

```sql
INSERT INTO users (name, email, age)
VALUES ('Charlie', 'charlie@example.com', 28),
       ('Diana', 'diana@example.com', 32)
```

### Transactions

```sql
BEGIN TRANSACTION;

INSERT INTO accounts (id, balance) VALUES (1, 1000);
INSERT INTO accounts (id, balance) VALUES (2, 500);

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
```

### GROUP BY & Aggregates

```sql
SELECT
  department,
  COUNT(*) as employee_count,
  AVG(salary) as avg_salary,
  MAX(salary) as max_salary
FROM employees
GROUP BY department
HAVING COUNT(*) > 5
ORDER BY avg_salary DESC
```

### JOINs

```sql
SELECT
  u.name,
  COUNT(o.id) as order_count,
  SUM(o.total) as revenue
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING SUM(o.total) > 1000
```

---

## 📚 API Reference

### Endpoints

#### Execute Queries
```
POST /v1/execute
```

**Request:**
```json
{
  "statements": [
    {
      "sql": "SELECT * FROM table",
      "args": ["param1", "param2"]
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "columns": ["col1", "col2"],
      "rows": [[1, "value"], [2, "value2"]],
      "affected_row_count": 0,
      "last_insert_rowid": null
    }
  ]
}
```

### Error Responses

```json
{
  "error": {
    "code": "SQLITE_ERROR",
    "message": "Syntax error near 'SELEC'",
    "details": {
      "line": 1,
      "column": 1
    }
  }
}
```

**Error Codes:**
| Code | Meaning |
|------|---------|
| `SQLITE_ERROR` | General SQL syntax/execution error |
| `SQLITE_CONSTRAINT` | Constraint violation (unique, not null) |
| `SQLITE_BUSY` | Database locked by concurrent request |
| `SHEETS_API_ERROR` | Google Sheets API error |

### Data Types

All data is stored as text in Sheets. Type conversion happens automatically:

| SQLite Type | Format | Example |
|-------------|--------|---------|
| INTEGER | String | `"42"` |
| REAL | String | `"3.14"` |
| TEXT | String | `"hello"` |
| NULL | Empty string | `""` |
| BOOLEAN | String | `"true"` / `"false"` |

---

## 🏗️ Architecture

```
HTTP POST
    ↓
doPost(e) - Main entry point
    ↓
LockService.acquire() - Concurrency control
    ↓
SQL Parser - Tokenize & validate syntax
    ↓
Query Executor - Execute parsed statements
    ↓
Sheets Adapter - Translate to Sheets API
    ↓
Google Sheets API - Read/write data
    ↓
JSON Response - Format & return results
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **HTTP Handler** (`src/server/`) | Request routing, response formatting |
| **SQL Parser** (`src/parser/`) | Tokenization, AST generation, validation |
| **Query Executor** (`src/executor/`) | SELECT/INSERT/UPDATE/DELETE logic |
| **Sheets Adapter** (`src/adapter/`) | Google Sheets API wrapper |
| **Transaction Manager** (`src/transactions/`) | ACID transaction support |

### Data Flow

1. **Input:** JSON-encoded SQL query via HTTP
2. **Parse:** Convert SQL string → Abstract Syntax Tree
3. **Validate:** Check syntax & schema compatibility
4. **Execute:** Apply WHERE filters, JOINs, aggregates (in-memory)
5. **Adapt:** Translate operations to Sheets API calls
6. **Output:** Format results as JSON

---

## 🛠️ Development

### Build

```bash
npm run build       # Compile TypeScript & bundle with webpack
```

### Test

```bash
npm run test        # Run tests with vitest
npm run test:ui     # Interactive test UI
```

### Lint

```bash
npm run lint        # Check code quality
npm run lint:fix    # Auto-fix issues
npm run lint:critical  # Show only critical issues
```

### Project Structure

```
gsheetql/
├── src/
│   ├── server/           # HTTP handler & responses
│   │   ├── index.ts      # doPost() entry point
│   │   ├── handlers.ts   # Request handlers
│   │   └── response.ts   # Response formatting
│   ├── parser/           # SQL parsing
│   │   ├── lexer.ts      # Tokenization
│   │   ├── parser.ts     # AST generation
│   │   └── ast.ts        # Type definitions
│   ├── executor/         # Query execution
│   │   ├── select.ts     # SELECT logic
│   │   ├── insert.ts     # INSERT logic
│   │   ├── update.ts     # UPDATE logic
│   │   ├── delete.ts     # DELETE logic
│   │   └── index.ts      # Main executor
│   ├── adapter/          # Sheets integration
│   │   ├── sheets.ts     # API wrapper
│   │   ├── mapping.ts    # Table-sheet mapping
│   │   └── conversion.ts # Type conversions
│   ├── transactions/     # Transaction support
│   │   ├── manager.ts    # Coordination
│   │   ├── lock.ts       # LockService wrapper
│   │   └── snapshot.ts   # Rollback snapshots
│   ├── utils/            # Utilities
│   │   └── validation.ts # Input validation
│   └── index.ts          # Main export (exports doPost)
├── tests/                # Test suites
├── package.json          # Dependencies & scripts
├── tsconfig.json         # TypeScript config
├── webpack.config.js     # Bundler config
└── README.md             # This file
```

### TypeScript Development

The project uses strict TypeScript with Google Apps Script types:

```typescript
import GoogleAppsScript = GoogleAppsScript;

// Type-safe APIs
const sheet: GoogleAppsScript.Spreadsheet.Sheet =
  SpreadsheetApp.getActiveSheet();
const values: unknown[][] = sheet.getDataRange().getValues();
```

### Code Style

- Modern TypeScript (strict mode)
- Functional patterns over OOP
- Full word variable names (no abbreviations)
- Small, focused functions (single responsibility)
- JSDoc comments for public APIs

```typescript
/**
 * Execute a SQL query against sheets.
 * @param query - SQL statement
 * @param params - Query parameters for prepared statements
 * @returns Execution result with columns and rows
 */
export async function executeQuery(
  query: string,
  params?: unknown[]
): Promise<QueryResult> {
  // Implementation
}
```

### Commit Workflow

1. **Make changes** in TypeScript files
2. **Run tests** to ensure nothing broke
3. **Build** to check for compilation errors
4. **Commit** with clear, concise messages
5. **Push** to trigger CI (if configured)
6. **Deploy** to Apps Script after review

```bash
npm run lint:fix    # Auto-fix style issues
npm run test        # Verify tests pass
npm run build       # Check TypeScript compilation
git commit -m "implement GROUP BY support"
git push
npm run deploy      # Push to Apps Script
```

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Implement** your changes with tests
4. **Test** thoroughly: `npm run test`
5. **Lint** and fix: `npm run lint:fix`
6. **Commit** with clear messages
7. **Push** and open a Pull Request

### Feature Priority

Features are organized by priority in `IMPLEMENT.md`. Before starting work, check the status:

```bash
# View implementation status
cat IMPLEMENT.md
```

Update `IMPLEMENT.md` when completing features:
```markdown
- [x] Core SELECT support        # Completed
- [ ] Window functions           # Not started
```

### Code Review Standards

- All tests must pass
- Linting must be clean (`npm run lint`)
- Code should follow TypeScript strict mode
- Public APIs need JSDoc comments
- Complex logic should have explanatory comments

---

## 📝 Implementation Status

See [IMPLEMENT.md](IMPLEMENT.md) for detailed feature implementation tracking.

**Current Status:**
- ✅ Core SELECT queries
- ✅ INSERT/UPDATE/DELETE
- ✅ Basic transactions
- ✅ Prepared statements
- 🚧 Window functions (in progress)
- ⏳ Common Table Expressions (planned)

---

## 🔐 Security

### SQL Injection Prevention

Always use prepared statements with parameter binding:

```javascript
// ✅ Safe: Parameterized query
executeQuery(
  "SELECT * FROM users WHERE id = ?",
  [userId]
);

// ❌ Unsafe: String concatenation
executeQuery(`SELECT * FROM users WHERE id = ${userId}`);
```

### Access Control

- Leverages Google Sheets native permissions
- No additional authentication layer needed (Apps Script handles it)
- All data access controlled by Sheets document permissions

### Data Privacy

- All requests go through Google's infrastructure
- No data leaves Google Workspace
- Use Sheets' built-in sharing controls for access management

---

## 📊 Performance Tips

### Optimize Your Queries

```sql
-- ✅ Good: Select only needed columns
SELECT id, name, email FROM users WHERE age > 18;

-- ❌ Bad: Unnecessary columns and missing WHERE
SELECT * FROM users;
```

### Batch Operations

```sql
-- ✅ Good: Insert multiple rows in one statement
INSERT INTO users (name, email)
VALUES ('Alice', 'a@example.com'),
       ('Bob', 'b@example.com'),
       ('Charlie', 'c@example.com');

-- ❌ Bad: Multiple individual inserts
INSERT INTO users VALUES ('Alice', 'a@example.com');
INSERT INTO users VALUES ('Bob', 'b@example.com');
INSERT INTO users VALUES ('Charlie', 'c@example.com');
```

### Consider Sheet Size

- Sheets API reads/writes entire ranges
- Smaller sheets = faster operations
- Consider splitting very large tables across multiple sheets

---

## 🐛 Troubleshooting

### Sheet Not Found

```
Error: Sheet 'users' not found
```

**Solution:** Verify the sheet name exactly matches your query.

### Invalid Range

```
Error: Invalid range - sheet is empty
```

**Solution:** Ensure the sheet has a header row.

### Database Locked

```
Error: SQLITE_BUSY - Database is locked
```

**Solution:** Another query is running. Wait and retry.

---

## 📚 Resources

- [Google Apps Script Docs](https://developers.google.com/apps-script)
- [SQLite SQL Syntax](https://www.sqlite.org/lang.html)
- [libsql Protocol](https://github.com/libsql/libsql)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook)
- [Project Architecture Guide](CLAUDE.md)

---

## 📄 License

MIT License © 2024. See [LICENSE](LICENSE) file for details.

---

## 💬 Questions or Issues?

- **Found a bug?** Open an [issue](https://github.com/yourusername/gsheetql/issues)
- **Have suggestions?** [Discussions](https://github.com/yourusername/gsheetql/discussions)
- **Want to contribute?** See [Contributing](#-contributing)

---

⭐ **If you find gsheetql useful, please star the repository!** Your support motivates continued development.

Made with ❤️ for the Google Sheets community.
