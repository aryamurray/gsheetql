/**
 * Hand-rolled SQL parser for MVP.
 * Supports CREATE TABLE, SELECT *, INSERT, UPDATE, DELETE.
 * Minimal parser - enough for MVP testing.
 */

import type { CreateTableStatement, SQLStatement } from "../types/ast.js";
import { logger } from "../utils/logger.js";

export class Parser {
  private tokens: string[] = [];
  private current = 0;

  /**
   * Parse SQL string into AST.
   */
  parse(sql: string): SQLStatement[] {
    this.tokens = this.tokenize(sql.trim());
    this.current = 0;

    const statements: SQLStatement[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    return statements;
  }

  private tokenize(sql: string): string[] {
    // Simple tokenization: split by whitespace and common delimiters
    const tokens: string[] = [];
    let i = 0;

    while (i < sql.length) {
      const char = sql[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Handle strings
      if (char === "'" || char === "\"") {
        const quote = char;
        let j = i + 1;
        while (j < sql.length && sql[j] !== quote) {
          if (sql[j] === "\\")
            j++; // Handle escaped quotes
          j++;
        }
        tokens.push(sql.substring(i, j + 1));
        i = j + 1;
        continue;
      }

      // Handle symbols
      if (/[(),;?]/.test(char)) {
        tokens.push(char);
        i++;
        continue;
      }

      // Handle words and identifiers
      let j = i;
      while (j < sql.length && /\w/.test(sql[j])) {
        j++;
      }

      if (j > i) {
        tokens.push(sql.substring(i, j));
        i = j;
        continue;
      }

      i++;
    }

    return tokens;
  }

  private parseStatement(): SQLStatement | null {
    const keyword = this.peek()?.toUpperCase();

    switch (keyword) {
      case "CREATE":
        return this.parseCreateTable();
      case "SELECT":
        return this.parseSelect();
      case "INSERT":
        return this.parseInsert();
      case "UPDATE":
        return this.parseUpdate();
      case "DELETE":
        return this.parseDelete();
      case "BEGIN":
        this.advance();
        return { type: "BEGIN" };
      case "COMMIT":
        this.advance();
        return { type: "COMMIT" };
      case "ROLLBACK":
        this.advance();
        return { type: "ROLLBACK" };
      default:
        logger.warn(`Unknown statement: ${keyword}`);
        this.advance();
        return null;
    }
  }

  private parseCreateTable(): SQLStatement {
    this.consume("CREATE", "Expected CREATE");
    this.consume("TABLE", "Expected TABLE");

    // Check for IF NOT EXISTS
    let ifNotExists = false;
    if (this.peek()?.toUpperCase() === "IF") {
      this.advance();
      this.consume("NOT", "Expected NOT");
      this.consume("EXISTS", "Expected EXISTS");
      ifNotExists = true;
    }

    const tableName = this.advance()!;
    this.consume("(", "Expected (");

    const columns: CreateTableStatement["columns"] = [];

    while (this.peek() !== ")") {
      const colName = this.advance()!;
      const colType = this.advance()!.toUpperCase();

      let nullable = true;
      let primaryKey = false;
      let unique = false;
      let defaultValue: any;

      // Parse column constraints
      while (this.peek() && this.peek() !== "," && this.peek() !== ")") {
        const constraint = this.peek()!.toUpperCase();

        if (constraint === "NOT") {
          this.advance();
          if (this.peek()?.toUpperCase() === "NULL") {
            this.advance();
            nullable = false;
          }
        }
        else if (constraint === "PRIMARY") {
          this.advance();
          this.consume("KEY", "Expected KEY");
          primaryKey = true;
        }
        else if (constraint === "UNIQUE") {
          this.advance();
          unique = true;
        }
        else if (constraint === "DEFAULT") {
          this.advance();
          defaultValue = this.parseValue();
        }
        else {
          break;
        }
      }

      columns.push({
        name: colName,
        type: colType,
        nullable,
        primaryKey,
        unique,
        defaultValue,
      });

      if (this.peek() === ",") {
        this.advance();
      }
    }

    this.consume(")", "Expected )");
    if (this.peek() === ";") {
      this.advance();
    }

    return {
      type: "CREATE_TABLE",
      stmt: {
        table: tableName,
        columns,
        ifNotExists,
      },
    };
  }

  private parseSelect(): SQLStatement {
    this.consume("SELECT", "Expected SELECT");

    // Simplified: only support SELECT *
    if (this.peek() === "*") {
      this.advance();
    }

    this.consume("FROM", "Expected FROM");
    const tableName = this.advance()!;

    return {
      type: "SELECT",
      stmt: {
        columns: [{ expr: { type: "STAR" } }],
        from: tableName,
      },
    };
  }

  private parseInsert(): SQLStatement {
    this.consume("INSERT", "Expected INSERT");
    this.consume("INTO", "Expected INTO");

    const tableName = this.advance()!;

    let columns: string[] | undefined;
    if (this.peek() === "(") {
      this.advance();
      columns = [];
      while (this.peek() !== ")") {
        columns.push(this.advance()!);
        if (this.peek() === ",")
          this.advance();
      }
      this.consume(")", "Expected )");
    }

    this.consume("VALUES", "Expected VALUES");

    const values: any[] = [];
    while (this.peek() === "(") {
      this.advance();
      const row = [];
      while (this.peek() !== ")") {
        row.push(this.parseValue());
        if (this.peek() === ",")
          this.advance();
      }
      this.consume(")", "Expected )");
      values.push(row);

      if (this.peek() === ",") {
        this.advance();
      }
    }

    return {
      type: "INSERT",
      stmt: {
        table: tableName,
        columns,
        values,
      },
    };
  }

  private parseUpdate(): SQLStatement {
    this.consume("UPDATE", "Expected UPDATE");
    const tableName = this.advance()!;
    this.consume("SET", "Expected SET");

    const assignments: any[] = [];
    while (true) {
      const column = this.advance()!;
      this.consume("=", "Expected =");
      const value = this.parseValue();
      assignments.push({ column, value: { type: "LITERAL", value } });

      if (this.peek() === ",") {
        this.advance();
      }
      else {
        break;
      }
    }

    return {
      type: "UPDATE",
      stmt: {
        table: tableName,
        assignments,
      },
    };
  }

  private parseDelete(): SQLStatement {
    this.consume("DELETE", "Expected DELETE");
    this.consume("FROM", "Expected FROM");
    const tableName = this.advance()!;

    return {
      type: "DELETE",
      stmt: {
        table: tableName,
      },
    };
  }

  private parseValue(): any {
    const token = this.peek();

    if (token === "?") {
      this.advance();
      return { type: "PARAMETER", position: 0 };
    }

    if (token?.startsWith("'") || token?.startsWith("\"")) {
      const str = this.advance()!;
      return str.substring(1, str.length - 1); // Remove quotes
    }

    if (/^\d+$/.test(token || "")) {
      return Number.parseInt(this.advance()!, 10);
    }

    return this.advance();
  }

  private peek(): string | undefined {
    return this.tokens[this.current];
  }

  private advance(): string | undefined {
    return this.tokens[this.current++];
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private consume(expected: string, message: string): string {
    const token = this.peek();
    if (token?.toUpperCase() !== expected.toUpperCase()) {
      throw new Error(`${message}, got ${token}`);
    }
    return this.advance()!;
  }
}

export const parser = new Parser();
