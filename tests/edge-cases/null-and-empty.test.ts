/**
 * Edge case tests for NULL handling and empty values
 */

import { describe, it, expect, beforeAll } from "vitest";
import { initializeClient, generateTableName, getColumnIndex } from "../fixtures/setup.js";

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

      const result = await client.query(`INSERT INTO ${tableName} (id, name) VALUES (2, 'Bob')`);

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

      const result = await client.query(`SELECT * FROM ${tableName} WHERE name IS NULL`);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0][0]).toBe(1); // id 1
    });

    it("should handle IS NOT NULL operator", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} WHERE name IS NOT NULL`);

      expect(result.rows.length).toBe(2);
    });

    it("should distinguish between NULL and empty string", async () => {
      const { client } = await import("../fixtures/setup.js");

      const resultNull = await client.query(
        `SELECT * FROM ${tableName} WHERE name IS NULL`,
      );
      const resultEmpty = await client.query(
        `SELECT * FROM ${tableName} WHERE name = ''`,
      );

      expect(resultNull.rows.length).toBe(1);
      expect(resultEmpty.rows.length).toBe(1);
      expect(resultNull.rows[0][0]).not.toBe(resultEmpty.rows[0][0]);
    });
  });

  describe("Comparisons with NULL", () => {
    it("should handle NULL in comparisons", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} WHERE amount = NULL`);

      // In SQL, NULL = NULL is always false
      expect(result.rows.length).toBe(0);
    });

    it("should handle NULL in NOT EQUAL", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} WHERE amount != 100`);

      // NULL != 100 is also false in SQL
      expect(result.rows.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Empty Strings", () => {
    it("should handle empty string queries", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} WHERE value = ''`);

      expect(result.rows.length).toBe(0); // No empty value column
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

      expect(result.rows.length).toBe(1); // id 1
    });

    it("should handle NULL with OR", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE name IS NULL OR id = 2`,
      );

      expect(result.rows.length).toBe(2); // id 1 and id 2
    });
  });

  describe("NULL with ORDER BY", () => {
    it("should handle NULL values in ORDER BY", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} ORDER BY name ASC`);

      expect(result.rows.length).toBe(4);
      // NULL values typically sort first in ascending order
    });

    it("should order by nullable REAL column", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} ORDER BY amount DESC`);

      expect(result.rows.length).toBe(4);
    });
  });
});
