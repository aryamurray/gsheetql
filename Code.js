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
            const columnNames = columns.map((c) => c.name);
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
                columns: columns.map((col) => ({
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
            if (char === "'" || char === '"') {
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
        this.consume("SELECT", "Expected SELECT");
        // Simplified: only support SELECT *
        if (this.peek() === "*") {
            this.advance();
        }
        this.consume("FROM", "Expected FROM");
        const tableName = this.advance();
        return {
            type: "SELECT",
            stmt: {
                columns: [{ expr: { type: "STAR" } }],
                from: tableName,
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
    parseValue() {
        const token = this.peek();
        if (token === "?") {
            this.advance();
            return { type: "PARAMETER", position: 0 };
        }
        if ((token === null || token === void 0 ? void 0 : token.startsWith("'")) || (token === null || token === void 0 ? void 0 : token.startsWith('"'))) {
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
/* harmony import */ var _parser_parser_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../parser/parser.js */ "./build/parser/parser.js");
/* harmony import */ var _schema_manager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../schema/manager.js */ "./build/schema/manager.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * HTTP request handler for SQL execution.
 * Entry point for doPost() requests.
 */




class RequestHandler {
    handle(body) {
        const requestId = this.generateRequestId();
        _utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logger.setContext({ requestId });
        try {
            const request = JSON.parse(body);
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logger.debug("Parsed request", {
                statementCount: request.statements.length,
            });
            // Get execution context
            const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
            const schemaManager = new _schema_manager_js__WEBPACK_IMPORTED_MODULE_2__.SchemaManager({ spreadsheet });
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
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logger.error("Request handling failed", err);
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
        _utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logger.debug("Executing statement", { sql: sql.substring(0, 100) });
        try {
            // Parse
            const statements = _parser_parser_js__WEBPACK_IMPORTED_MODULE_1__.parser.parse(sql);
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
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_3__.logger.error("Statement execution failed", err);
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