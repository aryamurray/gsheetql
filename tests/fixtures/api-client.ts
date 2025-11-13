/**
 * API client for executing SQL queries against gsheetql
 */

export interface ApiResponse {
  success: boolean;
  result?: {
    data: {
      results: Array<{
        columns: string[];
        rows: any[][];
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
}

export class SqlClient {
  private apiUrl: string;
  private maxRetries = 5;
  private retryDelayMs = 500;

  constructor(apiUrl: string = process.env.VITE_API_URL || "") {
    if (!apiUrl) {
      throw new Error(
        "API URL not configured. Set VITE_API_URL environment variable or pass it to SqlClient constructor",
      );
    }
    this.apiUrl = apiUrl;
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute a single SQL statement with retry logic for rate limits
   */
  async execute(sql: string): Promise<ApiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            statements: [{ sql }],
          }),
        });

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          console.warn(
            `Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${this.maxRetries})`,
          );
          await this.sleep(delay);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries - 1 && (error as any)?.message?.includes("429")) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  /**
   * Execute SQL and return first result (throws if error)
   */
  async query(sql: string) {
    const response = await this.execute(sql);

    if (!response.success) {
      throw new Error(`SQL Error: ${response.error?.message || "Unknown error"}`);
    }

    return response.result!.data.results[0];
  }

  /**
   * Execute multiple SQL statements in sequence
   */
  async executeBatch(statements: string[]) {
    const results = [];
    for (const sql of statements) {
      const response = await this.execute(sql);
      if (!response.success) {
        throw new Error(`SQL Error: ${response.error?.message || "Unknown error"}`);
      }
      results.push(response.result!.data.results[0]);
    }
    return results;
  }

  /**
   * Helper to create a table
   */
  async createTable(name: string, schema: string) {
    return this.query(`CREATE TABLE ${name} (${schema})`);
  }

  /**
   * Helper to drop/clear a table by creating a new one
   */
  async clearTable(name: string) {
    // In GAS, we can't really drop tables easily, so this is a no-op
    // Tests should create unique table names or use beforeEach
  }
}

/**
 * Get API client with URL from environment or test setup
 */
export function getApiClient(): SqlClient {
  const url = process.env.VITE_API_URL || process.env.TEST_API_URL;
  if (!url) {
    throw new Error(
      "API URL not set. Set VITE_API_URL or TEST_API_URL environment variable",
    );
  }
  return new SqlClient(url);
}
