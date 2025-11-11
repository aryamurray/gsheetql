// Table.ts
import { DERIVEDTABLE, VirtualFields, VirtualField, CalculatedField } from "./Views.js";
import { TableData } from "./TableData.js";

class Logger {
  static log(msg: string): void {
    console.log(msg);
  }
}

export class Table {
  readonly tableName: string;
  tableData: any[][] = [];
  hasColumnTitle = true;
  schema: Schema;

  constructor(tableName: string) {
    this.tableName = tableName.toUpperCase();
    this.schema = new Schema().setTableName(tableName).setTable(this);
  }

  setTableAlias(tableAlias: string[]): this {
    this.schema.setTableAlias(tableAlias);
    return this;
  }

  setHasColumnTitle(hasTitle: boolean): this {
    this.hasColumnTitle = hasTitle;
    return this;
  }

  loadNamedRangeData(namedRange: string, cacheSeconds = 0): this {
    this.tableData = TableData.loadTableData(namedRange, cacheSeconds);

    if (!this.hasColumnTitle) Table.addColumnLetters(this.tableData);

    Logger.log(`Load Data: Range=${namedRange}. Items=${this.tableData.length}`);
    this.loadSchema();

    return this;
  }

  loadArrayData(tableData: any[][]): this {
    if (!tableData?.length) return this;

    if (!this.hasColumnTitle) Table.addColumnLetters(tableData);

    this.tableData = Table.removeEmptyRecordsAtEndOfTable(tableData);
    this.loadSchema();

    return this;
  }

  static removeEmptyRecordsAtEndOfTable(tableData: any[][]): any[][] {
    let blankLines = 0;
    for (let i = tableData.length - 1; i > 0; i--) {
      if (tableData[i].join().replaceAll(",", "").length > 0) break;
      blankLines++;
    }
    return tableData.slice(0, tableData.length - blankLines);
  }

  static addColumnLetters(tableData: any[][]): any[][] {
    if (tableData.length === 0) return [[]];

    const newTitleRow = Array.from(
      { length: tableData[0].length },
      (_, i) => Table.numberToSheetColumnLetter(i + 1)
    );

    tableData.unshift(newTitleRow);
    return tableData;
  }

  static numberToSheetColumnLetter(number: number): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";

    let charIndex = number % alphabet.length;
    let quotient = Math.floor(number / alphabet.length);

    if (charIndex - 1 === -1) {
      charIndex = alphabet.length;
      quotient--;
    }

    result = alphabet.charAt(charIndex - 1) + result;

    if (quotient >= 1) {
      result = Table.numberToSheetColumnLetter(quotient) + result;
    }

    return result;
  }

  loadSchema(): this {
    this.schema.setTableData(this.tableData).load();
    return this;
  }

  getFieldColumn(fieldName: string): number {
    return this.schema.getFieldColumn(fieldName);
  }

  getFieldColumns(fieldNames: string[]): number[] {
    return this.schema.getFieldColumns(fieldNames);
  }

  getAllVirtualFields(): VirtualField[] {
    return this.schema.getAllVirtualFields();
  }

  getAllFieldNames(): string[] {
    return this.schema.getAllFieldNames();
  }

  getAllExtendedNotationFieldNames(aliasName = ""): string[] {
    return this.schema.getAllExtendedNotationFieldNames(aliasName);
  }

  getColumnCount(): number {
    return this.getAllExtendedNotationFieldNames().length;
  }

  getRecords(startRecord: number, lastRecord: number, fields: number[]): any[][] {
    const selectedRecords: any[][] = [];
    const minStart = Math.max(startRecord, 1);
    const maxEnd = lastRecord < 0 ? this.tableData.length - 1 : lastRecord;

    for (let i = minStart; i <= maxEnd && i < this.tableData.length; i++) {
      const row = fields.map((col) => this.tableData[i][col]);
      selectedRecords.push(row);
    }

    return selectedRecords;
  }

  createKeyFieldRecordMap(
    fieldName: string,
    calcSqlField: CalculatedField | null = null,
    calcField = ""
  ): Map<string, number[]> {
    const indexedFieldName = fieldName.trim().toUpperCase();
    const fieldValuesMap = new Map<string, number[]>();

    const fieldIndex = calcSqlField ? null : this.schema.getFieldColumn(indexedFieldName);

    for (let i = 1; i < this.tableData.length; i++) {
      let value = calcSqlField
        ? calcSqlField.evaluateCalculatedField(calcField, i)
        : this.tableData[i][fieldIndex!];

      if (value !== null && value !== undefined) {
        const key = typeof value === "string" ? value.toUpperCase() : String(value);
        const rowNumbers = fieldValuesMap.get(key) ?? [];
        rowNumbers.push(i);
        fieldValuesMap.set(key, rowNumbers);
      }
    }

    return fieldValuesMap;
  }

  createCalcFieldRecordMap(
    calcSqlField: CalculatedField,
    calcField: string
  ): Map<string, number[]> {
    return this.createKeyFieldRecordMap("", calcSqlField, calcField);
  }

  concat(concatTable: Table): void {
    const fieldsThisTable = this.schema.getAllFieldNames();
    const fieldColumns = concatTable.getFieldColumns(fieldsThisTable);
    const data = concatTable.getRecords(1, -1, fieldColumns);
    this.tableData = this.tableData.concat(data);
  }
}

export class Schema {
  tableName = "";
  tableAlias: string[] = [];
  tableData: any[][] = [];
  tableInfo: Table | null = null;
  isDerivedTable = false;
  fields = new Map<string, number | null>();
  virtualFields = new VirtualFields();

  setTableName(tableName: string): this {
    this.tableName = tableName.toUpperCase();
    this.isDerivedTable = this.tableName === DERIVEDTABLE;
    return this;
  }

  setTableAlias(tableAlias: string[]): this {
    this.tableAlias = Array.from(
      new Set(tableAlias.filter((a) => a !== "").map((a) => a.toUpperCase()))
    );
    return this;
  }

  setTableData(tableData: any[][]): this {
    this.tableData = tableData;
    return this;
  }

  setTable(tableInfo: Table): this {
    this.tableInfo = tableInfo;
    return this;
  }

  getAllFieldNames(): string[] {
    return [...this.fields.keys()].filter((k) => k !== "*") as string[];
  }

  getAllExtendedNotationFieldNames(aliasName = ""): string[] {
    const tableName = aliasName === "" ? this.tableName : aliasName;
    const fieldNames: string[] = [];

    for (const [key, value] of this.fields.entries()) {
      if (value !== null) {
        const parts = key.split(".");
        if (
          fieldNames[value] === undefined ||
          (parts.length === 2 && (parts[0] === tableName || this.isDerivedTable))
        ) {
          fieldNames[value] = key;
        }
      }
    }

    return fieldNames;
  }

  getAllVirtualFields(): VirtualField[] {
    return this.virtualFields.getAllVirtualFields();
  }

  getFieldColumn(field: string): number {
    return this.getFieldColumns([field])[0];
  }

  getFieldColumns(fieldNames: string[]): number[] {
    return fieldNames.map((f) => this.fields.get(f.trim().toUpperCase()) ?? -1);
  }

  load(): this {
    this.fields = new Map();
    this.virtualFields = new VirtualFields();

    if (!this.tableData.length) return this;

    const titleRow = this.tableData[0];

    titleRow.forEach((baseColumnName, colNum) => {
      const fieldVariants = this.getColumnNameVariants(baseColumnName);
      const columnName = fieldVariants.columnName;

      this.setFieldVariantsColumnNumber(fieldVariants, colNum);

      if (columnName) {
        const virtualField = new VirtualField(columnName);
        this.virtualFields.add(virtualField, true);
      }
    });

    this.fields.set("*", null);
    return this;
  }

  private getColumnNameVariants(colName: string): {
    columnName: string;
    columnNameVariants: string[];
  } {
    const columnName = colName.trim().toUpperCase().replace(/\s/g, "_");
    const columnNameVariants: string[] = [];

    if (!columnName.includes(".")) {
      columnNameVariants.push(`${this.tableName}.${columnName}`);
      for (const alias of this.tableAlias) {
        columnNameVariants.push(`${alias}.${columnName}`);
      }
    }

    return { columnName, columnNameVariants };
  }

  private setFieldVariantsColumnNumber(
    fieldVariants: { columnName: string; columnNameVariants: string[] },
    colNum: number
  ): void {
    if (fieldVariants.columnName) {
      this.fields.set(fieldVariants.columnName, colNum);
      if (!this.isDerivedTable) {
        for (const fld of fieldVariants.columnNameVariants) {
          this.fields.set(fld, colNum);
        }
      }
    }
  }
}
