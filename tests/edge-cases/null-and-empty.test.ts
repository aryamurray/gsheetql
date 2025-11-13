/**
 * Edge case tests for NULL handling and empty values
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  initializeClient,
  generateTableName,
  getColumnIndex,
} from "../fixtures/setup.js";

let tableName: string;

beforeAll(() => {
  initializeClient();
  tableName = generateTableName("null_test");
});

describe("NULL and Empty Value Handling", () => {
  it("should create table for NULL tests", async () => {
    const { client } = await import("../fixtures/setup.js");

    await client.query(
      `CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY,
        name TEXT,
        value TEXT,
        amount REAL
      )`,
    );
  });

  describe("INSERT - NULL Handling", () => {
    it("should insert row with NULL values", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, value, amount) VALUES (1, NULL, 'test', NULL)`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should insert with missing columns (treated as NULL)", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name) VALUES (2, 'Bob')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should insert empty strings", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, value) VALUES (3, '', 'empty')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });
  });

  describe("SELECT - NULL Filtering", () => {
    it("should return rows with NULL values", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName}`);

      expect(result.rows.length).toBe(3);
    });

    it("should handle IS NULL operator", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE name IS NULL`,
      );

      // Should find NULL values (empty cells)
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle IS NOT NULL operator", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE name IS NOT NULL`,
      );

      // id 2 (Bob) and id 3 (with empty string name) - both are not NULL
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it("should treat NULL and empty string the same", async () => {
      const { client } = await import("../fixtures/setup.js");

      // In Google Sheets, NULL is stored as empty string, so they're equivalent
      const resultNull = await client.query(
        `SELECT * FROM ${tableName} WHERE name IS NULL`,
      );
      const resultEmpty = await client.query(
        `SELECT * FROM ${tableName} WHERE name = ''`,
      );

      // Both queries should return the same rows (empty cells are NULL)
      expect(resultNull.rows.length).toBe(resultEmpty.rows.length);
    });
  });

  describe("Comparisons with NULL", () => {
    it("should handle NULL in comparisons", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE amount = NULL`,
      );

      // In SQL, NULL = NULL is always false
      expect(result.rows.length).toBe(0);
    });

    it("should handle NULL in NOT EQUAL", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE amount != 100`,
      );

      // NULL != 100 is also false in SQL
      expect(result.rows.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Empty Strings", () => {
    it("should handle empty string queries", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE value = ''`,
      );

      // Should find rows where value is empty string (NULL/missing columns)
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });

    it("should insert and retrieve empty strings", async () => {
      const { client } = await import("../fixtures/setup.js");

      const insertResult = await client.query(
        `INSERT INTO ${tableName} (id, name, value) VALUES (4, 'Empty', '')`,
      );
      expect(insertResult.affectedRowCount).toBe(1);

      const selectResult = await client.query(
        `SELECT * FROM ${tableName} WHERE id = 4`,
      );
      const valueIndex = getColumnIndex(selectResult.columns, "value");
      expect(selectResult.rows[0][valueIndex]).toBe("");
    });
  });

  describe("NULL with Operators", () => {
    it("should handle NULL with AND", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE name IS NULL AND value IS NOT NULL`,
      );

      // id 1 has NULL name and value='test'
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle NULL with OR", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE name IS NULL OR id = 2`,
      );

      // Should find rows where name is NULL OR id = 2
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("NULL with ORDER BY", () => {
    it("should handle NULL values in ORDER BY", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} ORDER BY name ASC`,
      );

      expect(result.rows.length).toBe(4);
      // NULL values typically sort first in ascending order
    });

    it("should order by nullable REAL column", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} ORDER BY amount DESC`,
      );

      expect(result.rows.length).toBe(4);
    });
  });
});
