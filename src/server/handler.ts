/**
 * HTTP request handler for SQL execution.
 * Entry point for doPost() requests.
 */

import { CreateTableExecutor } from "../executor/create.js";
import { parser } from "../parser/parser.js";
import { SchemaManager } from "../schema/manager.js";
import type { ApiResponse } from "../types/common.js";
import type { BatchQueryResult, ExecutionContext } from "../types/execution.js";
import { logger } from "../utils/logger.js";

export type ExecuteRequest = {
  statements: Array<{
    sql: string;
    args?: unknown[];
  }>;
};

export class RequestHandler {
  handle(body: string): string {
    const requestId = this.generateRequestId();
    logger.setContext({ requestId });

    try {
      const request = JSON.parse(body) as ExecuteRequest;
      logger.debug("Parsed request", {
        statementCount: request.statements.length,
      });

      // Get execution context
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const schemaManager = new SchemaManager({ spreadsheet });
      const schemas = schemaManager.loadSchemasSync();

      const context: ExecutionContext = {
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

      const response: ApiResponse<BatchQueryResult> = {
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
    } catch (err) {
      logger.error("Request handling failed", err);
      const error = err instanceof Error ? err : new Error(String(err));

      const errorResponse: ApiResponse = {
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

  private executeStatementSync(sql: string, context: ExecutionContext): any {
    logger.debug("Executing statement", { sql: sql.substring(0, 100) });

    try {
      // Parse
      const statements = parser.parse(sql);
      if (statements.length === 0) {
        throw new Error("No valid SQL statement found");
      }

      const stmt = statements[0];

      // Execute based on type
      switch (stmt.type) {
        case "CREATE_TABLE": {
          const createExec = new CreateTableExecutor(context);
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
    } catch (err) {
      logger.error("Statement execution failed", err);
      throw err;
    }
  }

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${random}`;
  }
}
