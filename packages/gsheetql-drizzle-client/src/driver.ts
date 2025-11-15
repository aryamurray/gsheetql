import { entityKind } from "drizzle-orm";
import type { BatchItem, BatchResponse } from "drizzle-orm/batch";
import { DefaultLogger } from "drizzle-orm/logger";
import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  type RelationalSchemaConfig,
  type TablesRelationalConfig,
} from "drizzle-orm/relations";
import { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { SQLiteAsyncDialect } from "drizzle-orm/sqlite-core/dialect";
import type { DrizzleConfig } from "drizzle-orm/utils";

import { GSheetQLSession } from "./session.js";

export type GSheetQLConfig = {
  endpoint: string;
  apiKey?: string;
  googleAuthToken?: string;
  timeout?: number;
  debug?: boolean;
  cacheSize?: number;
};

export class GSheetQLDatabase<TSchema extends Record<string, unknown> = Record<string, never>>
  extends BaseSQLiteDatabase<"async", any, TSchema> {
  static override readonly [entityKind]: string = "GSheetQLDatabase";

  /**
   * Execute multiple queries in a batch
   */
  async batch<U extends BatchItem<"sqlite">, T extends Readonly<[U, ...U[]]>>(
    batch: T,
  ): Promise<BatchResponse<T>> {
    return this.session.batch(batch) as Promise<BatchResponse<T>>;
  }
}

function construct<TSchema extends Record<string, unknown> = Record<string, never>>(
  gsConfig: GSheetQLConfig,
  config: DrizzleConfig<TSchema> = {},
): GSheetQLDatabase<TSchema> & {
  $client: GSheetQLConfig;
} {
  const dialect = new SQLiteAsyncDialect({ casing: config.casing });
  let logger;
  if (config.logger === true) {
    logger = new DefaultLogger();
  } else if (config.logger !== false) {
    logger = config.logger;
  }

  let schema: RelationalSchemaConfig<TablesRelationalConfig> | undefined;
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(
      config.schema,
      createTableRelationsHelpers,
    );
    schema = {
      fullSchema: config.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap,
    };
  }

  const session = new GSheetQLSession(gsConfig, dialect, schema as any, { logger, cache: config.cache });
  const db = new GSheetQLDatabase("async", dialect, session, schema as any);
  (<any> db).$client = gsConfig;
  (<any> db).$cache = config.cache;
  if ((<any> db).$cache) {
    (<any> db).$cache.invalidate = config.cache?.onMutate;
  }

  return db as any;
}

export function drizzle<
  TSchema extends Record<string, unknown> = Record<string, never>,
>(
  ...params:
    | [GSheetQLConfig]
    | [GSheetQLConfig, DrizzleConfig<TSchema>]
): GSheetQLDatabase<TSchema> & {
  $client: GSheetQLConfig;
} {
  const gsConfig = params[0] as GSheetQLConfig;
  const drizzleConfig = params[1] as DrizzleConfig<TSchema> | undefined;

  return construct(gsConfig, drizzleConfig) as any;
}

export const drizzleMock = {
  mock<TSchema extends Record<string, unknown> = Record<string, never>>(
    config?: DrizzleConfig<TSchema>,
  ): GSheetQLDatabase<TSchema> & {
    $client: "$client is not available on drizzle.mock()";
  } {
    return construct({} as any, config) as any;
  },
};

// Attach mock to drizzle function for backwards compatibility
Object.assign(drizzle, { mock: drizzleMock.mock });
