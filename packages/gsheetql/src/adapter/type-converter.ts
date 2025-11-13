/**
 * Type conversion between SQL types and string storage.
 * All data in Sheets is stored as strings; conversions happen at app layer.
 */

import type { SQLType, SQLValue } from "../types/sql.js";

export class TypeConverter {
  /**
   * Convert string from Sheets to SQL value.
   * Empty string always represents NULL.
   */
  static stringToSQL(value: string, sqlType: SQLType): SQLValue {
    if (value === "") {
      return null;
    }

    switch (sqlType) {
      case "INTEGER":
        return Number.parseInt(value, 10);
      case "REAL":
        return Number.parseFloat(value);
      case "TEXT":
        return value;
      case "BLOB":
        return value; // Already encoded as base64 or hex string
      case "NULL":
        return null;
      default:
        return value;
    }
  }

  /**
   * Convert SQL value to string for storage in Sheets.
   */
  static sqlToString(value: SQLValue): string {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  }

  /**
   * Infer SQL type from string value.
   * Conservative: prefer TEXT unless clearly INTEGER or REAL.
   */
  static inferType(value: string): SQLType {
    if (value === "") {
      return "NULL";
    }

    // Check INTEGER: /^-?\d+$/
    if (/^-?\d+$/.test(value)) {
      return "INTEGER";
    }

    // Check REAL: /^-?\d+\.\d+$/
    if (/^-?\d+\.\d+$/.test(value)) {
      return "REAL";
    }

    // Default to TEXT
    return "TEXT";
  }

  /**
   * Coerce a value to a target SQL type.
   * Used during INSERT/UPDATE when column type is known.
   */
  static coerceValue(value: SQLValue, targetType: SQLType): SQLValue {
    if (value === null || value === undefined) {
      return null;
    }

    switch (targetType) {
      case "INTEGER":
        if (typeof value === "number")
          return Math.floor(value);
        if (typeof value === "string")
          return Number.parseInt(value, 10);
        if (typeof value === "boolean")
          return value ? 1 : 0;
        return Number.NaN;

      case "REAL":
        if (typeof value === "number")
          return value;
        if (typeof value === "string")
          return Number.parseFloat(value);
        if (typeof value === "boolean")
          return value ? 1.0 : 0.0;
        return Number.NaN;

      case "TEXT":
        return String(value);

      case "BLOB":
        return String(value);

      case "NULL":
        return null;

      default:
        return value;
    }
  }
}
