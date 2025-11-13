# Implementation Checklist

Track implementation progress of SQLite features. Update this file as features are completed.

## Core SQL Features

### SELECT Operations
- [x] SELECT * (all columns)
- [x] SELECT specific columns
- [x] SELECT with qualified column names (table.column)
- [ ] SELECT DISTINCT
- [ ] SELECT with CASE expressions
- [ ] SELECT with subqueries
- [ ] SELECT ... UNION / UNION ALL

### Filtering & Aggregation
- [x] WHERE clause (basic conditions)
- [x] WHERE with comparison operators (=, !=, <>, <, >, <=, >=)
- [x] WHERE with AND/OR logic
- [x] WHERE with IS NULL / IS NOT NULL
- [x] WHERE with LIKE operator (basic pattern matching)
- [ ] WHERE with IN operator
- [ ] WHERE with BETWEEN operator
- [ ] WHERE with subqueries
- [ ] GROUP BY clause
- [ ] HAVING clause
- [ ] Aggregate functions (COUNT, SUM, AVG, MIN, MAX)

### Ordering & Pagination
- [x] ORDER BY (single column)
- [ ] ORDER BY (multiple columns)
- [x] ORDER BY DESC/ASC
- [x] LIMIT clause
- [x] OFFSET clause

### JOINs
- [ ] INNER JOIN
- [ ] LEFT JOIN
- [ ] RIGHT JOIN
- [ ] FULL OUTER JOIN
- [ ] Cross joins with multiple tables in FROM

## Data Modification

### INSERT
- [x] INSERT with explicit columns
- [x] INSERT with all columns
- [x] INSERT multiple rows
- [ ] INSERT ... SELECT
- [x] Prepared statements with parameters

### UPDATE
- [x] UPDATE single row with WHERE
- [x] UPDATE multiple rows with WHERE
- [x] UPDATE multiple columns
- [x] UPDATE with expressions (e.g., salary + 1000)
- [ ] UPDATE with JOINs
- [ ] UPDATE with subqueries
- [x] Prepared statements with parameters

### DELETE
- [x] DELETE single row with WHERE
- [x] DELETE multiple rows with WHERE
- [ ] DELETE with subqueries
- [x] Prepared statements with parameters

## Transactions

- [x] BEGIN TRANSACTION
- [x] COMMIT
- [ ] ROLLBACK (broken - needs proper implementation)
- [ ] SAVEPOINT
- [ ] Transaction isolation levels

## DDL/Schema Operations

### CREATE TABLE
- [x] CREATE TABLE with column definitions
- [x] CREATE TABLE IF NOT EXISTS
- [x] Column constraints (PRIMARY KEY, NOT NULL, UNIQUE)
- [ ] DEFAULT values (parser supports, executor doesn't)
- [ ] CHECK constraints
- [ ] Foreign key constraints

### ALTER TABLE
- [ ] ALTER TABLE ADD COLUMN
- [ ] ALTER TABLE DROP COLUMN
- [ ] ALTER TABLE MODIFY COLUMN
- [ ] ALTER TABLE RENAME COLUMN

### DROP TABLE
- [ ] DROP TABLE
- [ ] DROP TABLE IF EXISTS

### Indexes
- [ ] CREATE INDEX
- [ ] DROP INDEX

## Built-in Functions

### String Functions
- [x] UPPER()
- [x] LOWER()
- [x] LENGTH() / LEN()
- [x] TRIM()
- [x] SUBSTR() / SUBSTRING()
- [ ] LTRIM()
- [ ] RTRIM()
- [ ] REPLACE()
- [ ] INSTR()
- [ ] CONCAT()

### Math Functions
- [x] ABS()
- [x] ROUND()
- [ ] FLOOR()
- [ ] CEIL()
- [ ] POWER()
- [ ] SQRT()
- [ ] MOD()

### Aggregate Functions
- [ ] COUNT()
- [ ] SUM()
- [ ] AVG()
- [ ] MIN()
- [ ] MAX()
- [ ] GROUP_CONCAT()

### Date/Time Functions
- [ ] DATE()
- [ ] TIME()
- [ ] DATETIME()
- [ ] STRFTIME()
- [ ] JULIANDAY()

### Other Functions
- [x] COALESCE()
- [ ] IFNULL()
- [ ] NULLIF()
- [ ] CAST()

## Type System

- [x] String type handling
- [x] Number type handling (integer & float)
- [x] NULL type handling
- [ ] BOOLEAN type (currently stored as integer)
- [ ] Type coercion in expressions
- [ ] Type inference for dynamic columns
- [ ] CAST operator for explicit conversion

## Query Features

- [x] Parameter binding with ?
- [ ] Named parameters (:name, @name, $name)
- [x] Expression evaluation in WHERE
- [ ] Expression evaluation in SELECT
- [x] Qualified column names (table.column)
- [ ] Table aliases
- [ ] Column aliases
- [ ] Subqueries in FROM
- [ ] Subqueries in WHERE
- [ ] Common Table Expressions (WITH clause)

## System Features

### Information Schema
- [ ] INFORMATION_SCHEMA tables
- [ ] sqlite_master table
- [ ] Schema introspection queries
- [ ] DESCRIBE / PRAGMA queries

### Performance
- [ ] Query optimization
- [ ] Index usage
- [ ] Query execution plans
- [ ] Performance metrics

### Concurrency
- [x] LockService for concurrent requests
- [x] Request isolation
- [ ] Proper transaction isolation
- [ ] Deadlock detection

## Error Handling

- [x] SQL parse errors
- [x] Constraint violations (basic)
- [x] Table not found
- [x] Column not found
- [ ] Duplicate key errors
- [ ] Type mismatch errors
- [ ] Division by zero handling
- [ ] Better error messages with line/column info

## Testing & Documentation

- [x] Integration tests for UPDATE/DELETE/Transactions
- [x] Integration tests for prepared statements
- [ ] Integration tests for GROUP BY/aggregates
- [ ] Integration tests for JOINs
- [ ] Unit tests for expression evaluation
- [ ] Performance benchmarks
- [ ] API documentation
- [ ] SQL dialect documentation

## Known Issues

- [ ] ROLLBACK doesn't properly restore deleted rows (transaction isolation broken)
- [ ] Decimal tokenization edge cases (currently fixed but may have regressions)
- [ ] Type coercion inconsistencies (string vs number comparisons)
- [ ] No query optimization for large datasets
- [ ] No index support (all queries do table scans)

## Priority for Implementation

### High Priority (MVP Completion)
1. GROUP BY / HAVING + aggregate functions (COUNT, SUM, AVG, MIN, MAX)
2. DISTINCT keyword
3. IN operator
4. Better NULL handling edge cases
5. Fix ROLLBACK properly

### Medium Priority (Common Queries)
1. INNER JOIN support
2. INSERT ... SELECT
3. Subqueries in WHERE
4. BETWEEN operator
5. Table/column aliases

### Low Priority (Advanced Features)
1. OUTER JOINs
2. CTEs (WITH clause)
3. Window functions
4. Full text search
5. JSON functions
