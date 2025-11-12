# MVP Testing Guide

## Deployment Details

**Web App URL:**

```
https://script.google.com/macros/s/AKfycbywV0663jtV_uSCoPh4O7CJhqmmcxGoHeO-re_jHRRg6dfcvsl074SKk1tVnAorjht4/exec
```

## Test 1: CREATE TABLE

**Request:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      {
        "sql": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT)"
      }
    ]
  }' \
  'https://script.google.com/macros/s/AKfycbywV0663jtV_uSCoPh4O7CJhqmmcxGoHeO-re_jHRRg6dfcvsl074SKk1tVnAorjht4/exec'
```

**Expected Response:**

- HTTP 200
- Schema persisted to `__gsheetql_schema` metadata sheet
- New sheet `users` created with header row: `id`, `name`, `email`

**Verify:**

1. Open the Google Sheet linked to the Apps Script project
2. Look for new `users` sheet (tab at bottom)
3. Look for hidden `__gsheetql_schema` sheet (right-click sheet tabs → Show hidden sheets)
4. Check that `__gsheetql_schema` contains a row with table metadata as JSON

---

## Test 2: CREATE TABLE IF NOT EXISTS

**Request:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      {
        "sql": "CREATE TABLE IF NOT EXISTS users (id INTEGER, name TEXT)"
      }
    ]
  }' \
  'https://script.google.com/macros/s/AKfycbywV0663jtV_uSCoPh4O7CJhqmmcxGoHeO-re_jHRRg6dfcvsl074SKk1tVnAorjht4/exec'
```

**Expected Response:**

- HTTP 200
- No error (should succeed even though `users` already exists)
- No new sheet created (idempotent)

---

## Test 3: Error Handling - Duplicate Table

**Request:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      {
        "sql": "CREATE TABLE users (id INTEGER)"
      }
    ]
  }' \
  'https://script.google.com/macros/s/AKfycbywV0663jtV_uSCoPh4O7CJhqmmcxGoHeO-re_jHRRg6dfcvsl074SKk1tVnAorjht4/exec'
```

**Expected Response:**

- HTTP 200
- Error in response with code `SQLITE_ERROR`
- Message: "Table users already exists"
- Debug ID in error for tracing

---

## Test 4: Error Handling - Invalid SQL

**Request:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      {
        "sql": "CREATE TABLEE users (id INTEGER)"
      }
    ]
  }' \
  'https://script.google.com/macros/s/AKfycbywV0663jtV_uSCoPh4O7CJhqmmcxGoHeO-re_jHRRg6dfcvsl074SKk1tVnAorjht4/exec'
```

**Expected Response:**

- HTTP 200
- Error in response with code `SQLITE_ERROR`
- Parser error message with details
- Debug ID included

---

## Test 5: Batch Statements

**Request:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      { "sql": "CREATE TABLE posts (id INTEGER, title TEXT, author_id INTEGER)" },
      { "sql": "CREATE TABLE comments (id INTEGER, post_id INTEGER, content TEXT)" }
    ]
  }' \
  'https://script.google.com/macros/s/AKfycbywV0663jtV_uSCoPh4O7CJhqmmcxGoHeO-re_jHRRg6dfcvsl074SKk1tVnAorjht4/exec'
```

**Expected Response:**

- HTTP 200
- Multiple results in response array (one per statement)
- Both sheets created
- Both schemas persisted

---

## Response Format

All responses follow libsql-compatible format:

**Success:**

```json
{
  "success": true,
  "result": {
    "data": {
      "results": [
        {
          "columns": [],
          "rows": [],
          "affectedRowCount": 0
        }
      ],
      "metadata": {
        "schemaVersion": 1,
        "warnings": []
      }
    }
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "SQLITE_ERROR",
    "message": "Table users already exists",
    "debugId": "1234-abcd"
  }
}
```

---

## Debugging

### View Logs

In Apps Script editor:

1. Click "Execution log" or "Logs" (View → Logs)
2. Shows console.warn/error output from logger utility
3. Each log includes timestamp, requestId, level, message

### View Schema Metadata

1. In the Google Sheet, right-click sheet tabs
2. Select "Show hidden sheets"
3. Open `__gsheetql_schema` sheet
4. View table_name, schema_json, version, created_at, updated_at columns

### View Created Tables

Each CREATE TABLE creates a new sheet with:

- First row: column headers
- Subsequent rows: data (empty after CREATE)

---

## Known Limitations (MVP)

- Only CREATE TABLE supported (INSERT, UPDATE, DELETE, SELECT coming next)
- No WHERE clause support yet
- No parameter binding in CREATE TABLE (manual values only)
- No transactions yet (BEGIN/COMMIT/ROLLBACK parsed but not functional)
- Single-table operations only

---

## Next Phase

After CREATE TABLE is validated:

1. Implement SelectExecutor (SELECT \* support)
2. Implement InsertExecutor (INSERT VALUES support)
3. Implement UpdateExecutor (UPDATE WHERE support)
4. Implement DeleteExecutor (DELETE WHERE support)
5. Implement TransactionManager (atomic batch operations)
