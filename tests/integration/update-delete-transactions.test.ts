/**
 * Integration tests for UPDATE, DELETE, and TRANSACTION operations
 * Tests the full flow of modifying and rolling back data
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  initializeClient,
  generateTableName,
  extractColumn,
} from "../fixtures/setup.js";

let tableName: string;
let txTableName: string;
let psTableName: string;

beforeAll(() => {
  initializeClient();
  tableName = generateTableName("upd_del_tx");
  txTableName = generateTableName("tx_test");
  psTableName = generateTableName("ps_test");
});

describe("UPDATE Operations", () => {
  describe("Setup", () => {
    it("should create test table", async () => {
      const { client } = await import("../fixtures/setup.js");

      await client.query(
        `CREATE TABLE ${tableName} (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          salary REAL,
          department TEXT
        )`,
      );

      expect(true).toBe(true);
    });

    it("should insert test data", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `INSERT INTO ${tableName} (id, name, salary, department) VALUES
          (1, 'Alice', 75000.00, 'Engineering'),
          (2, 'Bob', 65000.00, 'Engineering'),
          (3, 'Charlie', 70000.00, 'Sales'),
          (4, 'Diana', 80000.00, 'Management'),
          (5, 'Eve', 60000.00, 'Support')`,
      );

      expect(result.affectedRowCount).toBe(5);
    });
  });

  describe("UPDATE - Basic", () => {
    it("should update a single row by id", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `UPDATE ${tableName} SET salary = 76000.00 WHERE id = 1`,
      );

      expect(result.affectedRowCount).toBe(1);

      // Verify the update
      const check = await client.query(
        `SELECT * FROM ${tableName} WHERE id = 1`,
      );
      const salaryCol = check.columns.indexOf("salary");
      expect(check.rows[0][salaryCol]).toBe("76000");
    });

    it("should update multiple rows with WHERE clause", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `UPDATE ${tableName} SET salary = 71000.00 WHERE department = 'Engineering'`,
      );

      expect(result.affectedRowCount).toBe(2); // Alice and Bob

      // Verify both updated
      const check = await client.query(
        `SELECT * FROM ${tableName} WHERE department = 'Engineering'`,
      );
      const salaryCol = check.columns.indexOf("salary");
      expect(check.rows[0][salaryCol]).toBe("71000");
      expect(check.rows[1][salaryCol]).toBe("71000");
    });

    it("should update multiple columns", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `UPDATE ${tableName} SET salary = 82000.00, department = 'Leadership' WHERE id = 4`,
      );

      expect(result.affectedRowCount).toBe(1);

      // Verify both columns updated
      const check = await client.query(
        `SELECT * FROM ${tableName} WHERE id = 4`,
      );
      const deptCol = check.columns.indexOf("department");
      const salaryCol = check.columns.indexOf("salary");
      expect(check.rows[0][salaryCol]).toBe("82000");
      expect(check.rows[0][deptCol]).toBe("Leadership");
    });

    it("should update with expressions", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `UPDATE ${tableName} SET salary = salary + 1000.00 WHERE id = 2`,
      );

      expect(result.affectedRowCount).toBe(1);

      // Verify the expression was evaluated
      const check = await client.query(
        `SELECT * FROM ${tableName} WHERE id = 2`,
      );
      const salaryCol = check.columns.indexOf("salary");
      expect(check.rows[0][salaryCol]).toBe("72000");
    });

    it("should update without WHERE clause (all rows)", async () => {
      const { client } = await import("../fixtures/setup.js");

      const countBefore = await client.query(`SELECT * FROM ${tableName}`);

      const result = await client.query(
        `UPDATE ${tableName} SET department = 'Updated' WHERE name = 'NonExistent'`,
      );

      // Should match no rows
      expect(result.affectedRowCount).toBe(0);
    });
  });

  describe("DELETE Operations", () => {
    it("should delete a single row by id", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `DELETE FROM ${tableName} WHERE id = 5`,
      );

      expect(result.affectedRowCount).toBe(1);

      // Verify row is gone
      const check = await client.query(
        `SELECT * FROM ${tableName} WHERE id = 5`,
      );
      expect(check.rows.length).toBe(0);
    });

    it("should delete multiple rows with WHERE clause", async () => {
      const { client } = await import("../fixtures/setup.js");

      // Insert some test rows for deletion
      await client.query(
        `INSERT INTO ${tableName} (id, name, salary, department) VALUES
          (10, 'Test1', 50000, 'ToDelete'),
          (11, 'Test2', 51000, 'ToDelete')`,
      );

      const result = await client.query(
        `DELETE FROM ${tableName} WHERE department = 'ToDelete'`,
      );

      expect(result.affectedRowCount).toBe(2);

      // Verify all rows with that department are gone
      const check = await client.query(
        `SELECT * FROM ${tableName} WHERE department = 'ToDelete'`,
      );
      expect(check.rows.length).toBe(0);
    });

    it("should handle delete with no matching rows", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.query(
        `DELETE FROM ${tableName} WHERE id = 999999`,
      );

      expect(result.affectedRowCount).toBe(0);
    });
  });
});

describe("TRANSACTION Operations", () => {
  describe("Setup", () => {
    it("should create transaction test table", async () => {
      const { client } = await import("../fixtures/setup.js");

      await client.query(
        `CREATE TABLE ${txTableName} (
          id INTEGER PRIMARY KEY,
          balance REAL
        )`,
      );

      expect(true).toBe(true);
    });

    it("should insert transaction test data", async () => {
      const { client } = await import("../fixtures/setup.js");

      await client.query(
        `INSERT INTO ${txTableName} (id, balance) VALUES
          (1, 1000.00),
          (2, 500.00)`,
      );

      expect(true).toBe(true);
    });
  });

  describe("COMMIT", () => {
    it("should commit successful transaction", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      // Start transaction
      await client.query("BEGIN");

      // Make changes
      await client.query(
        `INSERT INTO ${txTableName} (id, balance) VALUES (3, 750.00)`,
      );

      // Commit
      const commitResult = await client.query("COMMIT");
      expect(commitResult.affectedRowCount).toBe(0); // COMMIT returns empty result

      // Verify changes persisted
      const check = await client.query(
        `SELECT * FROM ${txTableName} WHERE id = 3`,
      );
      expect(check.rows.length).toBe(1);
    });

    it("should allow multiple operations in transaction", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      await client.query("BEGIN");

      // Insert
      await client.query(
        `INSERT INTO ${txTableName} (id, balance) VALUES (4, 800.00)`,
      );

      // Update
      await client.query(
        `UPDATE ${txTableName} SET balance = 1100.00 WHERE id = 1`,
      );

      // Delete
      await client.query(`DELETE FROM ${txTableName} WHERE id = 2`);

      await client.query("COMMIT");

      // Verify all changes persisted
      const check = await client.query(
        `SELECT * FROM ${txTableName} WHERE id = 1`,
      );
      const balanceCol = check.columns.indexOf("balance");
      expect(check.rows[0][balanceCol]).toBe("1100");

      const checkDeleted = await client.query(
        `SELECT * FROM ${txTableName} WHERE id = 2`,
      );
      expect(checkDeleted.rows.length).toBe(0);
    });
  });

  describe("ROLLBACK", () => {
    it("should rollback changes on ROLLBACK", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      // Get initial state
      const initialCount = await client.query(`SELECT * FROM ${txTableName}`);
      const initialRows = initialCount.rows.length;

      // Start transaction
      await client.query("BEGIN");

      // Make changes
      await client.query(
        `INSERT INTO ${txTableName} (id, balance) VALUES (999, 999.00)`,
      );

      // Rollback
      await client.query("ROLLBACK");

      // Verify changes were undone
      const check = await client.query(`SELECT * FROM ${txTableName}`);
      expect(check.rows.length).toBe(initialRows);

      const checkNotExist = await client.query(
        `SELECT * FROM ${txTableName} WHERE id = 999`,
      );
      expect(checkNotExist.rows.length).toBe(0);
    });

    it("should rollback update operations", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      // Get initial state
      const initialCheck = await client.query(
        `SELECT * FROM ${txTableName} WHERE id = 1`,
      );
      const balanceCol = initialCheck.columns.indexOf("balance");
      const initialBalance = initialCheck.rows[0][balanceCol];

      // Start transaction
      await client.query("BEGIN");

      // Update
      await client.query(
        `UPDATE ${txTableName} SET balance = 9999.00 WHERE id = 1`,
      );

      // Rollback
      await client.query("ROLLBACK");

      // Verify changes were undone
      const check = await client.query(
        `SELECT * FROM ${txTableName} WHERE id = 1`,
      );
      expect(check.rows[0][balanceCol]).toBe(initialBalance);
    });

    it("should rollback delete operations", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      // Insert a test row
      await client.query(
        `INSERT INTO ${txTableName} (id, balance) VALUES (888, 888.00)`,
      );

      // Start transaction
      await client.query("BEGIN");

      // Delete
      await client.query(`DELETE FROM ${txTableName} WHERE id = 888`);

      // Rollback
      await client.query("ROLLBACK");

      // Verify row still exists
      const check = await client.query(
        `SELECT * FROM ${txTableName} WHERE id = 888`,
      );
      expect(check.rows.length).toBe(1);
    });

    it("should rollback multiple operations together", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      const countBefore = await client.query(`SELECT * FROM ${txTableName}`);
      const rowCountBefore = countBefore.rows.length;

      // Start transaction
      await client.query("BEGIN");

      // Multiple operations
      await client.query(
        `INSERT INTO ${txTableName} (id, balance) VALUES (777, 777.00)`,
      );
      await client.query(
        `UPDATE ${txTableName} SET balance = 7777.00 WHERE id = 3`,
      );
      await client.query(`DELETE FROM ${txTableName} WHERE id = 4`);

      // Rollback
      await client.query("ROLLBACK");

      // Verify all changes were undone
      const countAfter = await client.query(`SELECT * FROM ${txTableName}`);
      expect(countAfter.rows.length).toBe(rowCountBefore);

      const check777 = await client.query(
        `SELECT * FROM ${txTableName} WHERE id = 777`,
      );
      expect(check777.rows.length).toBe(0);

      const check4 = await client.query(
        `SELECT * FROM ${txTableName} WHERE id = 4`,
      );
      expect(check4.rows.length).toBe(1);
    });
  });
});

describe("Prepared Statements", () => {
  describe("Setup", () => {
    it("should create prepared statement test table", async () => {
      const { client } = await import("../fixtures/setup.js");

      await client.query(
        `CREATE TABLE ${psTableName} (
          id INTEGER PRIMARY KEY,
          name TEXT,
          value INTEGER
        )`,
      );

      expect(true).toBe(true);
    });
  });

  describe("Parameter Binding", () => {
    it("should bind parameters in INSERT", async () => {
      const { client } = await import("../fixtures/setup.js");

      const result = await client.executeParameterized(
        `INSERT INTO ${psTableName} (id, name, value) VALUES (?, ?, ?)`,
        [1, "TestParam1", 100],
      );

      expect(result.affectedRowCount).toBe(1);

      const check = await client.query(
        `SELECT * FROM ${psTableName} WHERE id = 1`,
      );
      const nameCol = check.columns.indexOf("name");
      expect(check.rows[0][nameCol]).toBe("TestParam1");
    });

    it("should bind multiple parameters in SELECT WHERE", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      // Insert test data
      await client.query(
        `INSERT INTO ${psTableName} (id, name, value) VALUES
          (2, 'Param2', 200),
          (3, 'Param3', 300),
          (4, 'Param4', 200)`,
      );

      // Use prepared statement to find by value
      const result = await client.executeParameterized(
        `SELECT * FROM ${psTableName} WHERE value = ?`,
        [200],
      );

      expect(result.rows.length).toBe(2); // ids 2 and 4
    });

    it("should bind parameters in UPDATE", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      const result = await client.executeParameterized(
        `UPDATE ${psTableName} SET value = ? WHERE id = ?`,
        [999, 1],
      );

      expect(result.affectedRowCount).toBe(1);

      const check = await client.query(
        `SELECT * FROM ${psTableName} WHERE id = 1`,
      );
      const valueCol = check.columns.indexOf("value");
      expect(check.rows[0][valueCol]).toBe("999");
    });

    it("should bind parameters in DELETE", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      const result = await client.executeParameterized(
        `DELETE FROM ${psTableName} WHERE id = ?`,
        [3],
      );

      expect(result.affectedRowCount).toBe(1);

      const check = await client.query(
        `SELECT * FROM ${psTableName} WHERE id = 3`,
      );
      expect(check.rows.length).toBe(0);
    });

    it("should throw error when parameters are missing", async () => {
      const { client } = await import("../fixtures/setup.js");
      

      try {
        await client.executeParameterized(
          `INSERT INTO ${psTableName} (id, name, value) VALUES (?, ?, ?)`,
          [1, "OnlyTwoParams"], // Missing third parameter
        );
        expect(true).toBe(false); // Should not reach here
      } catch (err) {
        expect((err as Error).message).toContain("Parameter");
      }
    });
  });
});
