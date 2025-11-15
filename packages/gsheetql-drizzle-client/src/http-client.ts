/**
 * HTTP transport layer for communicating with GSheetQL endpoint
 */

import type { GSheetQLConfig } from "./driver.js";

export type GSheetQLResponse = {
  success: boolean;
  result?: {
    data: {
      results: Array<{
        columns: string[];
        rows: unknown[][];
        affectedRowCount: number;
        lastInsertRowId?: number;
      }>;
      metadata: {
        schemaVersion: number;
      };
    };
  };
  error?: {
    code: string;
    message: string;
    debugId?: string;
  };
};

export class GSheetQLHttpClient {
  private endpoint: string;
  private apiKey?: string;
  private googleAuthToken?: string;
  private timeout: number;
  private debug: boolean;

  constructor(config: GSheetQLConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.googleAuthToken = config.googleAuthToken;
    this.timeout = config.timeout ?? 30000;
    this.debug = config.debug ?? false;

    if (!this.endpoint) {
      throw new Error("GSheetQL endpoint URL is required");
    }
  }

  /**
   * Execute a single SQL statement
   */
  async execute(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ columns: string[]; rows: unknown[][]; affectedRowCount: number; lastInsertRowId?: number }> {
    const request = {
      statements: [{ sql, args: params }],
    };

    // Add auth if provided
    const auth: any = {};
    if (this.apiKey)
      auth.apiKey = this.apiKey;
    if (this.googleAuthToken)
      auth.googleAuthToken = this.googleAuthToken;
    if (Object.keys(auth).length > 0) {
      (request as any).auth = auth;
    }

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log("[GSheetQL] Executing:", {
        sql: sql.substring(0, 100),
        paramCount: params.length,
      });
    }

    try {
      const response = await this.fetchWithTimeout(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as GSheetQLResponse;

      if (!data.success) {
        throw new Error(data.error?.message || "Unknown GSheetQL error");
      }

      if (!data.result?.data.results[0]) {
        throw new Error("No result from GSheetQL");
      }

      const result = data.result.data.results[0];

      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("[GSheetQL] Result:", {
          rowCount: result.rows.length,
          columnCount: result.columns.length,
          affectedRowCount: result.affectedRowCount,
        });
      }

      return {
        columns: result.columns,
        rows: result.rows,
        affectedRowCount: result.affectedRowCount,
        lastInsertRowId: result.lastInsertRowId,
      };
    } catch (error) {
      if (this.debug) {
        console.error("[GSheetQL] Error:", error);
      }
      throw error;
    }
  }

  /**
   * Execute multiple SQL statements in a batch
   */
  async batch(statements: { sql: string; args: unknown[] }[]): Promise<Array<{ columns: string[]; rows: unknown[][]; affectedRowCount: number; lastInsertRowId?: number }>> {
    const request = {
      statements: statements.map(stmt => ({ sql: stmt.sql, args: stmt.args })),
    };

    // Add auth if provided
    const auth: any = {};
    if (this.apiKey) {
      auth.apiKey = this.apiKey;
    }
    if (this.googleAuthToken) {
      auth.googleAuthToken = this.googleAuthToken;
    }
    if (Object.keys(auth).length > 0) {
      (request as any).auth = auth;
    }

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log("[GSheetQL] Batch executing:", statements.length, "statements");
    }

    try {
      const response = await this.fetchWithTimeout(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as GSheetQLResponse;

      if (!data.success) {
        throw new Error(data.error?.message || "Unknown GSheetQL error");
      }

      return data.result?.data.results || [];
    } catch (error) {
      if (this.debug) {
        console.error("[GSheetQL] Batch error:", error);
      }
      throw error;
    }
  }

  /**
   * Fetch with timeout support
   */
  private fetchWithTimeout(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    return fetch(url, {
      ...options,
      signal: controller.signal,
    })
      .finally(() => clearTimeout(timeoutId));
  }
}
