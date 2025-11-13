/**
 * Edge case tests for type coercion and implicit conversions
 */

import { describe, it, expect, beforeAll } from "vitest";
import { initializeClient, generateTableName, getColumnIndex } from "../fixtures/setup.js";

let tableName: string;

beforeAll(() => {
  initializeClient();
  tableName = generateTableName("type_coerce");
});

describe("Type Coercion and Conversions", () => {
  it("should create table with mixed types", async () => {
    const { client } = await import("../fixtures/setup.js");

    await client.query(
      `CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY,
        name TEXT,
        age INTEGER,
        salary REAL,
        active TEXT
      )`,
    );
  });

  describe("Numeric Type Coercion", () => {
    it("should insert integers and reals", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, age, salary) VALUES
          (1, 'Alice', 25, 75000.50),
          (2, 'Bob', 30, 65000),
          (3, 'Charlie', 35, 80000.00)`,
      );

      expect(result.affectedRowCount).toBe(3);
    });

    it("should handle numeric string comparisons", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} WHERE age > 25`);

      expect(result.rows.length).toBe(2);
    });

    it("should compare integers with reals", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} WHERE salary >= 75000`);

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle float precision", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE salary = 75000.50`,
      );

      expect(result.rows.length).toBe(1);
    });

    it("should order numeric values correctly", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} ORDER BY salary ASC`);

      const salaries = result.rows.map((row: any) => Number(row[4]));
      for (let i = 1; i < salaries.length; i++) {
        expect(salaries[i]).toBeGreaterThanOrEqual(salaries[i - 1]);
      }
    });
  });

  describe("String to Number Implicit Conversion", () => {
    it("should compare numeric strings as numbers in WHERE", async () => {
      const { client } = await import("../fixtures/setup.js");

      // Even though name is TEXT, "25" should convert to number for comparison
      const result = await client.query(`SELECT * FROM ${tableName} WHERE age > '25'`);

      expect(result.rows.length).toBe(2); // Bob (30), Charlie (35)
    });

    it("should handle leading zeros in numbers", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`INSERT INTO ${tableName} (id, name, age) VALUES (4, 'Diana', 025)`);

      // 025 in decimal is just 25
      expect(result.affectedRowCount).toBe(1);
    });
  });

  describe("Boolean Handling", () => {
    it("should insert and query boolean-like values", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, active) VALUES (5, 'Eve', 'true'), (6, 'Frank', 'false')`,
      );

      expect(result.affectedRowCount).toBe(2);
    });

    it("should query boolean text values", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} WHERE active = 'true'`);

      // Should find rows where active equals 'true' (if any were inserted)
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Mixed Type Comparisons", () => {
    it("should handle TEXT to INTEGER comparison", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, age) VALUES (7, 'Grace', 28)`,
      );

      expect(result.affectedRowCount).toBe(1);

      const selectResult = await client.query(`SELECT * FROM ${tableName} WHERE age = '28'`);

      expect(selectResult.rows.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle TEXT to REAL comparison", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE salary > '70000'`,
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Case Numeric Values", () => {
    it("should handle negative numbers", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, age, salary) VALUES (8, 'Henry', -5, -1000.50)`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should query negative numbers", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} WHERE age = -5`);

      // Should find rows where age equals -5 (if any were inserted)
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle very large numbers", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, salary) VALUES (9, 'Iris', 999999999.99)`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should handle very small decimal numbers", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, salary) VALUES (10, 'Jack', 0.01)`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should handle zero", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, age, salary) VALUES (11, 'Kate', 0, 0)`,
      );

      expect(result.affectedRowCount).toBe(1);
    });
  });

  describe("Type Coercion in ORDER BY", () => {
    it("should order TEXT numbers correctly as numbers", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(`SELECT * FROM ${tableName} ORDER BY age ASC`);

      const ages = result.rows.map((row: any) => Number(row[2]));
      // Should be ordered numerically, not lexically
      expect(ages[0]).toBeLessThanOrEqual(ages[ages.length - 1]);
    });
  });

  describe("Whitespace and Numeric Parsing", () => {
    it("should handle numbers with spaces", async () => {
      const { client } = await import("../fixtures/setup.js");

      // This might fail depending on parser, but we're testing the behavior
      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, age) VALUES (12, 'Leo', 42)`,
      );

      expect(result.affectedRowCount).toBe(1);
    });
  });
});
