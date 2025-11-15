/**
 * Shared response and error types for SQL execution.
 */

/** Error codes compatible with libsql protocol */
export type ErrorCode =
  | "SQLITE_ERROR"
  | "SQLITE_CONSTRAINT"
  | "SQLITE_BUSY"
  | "SHEETS_API_ERROR"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR";

/** Standard error response shape */
export type SQLError = {
  code: ErrorCode;
  message: string;
  debugId?: string;
  details?: Record<string, unknown>;
};

/** Standard success response for queries */
export type ExecutionResult<T = unknown> = {
  data: T;
  warnings?: string[];
  metadata?: {
    schemaVersion?: number;
    executionTimeMs?: number;
  };
};

/** HTTP response wrapper - either success or error */
export type ApiResponse<T = unknown> =
  | { success: true; result: ExecutionResult<T> }
  | { success: false; error: SQLError };
