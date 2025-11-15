# @clarkyy/gsheetql-drizzle-client

A Drizzle ORM driver for GSheetQL - a SQLite-compatible database backed by Google Sheets.

This driver enables you to use Drizzle ORM's query builder with your GSheetQL backend, providing type-safe SQL queries against Google Sheets data.

## Installation

```bash
npm install @clarkyy/gsheetql-drizzle-client drizzle-orm
# or
bun add @clarkyy/gsheetql-drizzle-client drizzle-orm
```

## Quick Start

```typescript
import { drizzle } from "@clarkyy/gsheetql-drizzle-client";
import { eq } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Define your schema
const users = sqliteTable("users", {
  id: integer().primaryKey(),
  name: text().notNull(),
  email: text(),
  age: integer(),
});

// Create database instance
const db = drizzle({
  endpoint: process.env.GSHEETQL_ENDPOINT!,
  apiKey: process.env.GSHEETQL_API_KEY,
});

// Execute queries
const allUsers = await db.select().from(users).all();
const user = await db.select().from(users).where(eq(users.id, 1)).get();
await db.insert(users).values({ id: 1, name: "Alice", age: 28 });
await db.update(users).set({ age: 29 }).where(eq(users.id, 1));
await db.delete(users).where(eq(users.id, 1));
```

## Configuration

### GSheetQLConfig

```typescript
type GSheetQLConfig = {
  endpoint: string; // Required: GSheetQL doPost endpoint URL
  apiKey?: string; // Optional: API key for authentication
  googleAuthToken?: string; // Optional: Google OAuth token
  timeout?: number; // Optional: timeout in ms (default: 30000)
  debug?: boolean; // Optional: enable debug logging
  cacheSize?: number; // Optional: prepared statement cache size
};
```

## Environment Setup

```bash
export GSHEETQL_ENDPOINT="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
export GSHEETQL_API_KEY="sk_..."  # Optional
```

## Supported Features

### Query Operations

- ✅ SELECT with WHERE, ORDER BY, LIMIT, OFFSET
- ✅ INSERT (single and multiple rows)
- ✅ UPDATE with WHERE
- ✅ DELETE with WHERE
- ✅ Conditions: eq, and, or, gte, lte, etc.
- ✅ JOINs (INNER, LEFT, RIGHT, FULL)
- ✅ Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- ✅ GROUP BY and HAVING
- ✅ Subqueries

### Advanced Features

- ✅ Type-safe TypeScript support
- ✅ Prepared statement caching
- ✅ Parameter binding (SQL injection prevention)
- ✅ HTTP timeout configuration
- ✅ Debug logging

### Coming Soon

- 🔄 Transactions (SAVEPOINT, ROLLBACK)
- 🔄 Database migrations
- 🔄 Relations API
- 🔄 Batch operations

## Testing

Run tests:

```bash
bun test
bun test:watch
bun test:ui
```

Tests include:

- **basic.test.ts**: Query builder functionality
- **integration.test.ts**: Live query execution tests

## Building

```bash
bun run build
bun run type-check
bun run dev
```

## Architecture

- **GSheetQLSession**: Database connection management
- **GSheetQLPreparedQuery**: SQL query execution
- **GSheetQLHttpClient**: HTTP transport layer
- **GSheetQLDatabase**: Main database instance

## Examples

Filtering:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
