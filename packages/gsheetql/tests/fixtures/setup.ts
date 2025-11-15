/**
 * Shared test setup and utilities
 */

import { getApiClient, SqlClient } from "./api-client.js";

export let client: SqlClient;

/**
 * Initialize API client before tests
 */
export function initializeClient() {
  client = getApiClient();
  return client;
}

/**
 * Generate unique table name (useful for tests that might run in parallel)
 */
export function generateTableName(prefix: string = "test"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a test table with standard schema
 */
export async function createTestTable(tableName: string) {
  return client.createTable(
    tableName,
    "id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT, age INTEGER",
  );
}

/**
 * Insert standard test data
 */
export async function insertTestData(tableName: string) {
  return client.query(
    `INSERT INTO ${tableName} (id, name, email, age) VALUES
      (1, 'Alice Johnson', 'alice@example.com', 28),
      (2, 'Bob Smith', 'bob@example.com', 35),
      (3, 'Charlie Brown', 'charlie@example.com', 42),
      (4, 'Diana Prince', 'diana@example.com', 29),
      (5, 'Eve Wilson', 'eve@example.com', 31)`,
  );
}

/**
 * Assert row count
 */
export function assertRowCount(rows: any[][], expected: number) {
  if (rows.length !== expected) {
    throw new Error(
      `Expected ${expected} rows, got ${rows.length}. Rows: ${JSON.stringify(rows)}`,
    );
  }
}

/**
 * Assert column exists
 */
export function assertColumnExists(columns: string[], name: string) {
  if (!columns.includes(name)) {
    throw new Error(
      `Column '${name}' not found. Available columns: ${columns.join(", ")}`,
    );
  }
}

/**
 * Get column index
 */
export function getColumnIndex(columns: string[], name: string): number {
  const index = columns.indexOf(name);
  if (index === -1) {
    throw new Error(
      `Column '${name}' not found. Available columns: ${columns.join(", ")}`,
    );
  }
  return index;
}

/**
 * Extract column values from rows
 */
export function extractColumn(rows: any[][], columnIndex: number): any[] {
  return rows.map((row) => row[columnIndex]);
}

/**
 * Assert rows are sorted by column
 */
export function assertSortedAsc(rows: any[][], columnIndex: number) {
  const values = extractColumn(rows, columnIndex);
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      throw new Error(
        `Rows not sorted ascending at index ${i}: ${values[i - 1]} > ${values[i]}`,
      );
    }
  }
}

export function assertSortedDesc(rows: any[][], columnIndex: number) {
  const values = extractColumn(rows, columnIndex);
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) {
      throw new Error(
        `Rows not sorted descending at index ${i}: ${values[i - 1]} < ${values[i]}`,
      );
    }
  }
}

/**
 * Wait for API (useful for eventual consistency)
 */
export async function waitForApi(
  fn: () => Promise<boolean>,
  maxAttempts: number = 5,
  delayMs: number = 100,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      if (await fn()) {
        return true;
      }
    } catch (e) {
      // Continue to next attempt
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}
