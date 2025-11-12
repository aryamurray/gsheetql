# gsheetql Test Suite

Comprehensive test suite for gsheetql using Vitest.

## Structure

```
tests/
├── fixtures/
│   ├── api-client.ts        # API client for executing SQL
│   └── setup.ts             # Shared utilities and helpers
├── integration/
│   └── crud.test.ts         # CREATE, INSERT, SELECT operations
└── edge-cases/
    ├── null-and-empty.test.ts      # NULL handling
    ├── special-characters.test.ts  # Quotes, unicode, escaping
    └── type-coercion.test.ts       # Type conversions
```

## Setup

### 1. Configure API URL

Set the `VITE_API_URL` environment variable to your deployed gsheetql endpoint:

```bash
export VITE_API_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

Or create a `.env` file:

```
VITE_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### 2. Install Dependencies

```bash
npm install
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run specific test file

```bash
npm test tests/integration/crud.test.ts
```

### Run with UI

```bash
npm run test:ui
```

Opens an interactive test UI in your browser.

### Run tests in watch mode

```bash
npm test -- --watch
```

### Run with specific pattern

```bash
npm test -- --grep "WHERE Clause"
```

## Test Files

### `integration/crud.test.ts`

Core functionality tests:
- CREATE TABLE with various column types
- INSERT single and multiple rows
- SELECT all rows and with WHERE clauses
- WHERE clause with different operators (=, !=, >, <, >=, <=, <>)
- Text filtering
- Logical operators (AND, OR)
- ORDER BY (ascending/descending)
- LIMIT and OFFSET
- Combined clauses

**Number of tests:** ~50

### `edge-cases/null-and-empty.test.ts`

NULL value handling:
- INSERT with NULL values
- INSERT with missing columns
- INSERT empty strings
- SELECT with IS NULL / IS NOT NULL
- NULL in comparisons
- NULL with AND/OR operators
- NULL with ORDER BY

**Number of tests:** ~15

### `edge-cases/special-characters.test.ts`

Special character handling:
- Quotes in values (single and double)
- Backslashes and escaping
- Special ASCII characters
- Unicode (emoji, accented chars, Chinese, Arabic)
- Long strings
- Names with hyphens and apostrophes
- Querying special characters

**Number of tests:** ~20

### `edge-cases/type-coercion.test.ts`

Type conversion tests:
- Numeric type coercion
- String to number implicit conversion
- Boolean-like values
- Mixed type comparisons
- Negative numbers
- Very large/small numbers
- Zero handling
- Type coercion in ORDER BY

**Number of tests:** ~20

## Total Test Coverage

- **~105 test cases** covering:
  - Basic CRUD operations
  - Complex WHERE clauses
  - Sorting and pagination
  - NULL handling
  - Special characters and Unicode
  - Type coercion and conversions

## Writing New Tests

### Basic test structure

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { initializeClient, generateTableName } from "../fixtures/setup.js";

let tableName: string;

beforeAll(() => {
  initializeClient();
  tableName = generateTableName("my_test");
});

describe("Feature Name", () => {
  it("should do something", async () => {
    const { client } = await import("../fixtures/setup.js");

    const result = await client.query("SELECT * FROM my_table");

    expect(result.rows.length).toBeGreaterThan(0);
  });
});
```

### Using test helpers

```typescript
import {
  getColumnIndex,
  extractColumn,
  assertSortedAsc,
  assertRowCount
} from "../fixtures/setup.js";

// Get column index
const idIndex = getColumnIndex(result.columns, "id");

// Extract values from column
const names = extractColumn(result.rows, 1);

// Assert row count
assertRowCount(result.rows, 5);

// Assert sorting
assertSortedAsc(result.rows, 3); // salary column
```

## Debugging Tests

### View API responses

Add this to see full responses:

```typescript
console.log(JSON.stringify(result, null, 2));
```

### Skip a test

```typescript
it.skip("should do something", async () => {
  // test code
});
```

### Only run one test

```typescript
it.only("should do something", async () => {
  // test code
});
```

### Increase timeout

Tests have a 30-second timeout by default. For slow APIs, adjust in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 60000, // 60 seconds
}
```

## Environment Variables

- `VITE_API_URL` - Your deployed gsheetql API endpoint (required)
- `TEST_API_URL` - Alternative variable name for API URL

## Troubleshooting

### "API URL not configured"

Set the `VITE_API_URL` environment variable:

```bash
export VITE_API_URL="https://your-api-url/exec"
npm test
```

### Tests timeout

Increase timeout in `vitest.config.ts` or set environment variable:

```bash
VITEST_TEST_TIMEOUT=60000 npm test
```

### Table already exists error

Tests use unique table names with timestamps. If you get this error, the previous test run didn't clean up. Either:
1. Wait a moment and run tests again (unique table names use timestamps)
2. Manually delete old test tables from your spreadsheet

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Run tests
  env:
    VITE_API_URL: ${{ secrets.API_URL }}
  run: npm test
```

## Future Test Additions

- [ ] UPDATE queries
- [ ] DELETE queries
- [ ] JOIN operations
- [ ] Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- [ ] GROUP BY and HAVING
- [ ] Subqueries
- [ ] Transactions (BEGIN, COMMIT, ROLLBACK)
- [ ] Performance tests
- [ ] Concurrency tests
