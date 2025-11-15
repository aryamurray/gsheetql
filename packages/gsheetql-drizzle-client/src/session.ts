import { entityKind } from "drizzle-orm";
import type { Logger } from "drizzle-orm/logger";
import { NoopLogger } from "drizzle-orm/logger";
import type { RelationalSchemaConfig, TablesRelationalConfig } from "drizzle-orm/relations";
import { fillPlaceholders, type Query, sql } from "drizzle-orm/sql";
import { SQLiteTransaction } from "drizzle-orm/sqlite-core";
import type { SQLiteAsyncDialect } from "drizzle-orm/sqlite-core/dialect";
import type { SelectedFieldsOrdered } from "drizzle-orm/sqlite-core/query-builders/select.types";
import {
  SQLitePreparedQuery as PreparedQueryBase,
  type PreparedQueryConfig as PreparedQueryConfigBase,
  type SQLiteExecuteMethod,
  SQLiteSession,
  type SQLiteTransactionConfig,
} from "drizzle-orm/sqlite-core/session";
import { type Cache, NoopCache } from "drizzle-orm/cache/core";
import type { WithCacheConfig } from "drizzle-orm/cache/core/types";
import { mapResultRow } from "drizzle-orm/utils";
import type { BatchItem } from "drizzle-orm/batch";
import type { PreparedQuery } from "drizzle-orm/session";

import type { GSheetQLConfig } from "./driver.js";
import { GSheetQLHttpClient } from "./http-client.js";

export type GSheetQLSessionOptions = {
  logger?: Logger;
  cache?: Cache;
};

type PreparedQueryConfig = Omit<PreparedQueryConfigBase, "statement" | "run">;

export class GSheetQLSession<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> extends SQLiteSession<"async", any, TFullSchema, TSchema> {
  static override readonly [entityKind]: string = "GSheetQLSession";

  private logger: Logger;
  private cache: Cache;
  private httpClient: GSheetQLHttpClient;

  constructor(
    private config: GSheetQLConfig,
    dialect: SQLiteAsyncDialect,
    private schema: RelationalSchemaConfig<TSchema> | undefined,
		options: GSheetQLSessionOptions = {},
  ) {
    super(dialect);
    this.logger = options.logger ?? new NoopLogger();
    this.cache = options.cache ?? new NoopCache();
    this.httpClient = new GSheetQLHttpClient(config);
  }

  prepareQuery<T extends Omit<PreparedQueryConfig, "run">>(
    query: Query,
    fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    isResponseInArrayMode: boolean,
    customResultMapper?: (rows: unknown[][]) => unknown,
    queryMetadata?: {
      type: "select" | "update" | "delete" | "insert";
      tables: string[];
    },
    cacheConfig?: WithCacheConfig,
  ): PreparedQuery<T> {
    return new PreparedQuery(
      this.httpClient,
      query,
      this.logger,
      this.cache,
      queryMetadata,
      cacheConfig,
      fields,
      executeMethod,
      isResponseInArrayMode,
      customResultMapper,
    );
  }

  async execute(query: string, params?: unknown[]): Promise<any> {
    this.logger.logQuery(query, params ?? []);
    return this.httpClient.execute(query, params ?? []);
  }

  override async run(query: sql.SQL): Promise<any> {
    const preparedQuery = this.prepareQuery(
      this.dialect.sqlToQuery(query),
      undefined,
      'run',
      false,
      undefined,
      undefined,
      undefined,
    );
    return preparedQuery.run();
  }

  async batch<T extends BatchItem<'sqlite'>[] | readonly BatchItem<'sqlite'>[]>(queries: T) {
    const preparedQueries: PreparedQuery[] = [];
    const statements: { sql: string; args: unknown[] }[] = [];

    for (const query of queries) {
      const preparedQuery = query._prepare();
      const builtQuery = preparedQuery.getQuery();
      preparedQueries.push(preparedQuery);
      statements.push({ sql: builtQuery.sql, args: builtQuery.params });
    }

    const batchResults = await this.httpClient.batch(statements);
    return batchResults.map((result, i) => preparedQueries[i]!.mapResult(result, true));
  }

  override async transaction<T>(
    transaction: (tx: GSheetQLTransaction<TFullSchema, TSchema>) => Promise<T>,
		config: SQLiteTransactionConfig = {},
  ): Promise<T> {
    const tx = new GSheetQLTransaction("async", this.dialect, this, this.schema);

    await this.run(sql.raw("BEGIN TRANSACTION"));

    try {
      const result = await transaction(tx);
      await this.run(sql.raw("COMMIT"));
      return result;
    } catch (err) {
      await this.run(sql.raw("ROLLBACK"));
      throw err;
    }
  }

  override extractRawAllValueFromBatchResult(result: unknown): unknown {
    return (result as any).rows;
  }

  override extractRawGetValueFromBatchResult(result: unknown): unknown {
    return (result as any).rows[0];
  }

  override extractRawValuesValueFromBatchResult(result: unknown): unknown {
    return (result as any).rows;
  }
}

export class GSheetQLTransaction<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> extends SQLiteTransaction<"async", any, TFullSchema, TSchema> {
  static override readonly [entityKind]: string = "GSheetQLTransaction";

  override async transaction<T>(transaction: (tx: GSheetQLTransaction<TFullSchema, TSchema>) => Promise<T>): Promise<T> {
    const savepointName = `sp${this.nestedIndex}`;
    const tx = new GSheetQLTransaction('async', this.dialect, this.session, this.schema, this.nestedIndex + 1);
    await this.session.run(sql.raw(`savepoint ${savepointName}`));
    try {
      const result = await transaction(tx);
      await this.session.run(sql.raw(`release savepoint ${savepointName}`));
      return result;
    } catch (err) {
      await this.session.run(sql.raw(`rollback to savepoint ${savepointName}`));
      throw err;
    }
  }
}

export class PreparedQuery<T extends PreparedQueryConfig = PreparedQueryConfig> extends PreparedQueryBase<
  { type: "async"; run: any; all: T["all"]; get: T["get"]; values: T["values"]; execute: T["execute"] }
> {
  static override readonly [entityKind]: string = "GSheetQLPreparedQuery";

  constructor(
    private httpClient: GSheetQLHttpClient,
    query: Query,
    private logger: Logger,
    cache: Cache,
    queryMetadata: {
      type: "select" | "update" | "delete" | "insert";
      tables: string[];
    } | undefined,
    cacheConfig: WithCacheConfig | undefined,
    private fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    private _isResponseInArrayMode: boolean,
    private customResultMapper?: (rows: unknown[][]) => unknown,
  ) {
    super("async", executeMethod, query, cache, queryMetadata, cacheConfig);
  }

  async run(placeholderValues?: Record<string, unknown>): Promise<any> {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);
    return await this.queryWithCache(this.query.sql, params, async () => {
      return this.httpClient.execute(this.query.sql, params);
    });
  }

  async all(placeholderValues?: Record<string, unknown>): Promise<T["all"]> {
    const { fields, query, logger, customResultMapper } = this;
    if (!fields && !customResultMapper) {
      const params = fillPlaceholders(query.params, placeholderValues ?? {});
      logger.logQuery(query.sql, params);
      return await this.queryWithCache(query.sql, params, async () => {
        return this.httpClient.execute(query.sql, params).then(({ rows }) => this.mapAllResult(rows));
      });
    }

    const rows = await this.values(placeholderValues) as unknown[][];
    return this.mapAllResult(rows);
  }

  override mapAllResult(rows: unknown, isFromBatch?: boolean): unknown {
    if (isFromBatch) {
      rows = (rows as any).rows;
    }

    if (!this.fields && !this.customResultMapper) {
      return rows;
    }

    if (this.customResultMapper) {
      return this.customResultMapper(rows as unknown[][]) as T['all'];
    }

    return (rows as unknown[]).map((row) => {
      return mapResultRow(
        this.fields!,
        row as unknown[],
        this.joinsNotNullableMap,
      );
    });
  }

  async get(placeholderValues?: Record<string, unknown>): Promise<T["get"]> {
    const { fields, logger, query, customResultMapper } = this;
    if (!fields && !customResultMapper) {
      const params = fillPlaceholders(query.params, placeholderValues ?? {});
      logger.logQuery(query.sql, params);
      return await this.queryWithCache(query.sql, params, async () => {
        return this.httpClient.execute(query.sql, params).then(({ rows }) => this.mapGetResult(rows));
      });
    }

    const rows = await this.values(placeholderValues) as unknown[][];
    return this.mapGetResult(rows);
  }

  override mapGetResult(rows: unknown, isFromBatch?: boolean): unknown {
    if (isFromBatch) {
      rows = (rows as any).rows;
    }

    const row = (rows as unknown[])[0];

    if (!row) {
      return undefined;
    }

    if (!this.fields && !this.customResultMapper) {
      return row;
    }

    if (this.customResultMapper) {
      return this.customResultMapper([row as unknown[]]) as T['get'];
    }

    return mapResultRow(
      this.fields!,
      row as unknown[],
      this.joinsNotNullableMap,
    );
  }

  async values(placeholderValues?: Record<string, unknown>): Promise<T["values"]> {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);
    return await this.queryWithCache(this.query.sql, params, async () => {
      const result = await this.httpClient.execute(this.query.sql, params);
      return (result.rows || []) as T["values"];
    });
  }

  /** @internal */
  isResponseInArrayMode(): boolean {
    return this._isResponseInArrayMode;
  }
}
