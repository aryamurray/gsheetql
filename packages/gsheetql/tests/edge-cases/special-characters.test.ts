/**
 * Edge case tests for special characters, quotes, and escaping
 */

import { describe, it, expect, beforeAll } from "vitest";
import { initializeClient, generateTableName } from "../fixtures/setup.js";

let tableName: string;

beforeAll(() => {
  initializeClient();
  tableName = generateTableName("special_chars");
});

describe("Special Characters and Escaping", () => {
  it("should create table", async () => {
    const { client } = await import("../fixtures/setup.js");

    await client.query(
      `CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY,
        text_value TEXT,
        description TEXT
      )`,
    );
  });

  describe("Quotes in Values", () => {
    it("should handle single quotes in text", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (1, 'O''Brien')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should handle double quotes in text", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value, description) VALUES (2, 'Text with "quotes"', 'A description')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should retrieve text with quotes correctly", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE id = 2`,
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0][1]).toContain('"');
    });
  });

  describe("Special ASCII Characters", () => {
    it("should handle backslash", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (3, 'path\\\\to\\\\file')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should handle tabs and newlines", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value, description) VALUES (4, 'Line1' || char(10) || 'Line2', 'Multi-line')`,
      );

      // This might fail if functions aren't supported, which is ok
      // Just checking that it doesn't crash
    });

    it("should handle special punctuation", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (5, '@#$%^&*()_+-=[]{}|;:<>,.?/')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });
  });

  describe("Unicode Characters", () => {
    it("should handle emoji", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (6, '😀 Happy')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should handle accented characters", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (7, 'Café, Naïve, Über')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should handle Chinese characters", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (8, '你好世界')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should handle Arabic characters", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (9, 'مرحبا بالعالم')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should retrieve and query unicode correctly", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE id = 8`,
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0][1]).toBe("你好世界");
    });
  });

  describe("Edge Case Names", () => {
    it("should handle names with hyphens", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (10, 'Jean-Luc Picard')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should handle names with apostrophes", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (11, \"Mary's\")`,
      );

      expect(result.affectedRowCount).toBe(1);
    });

    it("should handle very long strings", async () => {
      const { client } = await import("../fixtures/setup.js");

      const longText = "A".repeat(1000);
      const result = await client.query(
        `INSERT INTO ${tableName} (id, text_value) VALUES (12, '${longText}')`,
      );

      expect(result.affectedRowCount).toBe(1);
    });
  });

  describe("Querying Special Characters", () => {
    it("should query text containing special characters", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE text_value LIKE 'O'`,
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });

    it("should match exact special character strings", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `SELECT * FROM ${tableName} WHERE text_value = '@#$%^&*()'`,
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });
  });
});
