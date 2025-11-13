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
     * All values are converted to strings to match SQLite text model.
     */
    readRangeSync(tableName) {
        try {
            const sheet = this.getSheet(tableName);
            const range = sheet.getDataRange();
            const values = range.getValues();
            // Convert all values to strings (Google Sheets API returns mixed types)
            const stringValues = values.map((row) => row.map((val) => {
                if (val === null || val === undefined) {
                    return "";
                }
                return String(val);
            }));
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_0__.logger.debug(`Read ${stringValues.length} rows from ${tableName}`);
            return stringValues;
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
    async deleteRows(tableName, rowIndices) {
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
    }
    /**
     * Delete rows by indices (1-indexed) synchronously.
     * Deletes in reverse order to maintain index stability.
     */
    deleteRowsSync(tableName, rowIndices) {
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
    }
    /**
     * Create a new sheet with header row.
     */
    async createSheet(tableName, columns) {
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

/***/ "./build/executor/delete.js":
/*!**********************************!*\
  !*** ./build/executor/delete.js ***!
  \**********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DeleteExecutor: () => (/* binding */ DeleteExecutor)
/* harmony export */ });
/* harmony import */ var _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../adapter/sheets.js */ "./build/adapter/sheets.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * DELETE statement executor.
 * Supports: DELETE FROM table WHERE condition
 */


class DeleteExecutor {
    constructor(context) {
        this.context = context;
    }
    /**
     * Extract column name from potentially qualified name (e.g., "table.column" -> "column")
     */
    getColumnName(qualifiedName) {
        const parts = qualifiedName.split(".");
        return parts[parts.length - 1]; // Return last part after dot
    }
    executeSync(stmt) {
        const { table, where } = stmt;
        try {
            const adapter = new _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__.SheetsAdapter({
                spreadsheet: this.context.spreadsheet,
            });
            // Check table exists
            if (!adapter.sheetExists(table)) {
                throw new Error(`Table ${table} does not exist`);
            }
            // Read all data
            const allData = adapter.readRangeSync(table);
            if (allData.length === 0) {
                throw new Error(`Table ${table} is empty`);
            }
            const headers = allData[0];
            const dataRows = allData.slice(1);
            // Find rows to delete based on WHERE clause
            const rowIndices = [];
            if (where) {
                for (let i = 0; i < dataRows.length; i++) {
                    if (this.isTruthy(this.evaluateExpression(dataRows[i], headers, where.expr))) {
                        rowIndices.push(i + 2); // +1 for header, +1 for 1-based indexing
                    }
                }
            }
            else {
                // No WHERE clause - delete all rows
                for (let i = 0; i < dataRows.length; i++) {
                    rowIndices.push(i + 2);
                }
            }
            // Save snapshot if in transaction
            if (this.context.inTransaction && this.context.transactionSnapshot) {
                if (!this.context.transactionSnapshot.has(table)) {
                    this.context.transactionSnapshot.set(table, allData);
                }
            }
            // Delete rows
            const deletedCount = adapter.deleteRowsSync(table, rowIndices);
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.info(`Deleted ${deletedCount} rows from ${table}`);
            return {
                columns: [],
                rows: [],
                affectedRowCount: deletedCount,
            };
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.error(`DELETE failed for ${table}`, err);
            throw err;
        }
    }
    evaluateExpression(row, headers, expr) {
        if (expr.type === "LITERAL") {
            return expr.value;
        }
        if (expr.type === "COLUMN") {
            const colName = this.getColumnName(expr.name);
            const colIndex = headers.indexOf(colName);
            if (colIndex === -1) {
                throw new Error(`Column ${expr.name} not found`);
            }
            return row[colIndex];
        }
        if (expr.type === "PAREN") {
            return this.evaluateExpression(row, headers, expr.expr);
        }
        if (expr.type === "UNARY_OP") {
            const val = this.evaluateExpression(row, headers, expr.operand);
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
                return (this.isTruthy(this.evaluateExpression(row, headers, expr.left))
                    && this.isTruthy(this.evaluateExpression(row, headers, expr.right)));
            }
            if (op === "OR") {
                return (this.isTruthy(this.evaluateExpression(row, headers, expr.left))
                    || this.isTruthy(this.evaluateExpression(row, headers, expr.right)));
            }
            // Comparison operators
            const leftVal = this.evaluateExpression(row, headers, expr.left);
            const rightVal = this.evaluateExpression(row, headers, expr.right);
            switch (op) {
                case "=": {
                    // Type-aware comparison: try numeric comparison first
                    const leftNum = Number(leftVal);
                    const rightNum = Number(rightVal);
                    if (!isNaN(leftNum) && !isNaN(rightNum)) {
                        return leftNum === rightNum;
                    }
                    return String(leftVal) === String(rightVal);
                }
                case "!=":
                case "<>": {
                    // Type-aware comparison
                    const leftNum = Number(leftVal);
                    const rightNum = Number(rightVal);
                    if (!isNaN(leftNum) && !isNaN(rightNum)) {
                        return leftNum !== rightNum;
                    }
                    return String(leftVal) !== String(rightVal);
                }
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
                    const leftIsNull = leftVal === null || leftVal === undefined || leftVal === "";
                    const rightIsNull = rightVal === null || rightVal === undefined || rightVal === "";
                    if (rightIsNull) {
                        return leftIsNull;
                    }
                    return leftVal === rightVal;
                case "IS NOT":
                    const leftIsNotNull = !(leftVal === null
                        || leftVal === undefined
                        || leftVal === "");
                    const rightIsNotNull = !(rightVal === null
                        || rightVal === undefined
                        || rightVal === "");
                    if (!rightIsNotNull) {
                        return leftIsNotNull;
                    }
                    return leftVal !== rightVal;
                case "+":
                    return Number(leftVal) + Number(rightVal);
                case "-":
                    return Number(leftVal) - Number(rightVal);
                case "*":
                    return Number(leftVal) * Number(rightVal);
                case "/":
                    return Number(rightVal) !== 0
                        ? Number(leftVal) / Number(rightVal)
                        : null;
                default:
                    throw new Error(`Unsupported operator: ${op}`);
            }
        }
        if (expr.type === "FUNCTION") {
            return this.evaluateFunction(row, headers, expr);
        }
        throw new Error(`Unsupported expression type: ${expr.type}`);
    }
    evaluateFunction(row, headers, expr) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const name = expr.name.toUpperCase();
        const args = expr.args.map((arg) => this.evaluateExpression(row, headers, arg));
        switch (name) {
            case "UPPER":
                return String((_a = args[0]) !== null && _a !== void 0 ? _a : "").toUpperCase();
            case "LOWER":
                return String((_b = args[0]) !== null && _b !== void 0 ? _b : "").toLowerCase();
            case "LENGTH":
                return String((_c = args[0]) !== null && _c !== void 0 ? _c : "").length;
            case "TRIM":
                return String((_d = args[0]) !== null && _d !== void 0 ? _d : "").trim();
            case "SUBSTR":
                return String((_e = args[0]) !== null && _e !== void 0 ? _e : "").substring(Number((_f = args[1]) !== null && _f !== void 0 ? _f : 0), Number((_g = args[2]) !== null && _g !== void 0 ? _g : undefined));
            case "ABS":
                return Math.abs(Number((_h = args[0]) !== null && _h !== void 0 ? _h : 0));
            case "ROUND":
                return (Math.round(Number((_j = args[0]) !== null && _j !== void 0 ? _j : 0) * 10 ** Number((_k = args[1]) !== null && _k !== void 0 ? _k : 0)) / 10 ** Number((_l = args[1]) !== null && _l !== void 0 ? _l : 0));
            case "COALESCE":
                return ((_m = args.find((a) => a !== null && a !== undefined && a !== "")) !== null && _m !== void 0 ? _m : null);
            default:
                throw new Error(`Unsupported function: ${name}`);
        }
    }
    isTruthy(value) {
        return (value !== null
            && value !== undefined
            && value !== false
            && value !== ""
            && value !== 0);
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
                    const row = Array.from({ length: headerRow.length }).fill("");
                    for (let i = 0; i < columns.length; i++) {
                        const colName = columns[i];
                        const colIndex = headerRow.indexOf(colName);
                        if (colIndex === -1) {
                            throw new Error(`Column ${colName} not found in table ${table}`);
                        }
                        // Extract value from literal expressions or use raw value
                        let val = valueRow[i];
                        if (val !== null
                            && typeof val === "object"
                            && "type" in val
                            && val.type === "LITERAL") {
                            val = val.value;
                        }
                        row[colIndex]
                            = val === null || val === undefined ? "" : String(val);
                    }
                    insertedRow.push(...row);
                }
                else {
                    // All columns in order
                    if (valueRow.length !== headerRow.length) {
                        throw new Error(`Expected ${headerRow.length} values, got ${valueRow.length}`);
                    }
                    // Convert null values to empty strings for sheets storage
                    insertedRow.push(...valueRow.map((v) => {
                        // Extract value from literal expressions or use raw value
                        if (v !== null
                            && typeof v === "object"
                            && "type" in v
                            && v.type === "LITERAL") {
                            v = v.value;
                        }
                        return v === null || v === undefined ? "" : String(v);
                    }));
                }
                rowsToInsert.push(insertedRow);
            }
            // Save snapshot if in transaction
            if (this.context.inTransaction && this.context.transactionSnapshot) {
                if (!this.context.transactionSnapshot.has(table)) {
                    this.context.transactionSnapshot.set(table, currentData);
                }
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
    /**
     * Extract column name from potentially qualified name (e.g., "table.column" -> "column")
     */
    getColumnName(qualifiedName) {
        const parts = qualifiedName.split(".");
        return parts[parts.length - 1]; // Return last part after dot
    }
    executeSync(stmt) {
        const { from: tableName, columns: selectColumns, where, groupBy, having, orderBy, limit, offset } = stmt;
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
            // Apply WHERE filter first
            if (where) {
                rows = this.filterRows(rows, headers, where);
            }
            // Handle GROUP BY if present
            let selectedColumns = headers;
            let selectedColumnIndices = [];
            const isSelectAll = selectColumns.length === 1 && selectColumns[0].expr.type === "STAR";
            if (groupBy && groupBy.length > 0) {
                // Perform grouping
                rows = this.groupRows(rows, headers, groupBy, selectColumns, having);
                // After grouping, columns are the group keys + aggregate results
                if (!isSelectAll) {
                    // Specific columns selected - extract from select list with aliases
                    selectedColumns = selectColumns.map((col) => {
                        // Use alias if provided, otherwise use expression name
                        if (col.alias) {
                            return col.alias;
                        }
                        if (col.expr.type === "FUNCTION") {
                            return col.expr.name.toLowerCase();
                        }
                        const colName = this.getColumnName(col.expr.name);
                        return colName;
                    });
                }
            }
            else {
                // No GROUP BY - determine which columns to select
                if (!isSelectAll) {
                    // Specific columns selected
                    selectedColumns = selectColumns.map((col) => {
                        const colName = this.getColumnName(col.expr.name);
                        const colIndex = headers.indexOf(colName);
                        if (colIndex === -1) {
                            throw new Error(`Column ${col.expr.name} not found`);
                        }
                        selectedColumnIndices.push(colIndex);
                        // Use alias if provided, otherwise use column name
                        return col.alias || colName;
                    });
                }
                else {
                    // SELECT * - use all columns
                    selectedColumnIndices = headers.map((_, i) => i);
                }
                // Project selected columns only
                if (!isSelectAll) {
                    rows = rows.map(row => selectedColumnIndices.map(idx => row[idx]));
                }
            }
            // Apply ORDER BY
            if (orderBy && orderBy.length > 0) {
                rows = this.sortRows(rows, selectedColumns, orderBy);
            }
            // Apply OFFSET
            if (offset && offset > 0) {
                rows = rows.slice(offset);
            }
            // Apply LIMIT (limit === 0 is valid and means return 0 rows)
            if (limit !== null && limit !== undefined && limit >= 0) {
                rows = rows.slice(0, limit);
            }
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.info(`Selected ${rows.length} rows from ${tableName}`);
            // Convert rows to proper types based on schema
            const schema = this.context.schemas.get(tableName);
            if (schema) {
                rows = rows.map((row) => {
                    return row.map((value, idx) => {
                        const columnName = selectedColumns[idx];
                        if (!columnName)
                            return value;
                        const colDef = schema.columns.find((c) => c.name === columnName);
                        if (!colDef)
                            return value;
                        // Convert based on column type
                        if (value === null || value === undefined || value === "") {
                            return null;
                        }
                        switch (colDef.type) {
                            case "INTEGER":
                                const intVal = Number(value);
                                return !isNaN(intVal) && Number.isInteger(intVal) ? intVal : value;
                            case "REAL":
                                const floatVal = Number(value);
                                return !isNaN(floatVal) ? floatVal : value;
                            case "TEXT":
                            case "BLOB":
                            default:
                                return value;
                        }
                    });
                });
            }
            return {
                columns: selectedColumns,
                rows,
                affectedRowCount: 0,
            };
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.error(`SELECT failed for ${tableName}`, err);
            throw err;
        }
    }
    evaluateHaving(_selectColumns, having, originalHeaders, groupRows) {
        // Create a special context for HAVING evaluation where aggregate functions
        // can be recalculated if needed
        const havingEvaluator = (expr) => {
            if (expr.type === "LITERAL") {
                return expr.value;
            }
            if (expr.type === "FUNCTION") {
                // Aggregate function in HAVING - calculate it from groupRows
                const funcName = expr.name.toUpperCase();
                switch (funcName) {
                    case "COUNT": {
                        if (expr.args.length === 0 || expr.args[0].type === "STAR") {
                            return groupRows.length;
                        }
                        else {
                            const colName = this.getColumnName(expr.args[0].name);
                            const colIdx = originalHeaders.indexOf(colName);
                            return groupRows.filter(r => r[colIdx] !== null && r[colIdx] !== "").length;
                        }
                    }
                    case "SUM": {
                        const colName = this.getColumnName(expr.args[0].name);
                        const colIdx = originalHeaders.indexOf(colName);
                        return groupRows.reduce((sum, r) => sum + Number(r[colIdx] || 0), 0);
                    }
                    case "AVG": {
                        const colName = this.getColumnName(expr.args[0].name);
                        const colIdx = originalHeaders.indexOf(colName);
                        const sum = groupRows.reduce((s, r) => s + Number(r[colIdx] || 0), 0);
                        return groupRows.length > 0 ? sum / groupRows.length : null;
                    }
                    case "MIN": {
                        const colName = this.getColumnName(expr.args[0].name);
                        const colIdx = originalHeaders.indexOf(colName);
                        const values = groupRows.map(r => Number(r[colIdx])).filter(v => !isNaN(v));
                        return values.length > 0 ? Math.min(...values) : null;
                    }
                    case "MAX": {
                        const colName = this.getColumnName(expr.args[0].name);
                        const colIdx = originalHeaders.indexOf(colName);
                        const values = groupRows.map(r => Number(r[colIdx])).filter(v => !isNaN(v));
                        return values.length > 0 ? Math.max(...values) : null;
                    }
                    default:
                        throw new Error(`Unsupported aggregate in HAVING: ${funcName}`);
                }
            }
            if (expr.type === "BINARY_OP") {
                const op = expr.op.toUpperCase();
                const left = havingEvaluator(expr.left);
                const right = havingEvaluator(expr.right);
                switch (op) {
                    case "=":
                        return Number(left) === Number(right);
                    case "!=":
                    case "<>":
                        return Number(left) !== Number(right);
                    case ">":
                        return Number(left) > Number(right);
                    case ">=":
                        return Number(left) >= Number(right);
                    case "<":
                        return Number(left) < Number(right);
                    case "<=":
                        return Number(left) <= Number(right);
                    case "AND":
                        return this.isTruthy(left) && this.isTruthy(right);
                    case "OR":
                        return this.isTruthy(left) || this.isTruthy(right);
                    default:
                        return null;
                }
            }
            throw new Error(`Unsupported expression in HAVING: ${expr.type}`);
        };
        return this.isTruthy(havingEvaluator(having));
    }
    filterRows(rows, headers, where) {
        return rows.filter(row => this.isTruthy(this.evaluateExpression(row, headers, where.expr)));
    }
    groupRows(rows, headers, groupByColumns, selectColumns, having) {
        // Map group by column names to indices
        const groupByIndices = groupByColumns.map(colName => {
            const colName2 = this.getColumnName(colName);
            const idx = headers.indexOf(colName2);
            if (idx === -1) {
                throw new Error(`Column ${colName} not found in GROUP BY`);
            }
            return idx;
        });
        // Group rows by the GROUP BY columns
        const groups = new Map();
        for (const row of rows) {
            // Create group key from GROUP BY column values
            const groupKey = groupByIndices.map(idx => row[idx]).join("\x00");
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey).push(row);
        }
        // Build result rows with aggregates
        const resultRows = [];
        for (const [_, groupRows] of groups.entries()) {
            // Create a row with group key values + aggregate calculations
            const resultRow = [];
            // First, add the group key columns
            for (const idx of groupByIndices) {
                resultRow.push(groupRows[0][idx]); // All rows in group have same values
            }
            // Then, calculate aggregates for non-group-by columns in SELECT
            for (const selectCol of selectColumns) {
                const expr = selectCol.expr;
                if (expr.type === "FUNCTION") {
                    // Aggregate function
                    const funcName = expr.name.toUpperCase();
                    let aggValue = null;
                    switch (funcName) {
                        case "COUNT": {
                            if (expr.args.length === 0 || (expr.args[0].type === "STAR")) {
                                aggValue = groupRows.length;
                            }
                            else {
                                // COUNT(column) - count non-null values
                                const colName = this.getColumnName(expr.args[0].name);
                                const colIdx = headers.indexOf(colName);
                                aggValue = groupRows.filter(r => r[colIdx] !== null && r[colIdx] !== "").length;
                            }
                            break;
                        }
                        case "SUM": {
                            const colName = this.getColumnName(expr.args[0].name);
                            const colIdx = headers.indexOf(colName);
                            aggValue = groupRows.reduce((sum, r) => sum + Number(r[colIdx] || 0), 0);
                            break;
                        }
                        case "AVG": {
                            const colName = this.getColumnName(expr.args[0].name);
                            const colIdx = headers.indexOf(colName);
                            const sum = groupRows.reduce((s, r) => s + Number(r[colIdx] || 0), 0);
                            aggValue = groupRows.length > 0 ? sum / groupRows.length : null;
                            break;
                        }
                        case "MIN": {
                            const colName = this.getColumnName(expr.args[0].name);
                            const colIdx = headers.indexOf(colName);
                            const values = groupRows.map(r => Number(r[colIdx])).filter(v => !isNaN(v));
                            aggValue = values.length > 0 ? Math.min(...values) : null;
                            break;
                        }
                        case "MAX": {
                            const colName = this.getColumnName(expr.args[0].name);
                            const colIdx = headers.indexOf(colName);
                            const values = groupRows.map(r => Number(r[colIdx])).filter(v => !isNaN(v));
                            aggValue = values.length > 0 ? Math.max(...values) : null;
                            break;
                        }
                        default:
                            throw new Error(`Unsupported aggregate function: ${funcName}`);
                    }
                    resultRow.push(aggValue);
                }
                else if (expr.type === "COLUMN") {
                    // Group by column - should already be in resultRow
                    const colName = this.getColumnName(expr.name);
                    const colIdx = headers.indexOf(colName);
                    const idx = groupByIndices.indexOf(colIdx);
                    if (idx !== -1) {
                        // Already added, don't add again
                    }
                    else {
                        resultRow.push(groupRows[0][colIdx]);
                    }
                }
                else {
                    // Other expressions - evaluate on first row of group
                    const val = this.evaluateExpression(groupRows[0], headers, expr);
                    resultRow.push(val);
                }
            }
            // Apply HAVING filter if present
            if (having) {
                // Evaluate HAVING - need special handling for aggregates in HAVING clause
                if (this.evaluateHaving(selectColumns, having, headers, groupRows)) {
                    resultRows.push(resultRow);
                }
            }
            else {
                resultRows.push(resultRow);
            }
        }
        return resultRows;
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
                return (this.isTruthy(this.evaluateExpression(row, headers, expr.left))
                    && this.isTruthy(this.evaluateExpression(row, headers, expr.right)));
            }
            if (op === "OR") {
                return (this.isTruthy(this.evaluateExpression(row, headers, expr.left))
                    || this.isTruthy(this.evaluateExpression(row, headers, expr.right)));
            }
            // Comparison operators
            const leftVal = this.getExpressionValue(row, headers, expr.left);
            const rightVal = this.getExpressionValue(row, headers, expr.right);
            switch (op) {
                case "=": {
                    // SQL NULL semantics: NULL = anything is always false
                    // Check for actual null from parser (when comparing with NULL literal)
                    if (leftVal === null || rightVal === null) {
                        return false;
                    }
                    // Type-aware comparison: try numeric comparison first
                    const leftNum = Number(leftVal);
                    const rightNum = Number(rightVal);
                    if (!isNaN(leftNum) && !isNaN(rightNum)) {
                        return leftNum === rightNum;
                    }
                    return String(leftVal) === String(rightVal);
                }
                case "!=":
                case "<>": {
                    // SQL NULL semantics: NULL != anything is always false
                    if (leftVal === null || rightVal === null) {
                        return false;
                    }
                    // Type-aware comparison
                    const leftNum = Number(leftVal);
                    const rightNum = Number(rightVal);
                    if (!isNaN(leftNum) && !isNaN(rightNum)) {
                        return leftNum !== rightNum;
                    }
                    return String(leftVal) !== String(rightVal);
                }
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
                    // IS NULL checks for null or empty string
                    // Normalize both values: null/undefined/empty-string all represent NULL
                    const leftIsNull = leftVal === null || leftVal === undefined || leftVal === "";
                    const rightIsNull = rightVal === null || rightVal === undefined || rightVal === "";
                    if (rightIsNull) {
                        // Right side is NULL, check if left side is also NULL
                        return leftIsNull;
                    }
                    return leftVal === rightVal;
                case "IS NOT":
                    // IS NOT NULL checks for not null and not empty string
                    const leftIsNotNull = !(leftVal === null
                        || leftVal === undefined
                        || leftVal === "");
                    const rightIsNotNull = !(rightVal === null
                        || rightVal === undefined
                        || rightVal === "");
                    if (!rightIsNotNull) {
                        // Right side is NULL, return if left is NOT NULL
                        return leftIsNotNull;
                    }
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
            const colName = this.getColumnName(expr.name);
            const colIndex = headers.indexOf(colName);
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
                    return Number(rightVal) !== 0
                        ? Number(leftVal) / Number(rightVal)
                        : null;
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
                const colName = this.getColumnName(order.column);
                const colIndex = headers.indexOf(colName);
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

/***/ "./build/executor/update.js":
/*!**********************************!*\
  !*** ./build/executor/update.js ***!
  \**********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   UpdateExecutor: () => (/* binding */ UpdateExecutor)
/* harmony export */ });
/* harmony import */ var _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../adapter/sheets.js */ "./build/adapter/sheets.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * UPDATE statement executor.
 * Supports: UPDATE table SET col=value, ... WHERE condition
 */


class UpdateExecutor {
    constructor(context) {
        this.context = context;
    }
    /**
     * Extract column name from potentially qualified name (e.g., "table.column" -> "column")
     */
    getColumnName(qualifiedName) {
        const parts = qualifiedName.split(".");
        return parts[parts.length - 1]; // Return last part after dot
    }
    executeSync(stmt) {
        const { table, assignments, where } = stmt;
        try {
            const adapter = new _adapter_sheets_js__WEBPACK_IMPORTED_MODULE_0__.SheetsAdapter({
                spreadsheet: this.context.spreadsheet,
            });
            // Check table exists
            if (!adapter.sheetExists(table)) {
                throw new Error(`Table ${table} does not exist`);
            }
            // Read all data
            const allData = adapter.readRangeSync(table);
            if (allData.length === 0) {
                throw new Error(`Table ${table} is empty`);
            }
            const headers = allData[0];
            const dataRows = allData.slice(1);
            // Find rows to update based on WHERE clause
            const rowIndicesToUpdate = [];
            if (where) {
                for (let i = 0; i < dataRows.length; i++) {
                    if (this.isTruthy(this.evaluateExpression(dataRows[i], headers, where.expr))) {
                        rowIndicesToUpdate.push(i);
                    }
                }
            }
            else {
                // No WHERE clause - update all rows
                for (let i = 0; i < dataRows.length; i++) {
                    rowIndicesToUpdate.push(i);
                }
            }
            // Apply assignments to matching rows
            let affectedCount = 0;
            for (const rowIndex of rowIndicesToUpdate) {
                const row = dataRows[rowIndex];
                // Apply each assignment
                for (const assignment of assignments) {
                    const colName = this.getColumnName(assignment.column);
                    const colIndex = headers.indexOf(colName);
                    if (colIndex === -1) {
                        throw new Error(`Column ${assignment.column} not found in table ${table}`);
                    }
                    // Evaluate the value expression
                    const newValue = this.evaluateExpression(row, headers, assignment.value);
                    row[colIndex]
                        = newValue === null || newValue === undefined ? "" : String(newValue);
                }
                affectedCount++;
            }
            // Save snapshot if in transaction
            if (this.context.inTransaction && this.context.transactionSnapshot) {
                if (!this.context.transactionSnapshot.has(table)) {
                    this.context.transactionSnapshot.set(table, allData);
                }
            }
            // Write back all data (including unchanged rows) to preserve row order
            if (affectedCount > 0) {
                adapter.writeRangeSync(table, 2, dataRows);
            }
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.info(`Updated ${affectedCount} rows in ${table}`);
            return {
                columns: [],
                rows: [],
                affectedRowCount: affectedCount,
            };
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_1__.logger.error(`UPDATE failed for ${table}`, err);
            throw err;
        }
    }
    evaluateExpression(row, headers, expr) {
        if (expr.type === "LITERAL") {
            return expr.value;
        }
        if (expr.type === "COLUMN") {
            const colName = this.getColumnName(expr.name);
            const colIndex = headers.indexOf(colName);
            if (colIndex === -1) {
                throw new Error(`Column ${expr.name} not found`);
            }
            return row[colIndex];
        }
        if (expr.type === "PAREN") {
            return this.evaluateExpression(row, headers, expr.expr);
        }
        if (expr.type === "UNARY_OP") {
            const val = this.evaluateExpression(row, headers, expr.operand);
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
                return (this.isTruthy(this.evaluateExpression(row, headers, expr.left))
                    && this.isTruthy(this.evaluateExpression(row, headers, expr.right)));
            }
            if (op === "OR") {
                return (this.isTruthy(this.evaluateExpression(row, headers, expr.left))
                    || this.isTruthy(this.evaluateExpression(row, headers, expr.right)));
            }
            // Comparison operators
            const leftVal = this.evaluateExpression(row, headers, expr.left);
            const rightVal = this.evaluateExpression(row, headers, expr.right);
            switch (op) {
                case "=": {
                    // Type-aware comparison: try numeric comparison first
                    const leftNum = Number(leftVal);
                    const rightNum = Number(rightVal);
                    if (!isNaN(leftNum) && !isNaN(rightNum)) {
                        return leftNum === rightNum;
                    }
                    return String(leftVal) === String(rightVal);
                }
                case "!=":
                case "<>": {
                    // Type-aware comparison
                    const leftNum = Number(leftVal);
                    const rightNum = Number(rightVal);
                    if (!isNaN(leftNum) && !isNaN(rightNum)) {
                        return leftNum !== rightNum;
                    }
                    return String(leftVal) !== String(rightVal);
                }
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
                    const leftIsNull = leftVal === null || leftVal === undefined || leftVal === "";
                    const rightIsNull = rightVal === null || rightVal === undefined || rightVal === "";
                    if (rightIsNull) {
                        return leftIsNull;
                    }
                    return leftVal === rightVal;
                case "IS NOT":
                    const leftIsNotNull = !(leftVal === null
                        || leftVal === undefined
                        || leftVal === "");
                    const rightIsNotNull = !(rightVal === null
                        || rightVal === undefined
                        || rightVal === "");
                    if (!rightIsNotNull) {
                        return leftIsNotNull;
                    }
                    return leftVal !== rightVal;
                case "+":
                    return Number(leftVal) + Number(rightVal);
                case "-":
                    return Number(leftVal) - Number(rightVal);
                case "*":
                    return Number(leftVal) * Number(rightVal);
                case "/":
                    return Number(rightVal) !== 0
                        ? Number(leftVal) / Number(rightVal)
                        : null;
                default:
                    throw new Error(`Unsupported operator: ${op}`);
            }
        }
        if (expr.type === "FUNCTION") {
            return this.evaluateFunction(row, headers, expr);
        }
        throw new Error(`Unsupported expression type: ${expr.type}`);
    }
    evaluateFunction(row, headers, expr) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const name = expr.name.toUpperCase();
        const args = expr.args.map((arg) => this.evaluateExpression(row, headers, arg));
        switch (name) {
            case "UPPER":
                return String((_a = args[0]) !== null && _a !== void 0 ? _a : "").toUpperCase();
            case "LOWER":
                return String((_b = args[0]) !== null && _b !== void 0 ? _b : "").toLowerCase();
            case "LENGTH":
                return String((_c = args[0]) !== null && _c !== void 0 ? _c : "").length;
            case "TRIM":
                return String((_d = args[0]) !== null && _d !== void 0 ? _d : "").trim();
            case "SUBSTR":
                return String((_e = args[0]) !== null && _e !== void 0 ? _e : "").substring(Number((_f = args[1]) !== null && _f !== void 0 ? _f : 0), Number((_g = args[2]) !== null && _g !== void 0 ? _g : undefined));
            case "ABS":
                return Math.abs(Number((_h = args[0]) !== null && _h !== void 0 ? _h : 0));
            case "ROUND":
                return (Math.round(Number((_j = args[0]) !== null && _j !== void 0 ? _j : 0) * 10 ** Number((_k = args[1]) !== null && _k !== void 0 ? _k : 0)) / 10 ** Number((_l = args[1]) !== null && _l !== void 0 ? _l : 0));
            case "COALESCE":
                return ((_m = args.find((a) => a !== null && a !== undefined && a !== "")) !== null && _m !== void 0 ? _m : null);
            default:
                throw new Error(`Unsupported function: ${name}`);
        }
    }
    isTruthy(value) {
        return (value !== null
            && value !== undefined
            && value !== false
            && value !== ""
            && value !== 0);
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
        this.parameterCount = 0;
    }
    /**
     * Parse SQL string into AST.
     */
    parse(sql) {
        this.tokens = this.tokenize(sql.trim());
        this.current = 0;
        this.parameterCount = 0;
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
            if (/[a-zA-Z_]/.test(char)) {
                let j = i;
                while (j < sql.length && /[a-zA-Z0-9_.-]/.test(sql[j])) {
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
    /**
     * Parse a SELECT column expression - could be column, qualified name, or function call
     */
    parseSelectExpression() {
        const token = this.peek();
        if (!token) {
            throw new Error("Expected expression in SELECT");
        }
        // Check for function call (e.g., COUNT, SUM, AVG, etc.)
        const upperToken = token.toUpperCase();
        if (["COUNT", "SUM", "AVG", "MIN", "MAX", "UPPER", "LOWER", "LENGTH", "TRIM", "SUBSTR", "SUBSTRING", "ABS", "ROUND", "COALESCE"].includes(upperToken)) {
            const funcName = this.advance();
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
                    const argName = this.advance();
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
        const colName = this.advance();
        return {
            type: "COLUMN",
            name: colName,
        };
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        this.consume("SELECT", "Expected SELECT");
        // Parse columns
        const columns = [];
        if (this.peek() === "*") {
            this.advance();
            columns.push({ expr: { type: "STAR" } });
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
                let alias;
                // Check for AS alias
                if (((_a = this.peek()) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === "AS") {
                    this.advance();
                    alias = this.advance();
                }
                else if (this.peek() && !this.peek().match(/^[,()]/)) {
                    // Implicit alias (no AS keyword) - but only if next token isn't a comma or FROM
                    const nextToken = (_b = this.peek()) === null || _b === void 0 ? void 0 : _b.toUpperCase();
                    if (nextToken && nextToken !== "FROM" && nextToken !== "WHERE" && nextToken !== "GROUP" && nextToken !== "ORDER" && nextToken !== "LIMIT" && nextToken !== "OFFSET") {
                        alias = this.advance();
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
        const tableName = this.advance();
        // Parse WHERE clause
        let where;
        if (((_c = this.peek()) === null || _c === void 0 ? void 0 : _c.toUpperCase()) === "WHERE") {
            this.advance();
            where = {
                expr: this.parseLogicalOr(),
            };
        }
        // Parse GROUP BY clause
        let groupBy;
        if (((_d = this.peek()) === null || _d === void 0 ? void 0 : _d.toUpperCase()) === "GROUP") {
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
        if (((_e = this.peek()) === null || _e === void 0 ? void 0 : _e.toUpperCase()) === "HAVING") {
            this.advance();
            having = this.parseLogicalOr();
        }
        // Parse ORDER BY clause
        let orderBy;
        if (((_f = this.peek()) === null || _f === void 0 ? void 0 : _f.toUpperCase()) === "ORDER") {
            this.advance();
            this.consume("BY", "Expected BY");
            orderBy = [];
            while (true) {
                const column = this.advance();
                const desc = ((_g = this.peek()) === null || _g === void 0 ? void 0 : _g.toUpperCase()) === "DESC";
                if (desc) {
                    this.advance();
                }
                else if (((_h = this.peek()) === null || _h === void 0 ? void 0 : _h.toUpperCase()) === "ASC") {
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
        if (((_j = this.peek()) === null || _j === void 0 ? void 0 : _j.toUpperCase()) === "LIMIT") {
            this.advance();
            limit = Number.parseInt(this.advance());
        }
        // Parse OFFSET clause
        let offset;
        if (((_k = this.peek()) === null || _k === void 0 ? void 0 : _k.toUpperCase()) === "OFFSET") {
            this.advance();
            offset = Number.parseInt(this.advance());
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
        var _a;
        this.consume("UPDATE", "Expected UPDATE");
        const tableName = this.advance();
        this.consume("SET", "Expected SET");
        const assignments = [];
        while (true) {
            const column = this.advance();
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
        if (((_a = this.peek()) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === "WHERE") {
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
    parseDelete() {
        var _a;
        this.consume("DELETE", "Expected DELETE");
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
        if (op === "="
            || op === "!="
            || op === "<>"
            || op === "<"
            || op === ">"
            || op === "<="
            || op === ">="
            || op === "LIKE"
            || op === "IN"
            || op === "IS") {
            this.advance();
            // Handle IS NULL / IS NOT NULL specially
            if (op === "IS") {
                const notToken = (_b = this.peek()) === null || _b === void 0 ? void 0 : _b.toUpperCase();
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
            return { type: "PARAMETER", position: this.parameterCount++ };
        }
        if ((token === null || token === void 0 ? void 0 : token.startsWith("'")) || (token === null || token === void 0 ? void 0 : token.startsWith(`"`))) {
            const str = this.advance();
            return str.substring(1, str.length - 1); // Remove quotes
        }
        if (/^\d+$/.test(token || "")) {
            return Number.parseInt(this.advance(), 10);
        }
        // Handle NULL keyword
        if ((token === null || token === void 0 ? void 0 : token.toUpperCase()) === "NULL") {
            this.advance();
            return null;
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
/* harmony import */ var _executor_delete_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../executor/delete.js */ "./build/executor/delete.js");
/* harmony import */ var _executor_insert_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../executor/insert.js */ "./build/executor/insert.js");
/* harmony import */ var _executor_select_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../executor/select.js */ "./build/executor/select.js");
/* harmony import */ var _executor_update_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../executor/update.js */ "./build/executor/update.js");
/* harmony import */ var _parser_parser_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../parser/parser.js */ "./build/parser/parser.js");
/* harmony import */ var _schema_manager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../schema/manager.js */ "./build/schema/manager.js");
/* harmony import */ var _utils_logger_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../utils/logger.js */ "./build/utils/logger.js");
/**
 * HTTP request handler for SQL execution.
 * Entry point for doPost() requests.
 */








// Global transaction state (persists across HTTP requests)
const transactionStates = new Map();
// Get or create transaction state for current user
function getTransactionState(userId) {
    if (!transactionStates.has(userId)) {
        transactionStates.set(userId, {
            inTransaction: false,
        });
    }
    return transactionStates.get(userId);
}
class RequestHandler {
    handle(body) {
        const requestId = this.generateRequestId();
        _utils_logger_js__WEBPACK_IMPORTED_MODULE_7__.logger.setContext({ requestId });
        try {
            const request = JSON.parse(body);
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_7__.logger.debug("Parsed request", {
                statementCount: request.statements.length,
            });
            // Get execution context
            const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
            const schemaManager = new _schema_manager_js__WEBPACK_IMPORTED_MODULE_6__.SchemaManager({ spreadsheet });
            const schemas = schemaManager.loadSchemasSync();
            // Get user ID for transaction state (use current user or default)
            const userId = Session.getActiveUser().getEmail();
            const txState = getTransactionState(userId);
            const context = {
                spreadsheet,
                schemas,
                inTransaction: txState.inTransaction,
                transactionSnapshot: txState.transactionSnapshot,
            };
            // Execute statements
            const results = [];
            for (const stmt of request.statements) {
                const result = this.executeStatementSync(stmt.sql, stmt.args || [], context);
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
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_7__.logger.error("Request handling failed", err);
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
    executeStatementSync(sql, args, context) {
        var _a;
        _utils_logger_js__WEBPACK_IMPORTED_MODULE_7__.logger.debug("Executing statement", { sql: sql.substring(0, 100) });
        try {
            // Parse
            const statements = _parser_parser_js__WEBPACK_IMPORTED_MODULE_5__.parser.parse(sql);
            if (statements.length === 0) {
                throw new Error("No valid SQL statement found");
            }
            const stmt = statements[0];
            // Bind parameters
            const boundStmt = this.bindParameters(stmt, args);
            // Execute based on type
            switch (boundStmt.type) {
                case "CREATE_TABLE": {
                    const createExec = new _executor_create_js__WEBPACK_IMPORTED_MODULE_0__.CreateTableExecutor(context);
                    return createExec.executeSync(boundStmt.stmt);
                }
                case "INSERT": {
                    const insertExec = new _executor_insert_js__WEBPACK_IMPORTED_MODULE_2__.InsertExecutor(context);
                    return insertExec.executeSync(boundStmt.stmt);
                }
                case "SELECT": {
                    const selectExec = new _executor_select_js__WEBPACK_IMPORTED_MODULE_3__.SelectExecutor(context);
                    return selectExec.executeSync(boundStmt.stmt);
                }
                case "UPDATE": {
                    const updateExec = new _executor_update_js__WEBPACK_IMPORTED_MODULE_4__.UpdateExecutor(context);
                    return updateExec.executeSync(boundStmt.stmt);
                }
                case "DELETE": {
                    const deleteExec = new _executor_delete_js__WEBPACK_IMPORTED_MODULE_1__.DeleteExecutor(context);
                    return deleteExec.executeSync(boundStmt.stmt);
                }
                case "BEGIN": {
                    const userId = Session.getActiveUser().getEmail();
                    const txState = getTransactionState(userId);
                    txState.inTransaction = true;
                    txState.transactionSnapshot = new Map();
                    context.inTransaction = true;
                    context.transactionSnapshot = txState.transactionSnapshot;
                    return { columns: [], rows: [], affectedRowCount: 0 };
                }
                case "COMMIT": {
                    const userId = Session.getActiveUser().getEmail();
                    const txState = getTransactionState(userId);
                    txState.inTransaction = false;
                    txState.transactionSnapshot = undefined;
                    context.inTransaction = false;
                    context.transactionSnapshot = undefined;
                    return { columns: [], rows: [], affectedRowCount: 0 };
                }
                case "ROLLBACK": {
                    const userId = Session.getActiveUser().getEmail();
                    const txState = getTransactionState(userId);
                    // Restore all snapshots
                    if (context.transactionSnapshot
                        && context.transactionSnapshot.size > 0) {
                        const snapshots = Array.from(context.transactionSnapshot.entries());
                        for (const [tableName, snapshotData] of snapshots) {
                            // Restore by writing back the snapshot
                            const sheet = context.spreadsheet.getSheetByName(tableName);
                            if (sheet && snapshotData.length > 0) {
                                try {
                                    const range = sheet.getRange(1, 1, snapshotData.length, ((_a = snapshotData[0]) === null || _a === void 0 ? void 0 : _a.length) || 1);
                                    range.setValues(snapshotData);
                                    // Delete any extra rows added during transaction
                                    const currentLastRow = sheet.getLastRow();
                                    if (currentLastRow > snapshotData.length) {
                                        for (let i = currentLastRow; i > snapshotData.length; i--) {
                                            sheet.deleteRow(i);
                                        }
                                    }
                                    _utils_logger_js__WEBPACK_IMPORTED_MODULE_7__.logger.info(`Restored table ${tableName} from transaction snapshot`);
                                }
                                catch (err) {
                                    _utils_logger_js__WEBPACK_IMPORTED_MODULE_7__.logger.error(`Failed to restore table ${tableName}`, err);
                                    throw err;
                                }
                            }
                        }
                    }
                    txState.inTransaction = false;
                    txState.transactionSnapshot = undefined;
                    context.inTransaction = false;
                    context.transactionSnapshot = undefined;
                    return { columns: [], rows: [], affectedRowCount: 0 };
                }
                default:
                    throw new Error(`Statement type not yet implemented: ${stmt.type}`);
            }
        }
        catch (err) {
            _utils_logger_js__WEBPACK_IMPORTED_MODULE_7__.logger.error("Statement execution failed", err);
            throw err;
        }
    }
    bindParameters(stmt, args) {
        // Deep copy the statement to avoid mutating the original
        const copy = JSON.parse(JSON.stringify(stmt));
        // Walk the AST and replace parameter placeholders
        const replacer = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(replacer);
            }
            if (obj === null || typeof obj !== "object") {
                return obj;
            }
            if (obj.type === "PARAMETER") {
                const position = obj.position;
                if (position >= args.length) {
                    throw new Error(`Parameter ${position} not provided (got ${args.length} args)`);
                }
                // Convert parameter to literal
                return {
                    type: "LITERAL",
                    value: args[position],
                };
            }
            // Recursively process object properties
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = replacer(value);
            }
            return result;
        };
        return replacer(copy);
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