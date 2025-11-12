function doGet() {
}
function doPost() {
}
function onEdit() {
}
function onInstall() {
}
function onOpen() {
}/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./build/adapter/sheets.js":
/*!*********************************!*\
  !*** ./build/adapter/sheets.js ***!
  \*********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SheetsAdapter: () => (/* binding */ SheetsAdapter)
/* harmony export */ });
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * Google Sheets API adapter.
 * Batch operations only (never cell-by-cell).
 */
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

class SheetsAdapter {
    constructor(config) {
        this.spreadsheet = config.spreadsheet;
    }
    /**
     * Get sheet by name. Throws if not found.
     */
    getSheet(tableName) {
        const sheet = this.spreadsheet.getSheetByName(tableName);
        if (!sheet) {
            throw new Error(`Sheet not found: ${tableName}`);
        }
        return sheet;
    }
    /**
     * Read all data from a sheet as 2D array (synchronous).
     * First row (header) is included.
     */
    readRangeSync(tableName) {
        try {
            const sheet = this.getSheet(tableName);
            const range = sheet.getDataRange();
            const values = range.getValues();
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.debug(`Read ${values.length} rows from ${tableName}`);
            return values;
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.error(`Failed to read from ${tableName}`, err);
            throw err;
        }
    }
    /**
     * Write rows to a sheet, replacing from startRow (synchronous).
     * startRow is 1-indexed.
     */
    writeRangeSync(tableName, startRow, values) {
        var _a;
        if (values.length === 0) {
            return;
        }
        try {
            const sheet = this.getSheet(tableName);
            const numRows = values.length;
            const numCols = ((_a = values[0]) === null || _a === void 0 ? void 0 : _a.length) || 1;
            const range = sheet.getRange(startRow, 1, numRows, numCols);
            range.setValues(values);
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.debug(`Wrote ${numRows} rows to ${tableName} starting at row ${startRow}`);
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.error(`Failed to write to ${tableName}`, err);
            throw err;
        }
    }
    /**
     * Append rows to end of sheet (synchronous).
     */
    appendRowsSync(tableName, rows) {
        if (rows.length === 0) {
            return;
        }
        try {
            const sheet = this.getSheet(tableName);
            for (const row of rows) {
                sheet.appendRow(row);
            }
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.debug(`Appended ${rows.length} rows to ${tableName}`);
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.error(`Failed to append to ${tableName}`, err);
            throw err;
        }
    }
    /**
     * Delete rows by indices (1-indexed).
     * Deletes in reverse order to maintain index stability.
     */
    deleteRows(tableName, rowIndices) {
        return __awaiter(this, void 0, void 0, function* () {
            if (rowIndices.length === 0) {
                return 0;
            }
            try {
                const sheet = this.getSheet(tableName);
                const sorted = [...rowIndices].sort((a, b) => b - a);
                for (const rowIndex of sorted) {
                    sheet.deleteRow(rowIndex);
                }
                _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.debug(`Deleted ${sorted.length} rows from ${tableName}`);
                return sorted.length;
            }
            catch (err) {
                _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.error(`Failed to delete from ${tableName}`, err);
                throw err;
            }
        });
    }
    /**
     * Create a new sheet with header row.
     */
    createSheet(tableName, columns) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sheet = this.spreadsheet.insertSheet(tableName);
                sheet.appendRow(columns);
                _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.debug(`Created sheet ${tableName} with ${columns.length} columns`);
                return sheet;
            }
            catch (err) {
                _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.error(`Failed to create sheet ${tableName}`, err);
                throw err;
            }
        });
    }
    /**
     * Check if sheet exists.
     */
    sheetExists(tableName) {
        return this.spreadsheet.getSheetByName(tableName) !== null;
    }
    /**
     * Get sheet ID (useful for schema storage).
     */
    getSheetId(tableName) {
        const sheet = this.getSheet(tableName);
        return sheet.getSheetId();
    }
}


/***/ }),

/***/ "./build/executor/create.js":
/*!**********************************!*\
  !*** ./build/executor/create.js ***!
  \**********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CreateTableExecutor: () => (/* binding */ CreateTableExecutor)
/* harmony export */ });
/* harmony import */ var _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../adapter/sheets.js */ "./build/adapter/sheets.js");
/* harmony import */ var _schema_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../schema/manager.js */ "./build/schema/manager.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * CREATE TABLE executor.
 */



class CreateTableExecutor {
    constructor(context) {
        this.context = context;
    }
    executeSync(stmt) {
        const { table, columns, ifNotExists } = stmt;
        try {
            const adapter = new _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__.SheetsAdapter({
                spreadsheet: this.context.spreadsheet,
            });
            const schemaManager = new _schema_manager_js__WEBPACK_IMPORTED_MODULE_1__.SchemaManager({
                spreadsheet: this.context.spreadsheet,
            });
            // Check if table exists
            const exists = adapter.sheetExists(table);
            if (exists) {
                if (ifNotExists) {
                    _utils_logger_js__WEBPACK_IMPORTED_MODULE_2__.logger.info(`Table ${table} already exists, skipping CREATE`);
                    return {
                        columns: [],
                        rows: [],
                        affectedRowCount: 0,
                    };
                }
                throw new Error(`Table ${table} already exists`);
            }
            // Create sheet and add header row
            const columnNames = columns.map(c => c.name);
            adapter.createSheet(table, columnNames);
            // Build schema and persist
            const sheetId = adapter.getSheetId(table);
            const now = Math.floor(Date.now() / 1000);
            const schema = {
                name: table,
                sheetId,
                version: 1,
                createdAt: now,
                updatedAt: now,
                columns: columns.map(col => ({
                    name: col.name,
                    type: col.type.toUpperCase() || "TEXT",
                    nullable: col.nullable !== false,
                    primaryKey: col.primaryKey,
                    unique: col.unique,
                    defaultValue: col.defaultValue,
                })),
            };
            schemaManager.persistSchemaSync(schema);
            this.context.schemas.set(table, schema);
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_2__.logger.info(`Created table ${table} with ${columns.length} columns`);
            return {
                columns: [],
                rows: [],
                affectedRowCount: 0,
            };
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_2__.logger.error(`CREATE TABLE failed for ${table}`, err);
            throw err;
        }
    }
}


/***/ }),

/***/ "./build/executor/insert.js":
/*!**********************************!*\
  !*** ./build/executor/insert.js ***!
  \**********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   InsertExecutor: () => (/* binding */ InsertExecutor)
/* harmony export */ });
/* harmony import */ var _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../adapter/sheets.js */ "./build/adapter/sheets.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * INSERT statement executor.
 */


class InsertExecutor {
    constructor(context) {
        this.context = context;
    }
    executeSync(stmt) {
        var _a;
        const { table, columns, values } = stmt;
        try {
            const adapter = new _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__.SheetsAdapter({
                spreadsheet: this.context.spreadsheet,
            });
            // Check table exists
            if (!adapter.sheetExists(table)) {
                throw new Error(`Table ${table} does not exist`);
            }
            // Read schema for the table
            const schema = this.context.schemas.get(table);
            if (!schema) {
                throw new Error(`Schema for table ${table} not found`);
            }
            // Get current data to find last row
            const currentData = adapter.readRangeSync(table);
            const headerRow = currentData[0] || [];
            // Build rows to insert
            const rowsToInsert = [];
            for (const valueRow of values) {
                const insertedRow = [];
                if (columns) {
                    // Map specified columns to values
                    const row = new Array(headerRow.length).fill("");
                    for (let i = 0; i < columns.length; i++) {
                        const colName = columns[i];
                        const colIndex = headerRow.indexOf(colName);
                        if (colIndex === -1) {
                            throw new Error(`Column ${colName} not found in table ${table}`);
                        }
                        row[colIndex] = String((_a = valueRow[i]) !== null && _a !== void 0 ? _a : "");
                    }
                    insertedRow.push(...row);
                }
                else {
                    // All columns in order
                    if (valueRow.length !== headerRow.length) {
                        throw new Error(`Expected ${headerRow.length} values, got ${valueRow.length}`);
                    }
                    insertedRow.push(...valueRow.map((v) => String(v !== null && v !== void 0 ? v : "")));
                }
                rowsToInsert.push(insertedRow);
            }
            // Append rows to sheet
            adapter.appendRowsSync(table, rowsToInsert);
            // Return result
            const lastInsertRowId = currentData.length + rowsToInsert.length;
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.info(`Inserted ${rowsToInsert.length} rows into ${table}`);
            return {
                columns: [],
                rows: [],
                affectedRowCount: rowsToInsert.length,
                lastInsertRowId,
            };
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.error(`INSERT failed for ${table}`, err);
            throw err;
        }
    }
}


/***/ }),

/***/ "./build/executor/select.js":
/*!**********************************!*\
  !*** ./build/executor/select.js ***!
  \**********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SelectExecutor: () => (/* binding */ SelectExecutor)
/* harmony export */ });
/* harmony import */ var _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../adapter/sheets.js */ "./build/adapter/sheets.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * SELECT statement executor.
 * Supports: SELECT *, WHERE, ORDER BY, LIMIT, OFFSET
 */


class SelectExecutor {
    constructor(context) {
        this.context = context;
    }
    executeSync(stmt) {
        const { from: tableName, where, orderBy, limit, offset } = stmt;
        try {
            const adapter = new _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__.SheetsAdapter({
                spreadsheet: this.context.spreadsheet,
            });
            // Check table exists
            if (!adapter.sheetExists(tableName)) {
                throw new Error(`Table ${tableName} does not exist`);
            }
            // Read all data
            const allData = adapter.readRangeSync(tableName);
            if (allData.length === 0) {
                throw new Error(`Table ${tableName} is empty`);
            }
            const headers = allData[0];
            let rows = allData.slice(1);
            // Apply WHERE filter
            if (where) {
                rows = this.filterRows(rows, headers, where);
            }
            // Apply ORDER BY
            if (orderBy && orderBy.length > 0) {
                rows = this.sortRows(rows, headers, orderBy);
            }
            // Apply OFFSET
            if (offset && offset > 0) {
                rows = rows.slice(offset);
            }
            // Apply LIMIT
            if (limit && limit > 0) {
                rows = rows.slice(0, limit);
            }
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.info(`Selected ${rows.length} rows from ${tableName}`);
            return {
                columns: headers,
                rows: rows,
                affectedRowCount: 0,
            };
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.error(`SELECT failed for ${tableName}`, err);
            throw err;
        }
    }
    filterRows(rows, headers, where) {
        return rows.filter((row) => this.isTruthy(this.evaluateExpression(row, headers, where.expr)));
    }
    evaluateExpression(row, headers, expr) {
        if (expr.type === "LITERAL") {
            return expr.value;
        }
        if (expr.type === "COLUMN") {
            return this.getExpressionValue(row, headers, expr);
        }
        if (expr.type === "PAREN") {
            return this.evaluateExpression(row, headers, expr.expr);
        }
        if (expr.type === "UNARY_OP") {
            const val = this.getExpressionValue(row, headers, expr.operand);
            switch (expr.op.toUpperCase()) {
                case "NOT":
                    return !this.isTruthy(val);
                case "-":
                    return -Number(val);
                case "+":
                    return Number(val);
                default:
                    throw new Error(`Unsupported unary operator: ${expr.op}`);
            }
        }
        if (expr.type === "BINARY_OP") {
            const op = expr.op.toUpperCase();
            // Logical operators
            if (op === "AND") {
                return (this.isTruthy(this.evaluateExpression(row, headers, expr.left)) &&
                    this.isTruthy(this.evaluateExpression(row, headers, expr.right)));
            }
            if (op === "OR") {
                return (this.isTruthy(this.evaluateExpression(row, headers, expr.left)) ||
                    this.isTruthy(this.evaluateExpression(row, headers, expr.right)));
            }
            // Comparison operators
            const leftVal = this.getExpressionValue(row, headers, expr.left);
            const rightVal = this.getExpressionValue(row, headers, expr.right);
            switch (op) {
                case "=":
                    return leftVal === rightVal;
                case "!=":
                case "<>":
                    return leftVal !== rightVal;
                case ">":
                    return Number(leftVal) > Number(rightVal);
                case ">=":
                    return Number(leftVal) >= Number(rightVal);
                case "<":
                    return Number(leftVal) < Number(rightVal);
                case "<=":
                    return Number(leftVal) <= Number(rightVal);
                case "LIKE":
                    return String(leftVal).includes(String(rightVal).replace(/%/g, ""));
                case "IS":
                    return leftVal === rightVal;
                case "IS NOT":
                    return leftVal !== rightVal;
                case "+":
                    return Number(leftVal) + Number(rightVal);
                case "-":
                    return Number(leftVal) - Number(rightVal);
                case "*":
                    return Number(leftVal) * Number(rightVal);
                case "/":
                    return Number(leftVal) / Number(rightVal);
                default:
                    throw new Error(`Unsupported operator: ${op}`);
            }
        }
        throw new Error(`Unsupported expression type: ${expr.type}`);
    }
    getExpressionValue(row, headers, expr) {
        if (expr.type === "LITERAL") {
            return expr.value;
        }
        if (expr.type === "COLUMN") {
            const colIndex = headers.indexOf(expr.name);
            if (colIndex === -1) {
                throw new Error(`Column ${expr.name} not found`);
            }
            return row[colIndex];
        }
        if (expr.type === "PAREN") {
            return this.getExpressionValue(row, headers, expr.expr);
        }
        if (expr.type === "UNARY_OP") {
            const val = this.getExpressionValue(row, headers, expr.operand);
            switch (expr.op.toUpperCase()) {
                case "NOT":
                    return !this.isTruthy(val);
                case "-":
                    return -Number(val);
                case "+":
                    return Number(val);
                default:
                    return val;
            }
        }
        if (expr.type === "BINARY_OP") {
            const op = expr.op.toUpperCase();
            const leftVal = this.getExpressionValue(row, headers, expr.left);
            const rightVal = this.getExpressionValue(row, headers, expr.right);
            switch (op) {
                case "+":
                    return Number(leftVal) + Number(rightVal);
                case "-":
                    return Number(leftVal) - Number(rightVal);
                case "*":
                    return Number(leftVal) * Number(rightVal);
                case "/":
                    return Number(rightVal) !== 0 ? Number(leftVal) / Number(rightVal) : null;
                case "AND":
                    return this.isTruthy(leftVal) && this.isTruthy(rightVal);
                case "OR":
                    return this.isTruthy(leftVal) || this.isTruthy(rightVal);
                default:
                    return null;
            }
        }
        if (expr.type === "FUNCTION") {
            return this.evaluateFunction(row, headers, expr);
        }
        throw new Error(`Unsupported expression type: ${expr.type}`);
    }
    evaluateFunction(row, headers, expr) {
        var _a, _b, _c, _d, _e;
        const name = expr.name.toUpperCase();
        const args = expr.args.map((arg) => this.getExpressionValue(row, headers, arg));
        switch (name) {
            case "UPPER":
                return String((_a = args[0]) !== null && _a !== void 0 ? _a : "").toUpperCase();
            case "LOWER":
                return String((_b = args[0]) !== null && _b !== void 0 ? _b : "").toLowerCase();
            case "LENGTH":
            case "LEN":
                return String((_c = args[0]) !== null && _c !== void 0 ? _c : "").length;
            case "TRIM":
                return String((_d = args[0]) !== null && _d !== void 0 ? _d : "").trim();
            case "SUBSTR":
            case "SUBSTRING":
                return String((_e = args[0]) !== null && _e !== void 0 ? _e : "").substring(Number(args[1] || 0), Number(args[2]));
            case "ABS":
                return Math.abs(Number(args[0] || 0));
            case "ROUND":
                return Math.round(Number(args[0] || 0));
            case "COALESCE":
                return args.find((v) => v !== null && v !== undefined && v !== "");
            default:
                throw new Error(`Unsupported function: ${name}`);
        }
    }
    sortRows(rows, headers, orderBy) {
        return rows.sort((a, b) => {
            for (const order of orderBy) {
                const colIndex = headers.indexOf(order.column);
                if (colIndex === -1) {
                    continue;
                }
                const aVal = a[colIndex];
                const bVal = b[colIndex];
                // Try numeric comparison first
                const aNum = Number(aVal);
                const bNum = Number(bVal);
                let cmp = 0;
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    cmp = aNum - bNum;
                }
                else {
                    cmp = String(aVal).localeCompare(String(bVal));
                }
                if (cmp !== 0) {
                    return order.desc ? -cmp : cmp;
                }
            }
            return 0;
        });
    }
    isTruthy(value) {
        if (value === null || value === undefined || value === "") {
            return false;
        }
        if (typeof value === "number") {
            return value !== 0;
        }
        if (typeof value === "boolean") {
            return value;
        }
        return true;
    }
}


/***/ }),

/***/ "./build/parser/parser.js":
/*!********************************!*\
  !*** ./build/parser/parser.js ***!
  \********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Parser: () => (/* binding */ Parser),
/* harmony export */   parser: () => (/* binding */ parser)
/* harmony export */ });
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * Hand-rolled SQL parser for MVP.
 * Supports CREATE TABLE, SELECT *, INSERT, UPDATE, DELETE.
 * Minimal parser - enough for MVP testing.
 */

class Parser {
    constructor() {
        this.tokens = [];
        this.current = 0;
    }
    /**
     * Parse SQL string into AST.
     */
    parse(sql) {
        this.tokens = this.tokenize(sql.trim());
        this.current = 0;
        const statements = [];
        while (!this.isAtEnd()) {
            const stmt = this.parseStatement();
            if (stmt) {
                statements.push(stmt);
            }
        }
        return statements;
    }
    tokenize(sql) {
        // Simple tokenization: split by whitespace and common delimiters
        const tokens = [];
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
                if (["<=", ">=", "<>", "!=", "=="].indexOf(twoChar) !== -1) {
                    tokens.push(twoChar);
                    i += 2;
                    continue;
                }
            }
            // Handle single-char operators
            if (/[(),;?<>=+\-*/]/.test(char)) {
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
    parseStatement() {
        var _a;
        const keyword = (_a = this.peek()) === null || _a === void 0 ? void 0 : _a.toUpperCase();
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
                _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.warn(`Unknown statement: ${keyword}`);
                this.advance();
                return null;
        }
    }
    parseCreateTable() {
        var _a, _b;
        this.consume("CREATE", "Expected CREATE");
        this.consume("TABLE", "Expected TABLE");
        // Check for IF NOT EXISTS
        let ifNotExists = false;
        if (((_a = this.peek()) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === "IF") {
            this.advance();
            this.consume("NOT", "Expected NOT");
            this.consume("EXISTS", "Expected EXISTS");
            ifNotExists = true;
        }
        const tableName = this.advance();
        this.consume("(", "Expected (");
        const columns = [];
        while (this.peek() !== ")") {
            const colName = this.advance();
            const colType = this.advance().toUpperCase();
            let nullable = true;
            let primaryKey = false;
            let unique = false;
            let defaultValue;
            // Parse column constraints
            while (this.peek() && this.peek() !== "," && this.peek() !== ")") {
                const constraint = this.peek().toUpperCase();
                if (constraint === "NOT") {
                    this.advance();
                    if (((_b = this.peek()) === null || _b === void 0 ? void 0 : _b.toUpperCase()) === "NULL") {
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
    parseSelect() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.consume("SELECT", "Expected SELECT");
        // Parse columns (simplified: only support SELECT *)
        const columns = [];
        if (this.peek() === "*") {
            this.advance();
            columns.push({ expr: { type: "STAR" } });
        }
        else {
            // Support SELECT col1, col2, ... in future
            columns.push({ expr: { type: "STAR" } });
        }
        this.consume("FROM", "Expected FROM");
        const tableName = this.advance();
        // Parse WHERE clause
        let where;
        if (((_a = this.peek()) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === "WHERE") {
            this.advance();
            where = {
                expr: this.parseLogicalOr(),
            };
        }
        // Parse GROUP BY clause
        let groupBy;
        if (((_b = this.peek()) === null || _b === void 0 ? void 0 : _b.toUpperCase()) === "GROUP") {
            this.advance();
            this.consume("BY", "Expected BY");
            groupBy = [];
            while (true) {
                groupBy.push(this.advance());
                if (this.peek() !== ",")
                    break;
                this.advance();
            }
        }
        // Parse HAVING clause
        let having;
        if (((_c = this.peek()) === null || _c === void 0 ? void 0 : _c.toUpperCase()) === "HAVING") {
            this.advance();
            having = this.parseLogicalOr();
        }
        // Parse ORDER BY clause
        let orderBy;
        if (((_d = this.peek()) === null || _d === void 0 ? void 0 : _d.toUpperCase()) === "ORDER") {
            this.advance();
            this.consume("BY", "Expected BY");
            orderBy = [];
            while (true) {
                const column = this.advance();
                const desc = ((_e = this.peek()) === null || _e === void 0 ? void 0 : _e.toUpperCase()) === "DESC";
                if (desc) {
                    this.advance();
                }
                else if (((_f = this.peek()) === null || _f === void 0 ? void 0 : _f.toUpperCase()) === "ASC") {
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
        if (((_g = this.peek()) === null || _g === void 0 ? void 0 : _g.toUpperCase()) === "LIMIT") {
            this.advance();
            limit = parseInt(this.advance());
        }
        // Parse OFFSET clause
        let offset;
        if (((_h = this.peek()) === null || _h === void 0 ? void 0 : _h.toUpperCase()) === "OFFSET") {
            this.advance();
            offset = parseInt(this.advance());
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
    parseInsert() {
        this.consume("INSERT", "Expected INSERT");
        this.consume("INTO", "Expected INTO");
        const tableName = this.advance();
        let columns;
        if (this.peek() === "(") {
            this.advance();
            columns = [];
            while (this.peek() !== ")") {
                columns.push(this.advance());
                if (this.peek() === ",")
                    this.advance();
            }
            this.consume(")", "Expected )");
        }
        this.consume("VALUES", "Expected VALUES");
        const values = [];
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
    parseUpdate() {
        this.consume("UPDATE", "Expected UPDATE");
        const tableName = this.advance();
        this.consume("SET", "Expected SET");
        const assignments = [];
        while (true) {
            const column = this.advance();
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
    parseDelete() {
        this.consume("DELETE", "Expected DELETE");
        this.consume("FROM", "Expected FROM");
        const tableName = this.advance();
        return {
            type: "DELETE",
            stmt: {
                table: tableName,
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
    parseLogicalOr() {
        var _a;
        let expr = this.parseLogicalAnd();
        while (((_a = this.peek()) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === "OR") {
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
    parseLogicalAnd() {
        var _a;
        let expr = this.parseComparison();
        while (((_a = this.peek()) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === "AND") {
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
    parseComparison() {
        var _a, _b;
        let expr = this.parseAdditive();
        const op = (_a = this.peek()) === null || _a === void 0 ? void 0 : _a.toUpperCase();
        if (op === "=" ||
            op === "!=" ||
            op === "<>" ||
            op === "<" ||
            op === ">" ||
            op === "<=" ||
            op === ">=" ||
            op === "LIKE" ||
            op === "IN" ||
            op === "IS") {
            this.advance();
            const right = this.parseAdditive();
            expr = {
                type: "BINARY_OP",
                op,
                left: expr,
                right,
            };
            // Handle IS NULL / IS NOT NULL
            if (op === "IS" && ((_b = this.peek()) === null || _b === void 0 ? void 0 : _b.toUpperCase()) === "NOT") {
                this.advance();
                const notNull = this.advance();
                expr = {
                    type: "BINARY_OP",
                    op: "IS NOT",
                    left: expr,
                    right: { type: "LITERAL", value: notNull },
                };
            }
        }
        return expr;
    }
    parseAdditive() {
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
    parseMultiplicative() {
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
    parseUnary() {
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
        if ((op === null || op === void 0 ? void 0 : op.toUpperCase()) === "NOT") {
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
    parsePrimary() {
        const token = this.peek();
        if (!token) {
            throw new Error("Unexpected end of expression");
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
            const str = this.advance();
            return {
                type: "LITERAL",
                value: str.substring(1, str.length - 1),
            };
        }
        // Numbers
        if (/^\d+(\.\d+)?$/.test(token)) {
            const num = this.advance();
            return {
                type: "LITERAL",
                value: /\./.test(num) ? parseFloat(num) : parseInt(num, 10),
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
        const name = this.advance();
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
            name,
        };
    }
    parseValue() {
        const token = this.peek();
        if (token === "?") {
            this.advance();
            return { type: "PARAMETER", position: 0 };
        }
        if ((token === null || token === void 0 ? void 0 : token.startsWith("'")) || (token === null || token === void 0 ? void 0 : token.startsWith(`"`))) {
            const str = this.advance();
            return str.substring(1, str.length - 1); // Remove quotes
        }
        if (/^\d+$/.test(token || "")) {
            return Number.parseInt(this.advance(), 10);
        }
        return this.advance();
    }
    peek() {
        return this.tokens[this.current];
    }
    advance() {
        return this.tokens[this.current++];
    }
    isAtEnd() {
        return this.current >= this.tokens.length;
    }
    consume(expected, message) {
        const token = this.peek();
        if ((token === null || token === void 0 ? void 0 : token.toUpperCase()) !== expected.toUpperCase()) {
            throw new Error(`${message}, got ${token}`);
        }
        return this.advance();
    }
}
const parser = new Parser();


/***/ }),

/***/ "./build/schema/manager.js":
/*!*********************************!*\
  !*** ./build/schema/manager.js ***!
  \*********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SchemaManager: () => (/* binding */ SchemaManager)
/* harmony export */ });
/* harmony import */ var _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../adapter/sheets.js */ "./build/adapter/sheets.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * Schema management using hidden metadata sheet.
 * Stores table schemas in __gsheetql_schema sheet for persistence.
 */


const METADATA_SHEET_NAME = "__gsheetql_schema";
class SchemaManager {
    constructor(config) {
        this.schemaCache = new Map();
        this.spreadsheet = config.spreadsheet;
        this.adapter = new _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__.SheetsAdapter({ spreadsheet: this.spreadsheet });
    }
    /**
     * Ensure metadata sheet exists. Create if missing.
     */
    ensureMetadataSheet() {
        let sheet = this.spreadsheet.getSheetByName(METADATA_SHEET_NAME);
        if (!sheet) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.info(`Creating metadata sheet ${METADATA_SHEET_NAME}`);
            sheet = this.spreadsheet.insertSheet(METADATA_SHEET_NAME);
            sheet.appendRow([
                "table_name",
                "schema_json",
                "version",
                "created_at",
                "updated_at",
            ]);
            // Hide the metadata sheet
            sheet.hideSheet();
        }
        return sheet;
    }
    /**
     * Load all schemas into cache from metadata sheet (synchronous).
     */
    loadSchemasSync() {
        try {
            this.ensureMetadataSheet();
            const rows = this.adapter.readRangeSync(METADATA_SHEET_NAME);
            // Skip header row
            for (let i = 1; i < rows.length; i++) {
                const [tableName, schemaJson] = rows[i];
                if (tableName && schemaJson) {
                    const schema = JSON.parse(String(schemaJson));
                    this.schemaCache.set(String(tableName), schema);
                }
            }
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.debug(`Loaded ${this.schemaCache.size} schemas from metadata sheet`);
            return new Map(this.schemaCache);
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.error("Failed to load schemas", err);
            throw err;
        }
    }
    /**
     * Persist a schema to metadata sheet (synchronous).
     */
    persistSchemaSync(schema) {
        try {
            this.ensureMetadataSheet();
            const rows = this.adapter.readRangeSync(METADATA_SHEET_NAME);
            // Find existing row or append new
            let foundRow = -1;
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] === schema.name) {
                    foundRow = i + 1; // Convert to 1-indexed
                    break;
                }
            }
            const now = Math.floor(Date.now() / 1000);
            const schemaJson = JSON.stringify(schema);
            const updateRow = [
                schema.name,
                schemaJson,
                schema.version,
                schema.createdAt,
                now,
            ];
            if (foundRow > 0) {
                this.adapter.writeRangeSync(METADATA_SHEET_NAME, foundRow, [
                    updateRow,
                ]);
                _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.debug(`Updated schema for table ${schema.name}`);
            }
            else {
                this.adapter.appendRowsSync(METADATA_SHEET_NAME, [updateRow]);
                _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.debug(`Persisted new schema for table ${schema.name}`);
            }
            // Update cache
            this.schemaCache.set(schema.name, schema);
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.error(`Failed to persist schema for ${schema.name}`, err);
            throw err;
        }
    }
    /**
     * Get schema for a table.
     */
    getSchema(tableName) {
        return this.schemaCache.get(tableName);
    }
    /**
     * Delete schema for a table (synchronous).
     */
    deleteSchemaSync(tableName) {
        try {
            this.ensureMetadataSheet();
            const rows = this.adapter.readRangeSync(METADATA_SHEET_NAME);
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] === tableName) {
                    const sheet = this.spreadsheet.getSheetByName(METADATA_SHEET_NAME);
                    if (sheet) {
                        sheet.deleteRow(i + 1);
                    }
                    this.schemaCache.delete(tableName);
                    _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.debug(`Deleted schema for table ${tableName}`);
                    return;
                }
            }
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.error(`Failed to delete schema for ${tableName}`, err);
            throw err;
        }
    }
}


/***/ }),

/***/ "./build/server/handler.js":
/*!*********************************!*\
  !*** ./build/server/handler.js ***!
  \*********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RequestHandler: () => (/* binding */ RequestHandler)
/* harmony export */ });
/* harmony import */ var _executor_create_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../executor/create.js */ "./build/executor/create.js");
/* harmony import */ var _executor_insert_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../executor/insert.js */ "./build/executor/insert.js");
/* harmony import */ var _executor_select_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../executor/select.js */ "./build/executor/select.js");
/* harmony import */ var _parser_parser_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../parser/parser.js */ "./build/parser/parser.js");
/* harmony import */ var _schema_manager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../schema/manager.js */ "./build/schema/manager.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * HTTP request handler for SQL execution.
 * Entry point for doPost() requests.
 */






class RequestHandler {
    handle(body) {
        const requestId = this.generateRequestId();
        _utils_logger_js__WEBPACK_IMPORTED_MODULE_5__.logger.setContext({ requestId });
        try {
            const request = JSON.parse(body);
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_5__.logger.debug("Parsed request", {
                statementCount: request.statements.length,
            });
            // Get execution context
            const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
            const schemaManager = new _schema_manager_js__WEBPACK_IMPORTED_MODULE_4__.SchemaManager({ spreadsheet });
            const schemas = schemaManager.loadSchemasSync();
            const context = {
                spreadsheet,
                schemas,
                inTransaction: false,
            };
            // Execute statements
            const results = [];
            for (const stmt of request.statements) {
                const result = this.executeStatementSync(stmt.sql, context);
                results.push(result);
            }
            const response = {
                success: true,
                result: {
                    data: {
                        results,
                        metadata: {
                            schemaVersion: 1,
                        },
                    },
                },
            };
            return JSON.stringify(response);
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_5__.logger.error("Request handling failed", err);
            const error = err instanceof Error ? err : new Error(String(err));
            const errorResponse = {
                success: false,
                error: {
                    code: "SQLITE_ERROR",
                    message: error.message,
                    debugId: requestId,
                },
            };
            return JSON.stringify(errorResponse);
        }
    }
    executeStatementSync(sql, context) {
        _utils_logger_js__WEBPACK_IMPORTED_MODULE_5__.logger.debug("Executing statement", { sql: sql.substring(0, 100) });
        try {
            // Parse
            const statements = _parser_parser_js__WEBPACK_IMPORTED_MODULE_3__.parser.parse(sql);
            if (statements.length === 0) {
                throw new Error("No valid SQL statement found");
            }
            const stmt = statements[0];
            // Execute based on type
            switch (stmt.type) {
                case "CREATE_TABLE": {
                    const createExec = new _executor_create_js__WEBPACK_IMPORTED_MODULE_0__.CreateTableExecutor(context);
                    return createExec.executeSync(stmt.stmt);
                }
                case "INSERT": {
                    const insertExec = new _executor_insert_js__WEBPACK_IMPORTED_MODULE_1__.InsertExecutor(context);
                    return insertExec.executeSync(stmt.stmt);
                }
                case "SELECT": {
                    const selectExec = new _executor_select_js__WEBPACK_IMPORTED_MODULE_2__.SelectExecutor(context);
                    return selectExec.executeSync(stmt.stmt);
                }
                case "BEGIN":
                    context.inTransaction = true;
                    context.transactionSnapshot = new Map();
                    return { columns: [], rows: [], affectedRowCount: 0 };
                case "COMMIT":
                    context.inTransaction = false;
                    context.transactionSnapshot = undefined;
                    return { columns: [], rows: [], affectedRowCount: 0 };
                case "ROLLBACK":
                    context.inTransaction = false;
                    context.transactionSnapshot = undefined;
                    return { columns: [], rows: [], affectedRowCount: 0 };
                default:
                    throw new Error(`Statement type not yet implemented: ${stmt.type}`);
            }
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_5__.logger.error("Statement execution failed", err);
            throw err;
        }
    }
    generateRequestId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        return `${timestamp}-${random}`;
    }
}


/***/ }),

/***/ "./build/utils/logger.js":
/*!*******************************!*\
  !*** ./build/utils/logger.js ***!
  \*******************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   logger: () => (/* binding */ logger)
/* harmony export */ });
/**
 * Logging utility for debugging and tracing.
 * Uses both console and Logger (GAS) for visibility in both local and deployed contexts.
 */
class Logger {
    constructor() {
        this.context = {};
    }
    setContext(ctx) {
        this.context = Object.assign(Object.assign({}, this.context), ctx);
    }
    clearContext() {
        this.context = {};
    }
    format(level, message, data) {
        const timestamp = new Date().toISOString();
        const contextStr = this.context.requestId
            ? ` [${this.context.requestId}]`
            : "";
        const dataStr = data ? ` ${JSON.stringify(data)}` : "";
        return `[${timestamp}]${contextStr} ${level}: ${message}${dataStr}`;
    }
    debug(message, data) {
        const msg = this.format("DEBUG", message, data);
        console.warn(msg);
    }
    info(message, data) {
        const msg = this.format("INFO", message, data);
        console.warn(msg);
        // Logger is available in GAS context
        try {
            if (typeof globalThis.Logger !== "undefined") {
                globalThis.Logger.log(msg);
            }
        }
        catch (_a) {
            // Ignore if not in GAS context
        }
    }
    warn(message, data) {
        const msg = this.format("WARN", message, data);
        console.warn(msg);
        try {
            if (typeof globalThis.Logger !== "undefined") {
                globalThis.Logger.log(msg);
            }
        }
        catch (_a) {
            // Ignore if not in GAS context
        }
    }
    error(message, data) {
        const msg = this.format("ERROR", message, data);
        console.error(msg);
        try {
            if (typeof globalThis.Logger !== "undefined") {
                globalThis.Logger.log(msg);
            }
        }
        catch (_a) {
            // Ignore if not in GAS context
        }
    }
}
const logger = new Logger();


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!************************!*\
  !*** ./build/index.js ***!
  \************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   doGet: () => (/* binding */ doGet),
/* harmony export */   doPost: () => (/* binding */ doPost),
/* harmony export */   onEdit: () => (/* binding */ onEdit),
/* harmony export */   onInstall: () => (/* binding */ onInstall),
/* harmony export */   onOpen: () => (/* binding */ onOpen)
/* harmony export */ });
/* harmony import */ var _server_handler_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./server/handler.js */ "./build/server/handler.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/logger.js */ "./build/utils/logger.js");
/**
 * SQL Sheets - SQL interface for Google Sheets
 * Main entry point for HTTP requests
 */


/**
 * Main HTTP POST handler.
 * Called by Google Apps Script when HTTP POST is received.
 * Must be synchronous - GAS doesn't support async trigger functions.
 */
function doPost(e) {
    const lock = LockService.getScriptLock();
    const acquired = lock.tryLock(30000); // 30 second timeout
    if (!acquired) {
        const error = {
            success: false,
            error: {
                code: "SQLITE_BUSY",
                message: "Database is locked. Another request is in progress.",
            },
        };
        return ContentService.createTextOutput(JSON.stringify(error)).setMimeType(ContentService.MimeType.JSON);
    }
    try {
        const handler = new _server_handler_js__WEBPACK_IMPORTED_MODULE_0__.RequestHandler();
        const result = handler.handle(e.postData.contents);
        return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
    }
    catch (err) {
        _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.error("doPost failed", err);
        const error = {
            success: false,
            error: {
                code: "SQLITE_ERROR",
                message: err instanceof Error ? err.message : String(err),
            },
        };
        return ContentService.createTextOutput(JSON.stringify(error)).setMimeType(ContentService.MimeType.JSON);
    }
    finally {
        lock.releaseLock();
    }
}
function onOpen(_e) {
    // Placeholder for future menu setup
}
function onEdit(_e) {
    // Placeholder for future edit handlers
}
function onInstall(_e) {
    // Placeholder for future install handlers
}
function doGet(_e) {
    return ContentService.createTextOutput("SQL Sheets API - use POST requests").setMimeType(ContentService.MimeType.TEXT);
}

__webpack_require__.g.doGet = __webpack_exports__.doGet;
__webpack_require__.g.doPost = __webpack_exports__.doPost;
__webpack_require__.g.onEdit = __webpack_exports__.onEdit;
__webpack_require__.g.onInstall = __webpack_exports__.onInstall;
__webpack_require__.g.onOpen = __webpack_exports__.onOpen;
})();

/******/ })()
;