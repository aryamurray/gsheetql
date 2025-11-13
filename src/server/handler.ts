/**
 * HTTP request handler for SQL execution.
 * Entry point for doPost() requests.
 */

import { CreateTableExecutor } from "../executor/create.js";
import { DeleteExecutor } from "../executor/delete.js";
import { InsertExecutor } from "../executor/insert.js";
import { SelectExecutor } from "../executor/select.js";
import { UpdateExecutor } from "../executor/update.js";
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

// Global transaction state (persists across HTTP requests)
const transactionStates = new Map<
  string,
  {
    inTransaction: boolean;
    transactionSnapshot?: Map<string, any[][]>;
  }
>();

// Get or create transaction state for current user
function getTransactionState(userId: string) {
  if (!transactionStates.has(userId)) {
    transactionStates.set(userId, {
      inTransaction: false,
    });
  }
  return transactionStates.get(userId)!;
}

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

      // Get user ID for transaction state (use current user or default)
      const userId = Session.getActiveUser().getEmail();
      const txState = getTransactionState(userId);

      const context: ExecutionContext = {
        spreadsheet,
        schemas,
        inTransaction: txState.inTransaction,
        transactionSnapshot: txState.transactionSnapshot,
      };

      // Execute statements
      const results = [];
      for (const stmt of request.statements) {
        const result = this.executeStatementSync(
          stmt.sql,
          stmt.args || [],
          context,
        );
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

  private executeStatementSync(
    sql: string,
    args: unknown[],
    context: ExecutionContext,
  ): any {
    logger.debug("Executing statement", { sql: sql.substring(0, 100) });

    try {
      // Parse
      const statements = parser.parse(sql);
      if (statements.length === 0) {
        throw new Error("No valid SQL statement found");
      }

      const stmt = statements[0];

      // Bind parameters
      const boundStmt = this.bindParameters(stmt, args);

      // Execute based on type
      switch (boundStmt.type) {
        case "CREATE_TABLE": {
          const createExec = new CreateTableExecutor(context);
          return createExec.executeSync(boundStmt.stmt);
        }

        case "INSERT": {
          const insertExec = new InsertExecutor(context);
          return insertExec.executeSync(boundStmt.stmt);
        }

        case "SELECT": {
          const selectExec = new SelectExecutor(context);
          return selectExec.executeSync(boundStmt.stmt);
        }

        case "UPDATE": {
          const updateExec = new UpdateExecutor(context);
          return updateExec.executeSync(boundStmt.stmt);
        }

        case "DELETE": {
          const deleteExec = new DeleteExecutor(context);
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
          if (
            context.transactionSnapshot
            && context.transactionSnapshot.size > 0
          ) {
            const snapshots = Array.from(context.transactionSnapshot.entries());
            for (const [tableName, snapshotData] of snapshots) {
              // Restore by writing back the snapshot
              const sheet = context.spreadsheet.getSheetByName(tableName);
              if (sheet && snapshotData.length > 0) {
                try {
                  const range = sheet.getRange(
                    1,
                    1,
                    snapshotData.length,
                    snapshotData[0]?.length || 1,
                  );
                  range.setValues(
                    snapshotData as (string | number | boolean)[][],
                  );

                  // Delete any extra rows added during transaction
                  const currentLastRow = sheet.getLastRow();
                  if (currentLastRow > snapshotData.length) {
                    for (let i = currentLastRow; i > snapshotData.length; i--) {
                      sheet.deleteRow(i);
                    }
                  }

                  logger.info(
                    `Restored table ${tableName} from transaction snapshot`,
                  );
                } catch (err) {
                  logger.error(`Failed to restore table ${tableName}`, err);
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
    } catch (err) {
      logger.error("Statement execution failed", err);
      throw err;
    }
  }

  private bindParameters(stmt: any, args: unknown[]): any {
    // Deep copy the statement to avoid mutating the original
    const copy = JSON.parse(JSON.stringify(stmt));

    // Walk the AST and replace parameter placeholders
    const replacer = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(replacer);
      }

      if (obj === null || typeof obj !== "object") {
        return obj;
      }

      if (obj.type === "PARAMETER") {
        const position = obj.position;
        if (position >= args.length) {
          throw new Error(
            `Parameter ${position} not provided (got ${args.length} args)`,
          );
        }
        // Convert parameter to literal
        return {
          type: "LITERAL",
          value: args[position],
        };
      }

      // Recursively process object properties
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replacer(value);
      }
      return result;
    };

    return replacer(copy);
  }

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${random}`;
  }
}
