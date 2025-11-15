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
  private parameterCount = 0;

  /**
   * Strip quotes from SQL identifier (table/column names)
   * Handles double quotes ("table"), backticks (`table`), and square brackets ([table])
   */
  private stripQuotes(identifier: string): string {
    if (!identifier)
      return identifier;

    // Remove surrounding quotes (", `, or [])
    if ((identifier.startsWith("\"") && identifier.endsWith("\""))
      || (identifier.startsWith("`") && identifier.endsWith("`"))
      || (identifier.startsWith("[") && identifier.endsWith("]"))) {
      return identifier.slice(1, -1);
    }

    return identifier;
  }

  /**
   * Parse SQL string into AST.
   */
  parse(sql: string): SQLStatement[] {
    this.tokens = this.tokenize(sql.trim());
    this.current = 0;
    this.parameterCount = 0;

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
      if (char === "'" || char === `"`) {
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

      // Handle multi-char operators
      if (i + 1 < sql.length) {
        const twoChar = sql.substring(i, i + 2);
        if (["<=", ">=", "<>", "!=", "=="].includes(twoChar)) {
          tokens.push(twoChar);
          i += 2;
          continue;
        }
      }

      // Handle numbers (including decimals)
      if (/\d/.test(char)) {
        let j = i;
        while (j < sql.length && /[\d.]/.test(sql[j])) {
          j++;
        }
        tokens.push(sql.substring(i, j));
        i = j;
        continue;
      }

      // Handle words and identifiers (including hyphens and dots for qualified names)
      if (/[a-z_]/i.test(char)) {
        let j = i;
        while (j < sql.length && /[\w.-]/.test(sql[j])) {
          j++;
        }
        tokens.push(sql.substring(i, j));
        i = j;
        continue;
      }

      // Handle single-char operators
      if (/[(),;?<>=+*/]/.test(char)) {
        tokens.push(char);
        i++;
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

  /**
   * Parse a SELECT column expression - could be column, qualified name, or function call
   */
  private parseSelectExpression(): any {
    const token = this.peek();

    if (!token) {
      throw new Error("Expected expression in SELECT");
    }

    // Check for function call (e.g., COUNT, SUM, AVG, etc.)
    const upperToken = token.toUpperCase();
    if (["COUNT", "SUM", "AVG", "MIN", "MAX", "UPPER", "LOWER", "LENGTH", "TRIM", "SUBSTR", "SUBSTRING", "ABS", "ROUND", "COALESCE"].includes(upperToken)) {
      const funcName = this.advance()!;
      this.consume("(", "Expected ( after function name");

      const args = [];
      if (this.peek() === "*") {
        // COUNT(*) special case
        this.advance();
      }
      else {
        while (this.peek() !== ")") {
          const argToken = this.peek();
          if (!argToken) {
            throw new Error("Unexpected end of expression in function arguments");
          }

          // Parse argument as column reference or expression
          const argName = this.advance()!;
          args.push({
            type: "COLUMN",
            name: argName,
          });

          if (this.peek() === ",") {
            this.advance();
          }
        }
      }

      this.consume(")", "Expected ) after function arguments");

      return {
        type: "FUNCTION",
        name: funcName,
        args,
      };
    }

    // Otherwise, parse as column (could be qualified like table.column)
    const colName = this.stripQuotes(this.advance()!);
    return {
      type: "COLUMN",
      name: colName,
    };
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

    const tableName = this.stripQuotes(this.advance()!);
    this.consume("(", "Expected (");

    const columns: CreateTableStatement["columns"] = [];

    while (this.peek() !== ")") {
      const colName = this.stripQuotes(this.advance()!);
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

    // Parse columns
    const columns: any[] = [];
    if (this.peek() === "*") {
      this.advance();
      columns.push({ expr: { type: "STAR" } as const });
    }
    else {
      // Parse specific columns: col1, col2, COUNT(*), SUM(salary), COUNT(*) as count, etc.
      while (true) {
        const colToken = this.peek();
        if (!colToken || colToken.toUpperCase() === "FROM") {
          break;
        }

        // Parse column expression - could be column name, qualified name, or function
        const expr = this.parseSelectExpression();
        let alias: string | undefined;

        // Check for AS alias
        if (this.peek()?.toUpperCase() === "AS") {
          this.advance();
          alias = this.advance()!;
        }
        else if (this.peek() && !this.peek()!.match(/^[,()]/)) {
          // Implicit alias (no AS keyword) - but only if next token isn't a comma or FROM
          const nextToken = this.peek()?.toUpperCase();
          if (nextToken && nextToken !== "FROM" && nextToken !== "WHERE" && nextToken !== "GROUP" && nextToken !== "ORDER" && nextToken !== "LIMIT" && nextToken !== "OFFSET") {
            alias = this.advance()!;
          }
        }

        columns.push({
          expr,
          alias,
        });

        // Check for comma (multiple columns)
        if (this.peek() === ",") {
          this.advance();
        }
        else {
          break;
        }
      }

      if (columns.length === 0) {
        throw new Error("Expected at least one column in SELECT");
      }
    }

    this.consume("FROM", "Expected FROM");
    const tableName = this.stripQuotes(this.advance()!);

    // Parse WHERE clause
    let where;
    if (this.peek()?.toUpperCase() === "WHERE") {
      this.advance();
      where = {
        expr: this.parseLogicalOr(),
      };
    }

    // Parse GROUP BY clause
    let groupBy;
    if (this.peek()?.toUpperCase() === "GROUP") {
      this.advance();
      this.consume("BY", "Expected BY");
      groupBy = [];
      while (true) {
        groupBy.push(this.advance()!);
        if (this.peek() !== ",")
          break;
        this.advance();
      }
    }

    // Parse HAVING clause
    let having;
    if (this.peek()?.toUpperCase() === "HAVING") {
      this.advance();
      having = this.parseLogicalOr();
    }

    // Parse ORDER BY clause
    let orderBy;
    if (this.peek()?.toUpperCase() === "ORDER") {
      this.advance();
      this.consume("BY", "Expected BY");
      orderBy = [];
      while (true) {
        const column = this.advance()!;
        const desc = this.peek()?.toUpperCase() === "DESC";
        if (desc) {
          this.advance();
        }
        else if (this.peek()?.toUpperCase() === "ASC") {
          this.advance();
        }
        orderBy.push({ column, desc: !!desc });
        if (this.peek() !== ",")
          break;
        this.advance();
      }
    }

    // Parse LIMIT clause
    let limit;
    if (this.peek()?.toUpperCase() === "LIMIT") {
      this.advance();
      limit = Number.parseInt(this.advance()!);
    }

    // Parse OFFSET clause
    let offset;
    if (this.peek()?.toUpperCase() === "OFFSET") {
      this.advance();
      offset = Number.parseInt(this.advance()!);
    }

    return {
      type: "SELECT",
      stmt: {
        columns,
        from: tableName,
        where,
        groupBy,
        having,
        orderBy,
        limit,
        offset,
      },
    };
  }

  private parseInsert(): SQLStatement {
    this.consume("INSERT", "Expected INSERT");
    this.consume("INTO", "Expected INTO");

    const tableName = this.stripQuotes(this.advance()!);

    let columns: string[] | undefined;
    if (this.peek() === "(") {
      this.advance();
      columns = [];
      while (this.peek() !== ")") {
        columns.push(this.stripQuotes(this.advance()!));
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
    const tableName = this.stripQuotes(this.advance()!);
    this.consume("SET", "Expected SET");

    const assignments: any[] = [];
    while (true) {
      const column = this.stripQuotes(this.advance()!);
      this.consume("=", "Expected =");
      // Parse assignment value as expression (supports parameters, functions, etc)
      const value = this.parseAdditive();
      assignments.push({ column, value });

      if (this.peek() === ",") {
        this.advance();
      }
      else {
        break;
      }
    }

    // Parse WHERE clause
    let where;
    if (this.peek()?.toUpperCase() === "WHERE") {
      this.advance();
      where = {
        expr: this.parseLogicalOr(),
      };
    }

    return {
      type: "UPDATE",
      stmt: {
        table: tableName,
        assignments,
        where,
      },
    };
  }

  private parseDelete(): SQLStatement {
    this.consume("DELETE", "Expected DELETE");
    this.consume("FROM", "Expected FROM");
    const tableName = this.stripQuotes(this.advance()!);

    // Parse WHERE clause
    let where;
    if (this.peek()?.toUpperCase() === "WHERE") {
      this.advance();
      where = {
        expr: this.parseLogicalOr(),
      };
    }

    return {
      type: "DELETE",
      stmt: {
        table: tableName,
        where,
      },
    };
  }

  /**
   * Expression parsing using operator precedence (recursive descent)
   * Precedence (lowest to highest):
   * 1. OR
   * 2. AND
   * 3. =, !=, <>, <, >, <=, >=, LIKE, IN, IS
   * 4. +, -
   * 5. *, /
   * 6. Primary (literals, columns, parens, functions)
   */

  private parseLogicalOr(): any {
    let expr = this.parseLogicalAnd();

    while (this.peek()?.toUpperCase() === "OR") {
      this.advance();
      const right = this.parseLogicalAnd();
      expr = {
        type: "BINARY_OP",
        op: "OR",
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseLogicalAnd(): any {
    let expr = this.parseComparison();

    while (this.peek()?.toUpperCase() === "AND") {
      this.advance();
      const right = this.parseComparison();
      expr = {
        type: "BINARY_OP",
        op: "AND",
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseComparison(): any {
    let expr = this.parseAdditive();

    const op = this.peek()?.toUpperCase();
    if (
      op === "="
      || op === "!="
      || op === "<>"
      || op === "<"
      || op === ">"
      || op === "<="
      || op === ">="
      || op === "LIKE"
      || op === "IN"
      || op === "IS"
    ) {
      this.advance();

      // Handle IS NULL / IS NOT NULL specially
      if (op === "IS") {
        const notToken = this.peek()?.toUpperCase();
        if (notToken === "NOT") {
          this.advance(); // consume NOT
          const right = this.parsePrimary(); // Parse NULL
          expr = {
            type: "BINARY_OP",
            op: "IS NOT",
            left: expr,
            right,
          };
        }
        else {
          const right = this.parseAdditive();
          expr = {
            type: "BINARY_OP",
            op,
            left: expr,
            right,
          };
        }
      }
      else {
        const right = this.parseAdditive();
        expr = {
          type: "BINARY_OP",
          op,
          left: expr,
          right,
        };
      }
    }

    return expr;
  }

  private parseAdditive(): any {
    let expr = this.parseMultiplicative();

    while (true) {
      const op = this.peek();
      if (op === "+" || op === "-") {
        this.advance();
        const right = this.parseMultiplicative();
        expr = {
          type: "BINARY_OP",
          op,
          left: expr,
          right,
        };
      }
      else {
        break;
      }
    }

    return expr;
  }

  private parseMultiplicative(): any {
    let expr = this.parseUnary();

    while (true) {
      const op = this.peek();
      if (op === "*" || op === "/") {
        this.advance();
        const right = this.parseUnary();
        expr = {
          type: "BINARY_OP",
          op,
          left: expr,
          right,
        };
      }
      else {
        break;
      }
    }

    return expr;
  }

  private parseUnary(): any {
    const op = this.peek();

    if (op === "-" || op === "+") {
      this.advance();
      const expr = this.parseUnary();
      return {
        type: "UNARY_OP",
        op,
        operand: expr,
      };
    }

    if (op?.toUpperCase() === "NOT") {
      this.advance();
      const expr = this.parseUnary();
      return {
        type: "UNARY_OP",
        op: "NOT",
        operand: expr,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): any {
    const token = this.peek();

    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    // Parameter placeholder
    if (token === "?") {
      this.advance();
      return { type: "PARAMETER", position: this.parameterCount++ };
    }

    // Parenthesized expression
    if (token === "(") {
      this.advance();
      const expr = this.parseLogicalOr();
      this.consume(")", "Expected )");
      return {
        type: "PAREN",
        expr,
      };
    }

    // Literal values
    if (token.startsWith("'") || token.startsWith(`"`)) {
      const str = this.advance()!;
      return {
        type: "LITERAL",
        value: str.substring(1, str.length - 1),
      };
    }

    // Numbers
    if (/^\d+(\.\d+)?$/.test(token)) {
      const num = this.advance()!;
      return {
        type: "LITERAL",
        value: /\./.test(num) ? Number.parseFloat(num) : Number.parseInt(num, 10),
      };
    }

    // Keywords as literals
    if (token.toUpperCase() === "NULL") {
      this.advance();
      return { type: "LITERAL", value: null };
    }

    if (token.toUpperCase() === "TRUE") {
      this.advance();
      return { type: "LITERAL", value: true };
    }

    if (token.toUpperCase() === "FALSE") {
      this.advance();
      return { type: "LITERAL", value: false };
    }

    // Function or column
    const name = this.advance()!;

    // Check if it's a function call
    if (this.peek() === "(") {
      this.advance();
      const args = [];

      while (this.peek() !== ")") {
        args.push(this.parseLogicalOr());
        if (this.peek() === ",")
          this.advance();
      }

      this.consume(")", "Expected )");

      return {
        type: "FUNCTION",
        name: name.toUpperCase(),
        args,
      };
    }

    // Column reference
    return {
      type: "COLUMN",
      name: this.stripQuotes(name),
    };
  }

  private parseValue(): any {
    const token = this.peek();

    if (token === "?") {
      this.advance();
      return { type: "PARAMETER", position: this.parameterCount++ };
    }

    if (token?.startsWith("'") || token?.startsWith(`"`)) {
      const str = this.advance()!;
      return str.substring(1, str.length - 1); // Remove quotes
    }

    if (/^\d+$/.test(token || "")) {
      return Number.parseInt(this.advance()!, 10);
    }

    // Handle NULL keyword
    if (token?.toUpperCase() === "NULL") {
      this.advance();
      return null;
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
