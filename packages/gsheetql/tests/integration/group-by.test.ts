/**
 * Integration tests for GROUP BY and aggregate functions
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  initializeClient,
  generateTableName,
} from "../fixtures/setup.js";

let tableName: string;

beforeAll(() => {
  initializeClient();
  tableName = generateTableName("group_test");
});

describe("GROUP BY Operations", () => {
  describe("Setup", () => {
    it("should create test table", async () => {
      const { client } = await import("../fixtures/setup.js");

      await client.query(
        `CREATE TABLE ${tableName} (
          id INTEGER PRIMARY KEY,
          department TEXT,
          employee TEXT,
          salary REAL
        )`,
      );

      expect(true).toBe(true);
    });

    it("should insert test data", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, department, employee, salary) VALUES
          (1, 'Engineering', 'Alice', 100000),
          (2, 'Engineering', 'Bob', 95000),
          (3, 'Sales', 'Charlie', 80000),
          (4, 'Sales', 'Diana', 85000),
          (5, 'HR', 'Eve', 75000)`,
      );

      expect(result.affectedRowCount).toBe(5);
    });
  });

  describe("COUNT Aggregate", () => {
    it("should count rows per group", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, COUNT(*) as count FROM ${tableName} GROUP BY department`,
      );

      expect(result.columns).toContain("department");
      expect(result.columns).toContain("count");
      expect(result.rows.length).toBe(3); // 3 departments
    });

    it("should count non-null values", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, COUNT(employee) as emp_count FROM ${tableName} GROUP BY department`,
      );

      expect(result.rows.length).toBe(3);
      // Each group should have employee count
      for (const row of result.rows) {
        expect(Number(row[1])).toBeGreaterThan(0);
      }
    });
  });

  describe("SUM Aggregate", () => {
    it("should sum values per group", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, SUM(salary) as total_salary FROM ${tableName} GROUP BY department`,
      );

      expect(result.columns).toContain("department");
      expect(result.columns).toContain("total_salary");
      expect(result.rows.length).toBe(3);

      // Engineering total: 100000 + 95000 = 195000
      const eng = result.rows.find(r => r[0] === "Engineering");
      expect(Number(eng?.[1])).toBe(195000);

      // Sales total: 80000 + 85000 = 165000
      const sales = result.rows.find(r => r[0] === "Sales");
      expect(Number(sales?.[1])).toBe(165000);
    });
  });

  describe("AVG Aggregate", () => {
    it("should average values per group", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, AVG(salary) as avg_salary FROM ${tableName} GROUP BY department`,
      );

      expect(result.columns).toContain("avg_salary");
      expect(result.rows.length).toBe(3);

      // Engineering avg: (100000 + 95000) / 2 = 97500
      const eng = result.rows.find(r => r[0] === "Engineering");
      expect(Number(eng?.[1])).toBe(97500);
    });
  });

  describe("MIN/MAX Aggregates", () => {
    it("should find min and max per group", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, MIN(salary) as min_sal, MAX(salary) as max_sal FROM ${tableName} GROUP BY department`,
      );

      expect(result.columns.length).toBe(3);
      expect(result.rows.length).toBe(3);

      // Engineering: min=95000, max=100000
      const eng = result.rows.find(r => r[0] === "Engineering");
      expect(Number(eng?.[1])).toBe(95000);
      expect(Number(eng?.[2])).toBe(100000);
    });
  });

  describe("Multiple Aggregates", () => {
    it("should calculate multiple aggregates in one query", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, COUNT(*) as emp_count, SUM(salary) as total, AVG(salary) as avg FROM ${tableName} GROUP BY department`,
      );

      expect(result.columns.length).toBe(4);
      expect(result.rows.length).toBe(3);

      for (const row of result.rows) {
        expect(Number(row[1])).toBeGreaterThan(0); // count
        expect(Number(row[2])).toBeGreaterThan(0); // sum
        expect(Number(row[3])).toBeGreaterThan(0); // avg
      }
    });
  });

  describe("HAVING Clause", () => {
    it("should filter groups with HAVING", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, SUM(salary) as total FROM ${tableName} GROUP BY department HAVING SUM(salary) > 150000`,
      );

      expect(result.rows.length).toBe(2); // Engineering and Sales

      // All results should have total > 150000
      for (const row of result.rows) {
        expect(Number(row[1])).toBeGreaterThan(150000);
      }
    });

    it("should filter by COUNT in HAVING", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, COUNT(*) as emp_count FROM ${tableName} GROUP BY department HAVING COUNT(*) > 1`,
      );

      expect(result.rows.length).toBe(2); // Engineering and Sales (HR has only 1)

      for (const row of result.rows) {
        expect(Number(row[1])).toBeGreaterThan(1);
      }
    });
  });

  describe("GROUP BY with WHERE and ORDER BY", () => {
    it("should apply WHERE before GROUP BY", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, COUNT(*) as count FROM ${tableName} WHERE salary > 80000 GROUP BY department`,
      );

      // Engineering: both > 80000, Sales: 1 > 80000, HR: 0 > 80000
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should order grouped results", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, COUNT(*) as count FROM ${tableName} GROUP BY department ORDER BY count DESC`,
      );

      expect(result.rows.length).toBe(3);
      // First result should have the most employees
      expect(Number(result.rows[0][1])).toBeGreaterThanOrEqual(Number(result.rows[1][1]));
    });
  });

  describe("GROUP BY with LIMIT", () => {
    it("should limit grouped results", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT department, COUNT(*) as count FROM ${tableName} GROUP BY department LIMIT 2`,
      );

      expect(result.rows.length).toBe(2);
    });
  });
});
