/**
 * REPOSITORY PORT — the single interface every storage adapter implements (Decision 8).
 *
 * v1 ships ONE adapter: the in-memory dev store (`adapters/memory.ts`). A DynamoDB
 * adapter is a LATER swap behind THIS SAME interface — an isolated PR, not built here.
 * Keep this file impl-free so both adapters stay honest to one contract.
 *
 * Pure TS — no React/Next/DOM — so it runs under `node:test`.
 */

import type { BaseRecord, RecordCategory, RecordStatus } from './models';

/** Query parameters. Reads are scoped by category + user_id, optionally filtered + paginated. */
export interface QueryParams {
  category: RecordCategory;
  user_id: string;
  filter?: {
    thread_id?: string;
    status?: RecordStatus;
  };
  /** Max records in the returned page. Omit for "all". */
  limit?: number;
  /** Number of matching records to skip before the page. Default 0. */
  offset?: number;
  /** Sort by `created_at`. Default `'asc'`. */
  sort?: 'asc' | 'desc';
}

/**
 * The result of a query. `total` is the count of records matching
 * category + user_id + filter BEFORE limit/offset are applied — so callers can paginate.
 */
export interface QueryResult<T extends BaseRecord = BaseRecord> {
  items: T[];
  total: number;
}

/** The port. Every method is async so a network-backed adapter (DynamoDB) fits the same shape. */
export interface Repository {
  /** Upsert a record (keyed by category + id). Returns the stored record. */
  put<T extends BaseRecord>(record: T): Promise<T>;

  /** Fetch one record by category + id, or `null` if absent. */
  get(category: RecordCategory, id: string): Promise<BaseRecord | null>;

  /**
   * Shallow-merge `patch` into an existing record and bump `updated_at`.
   * Returns the updated record, or `null` if it doesn't exist.
   */
  update<T extends BaseRecord = BaseRecord>(
    category: RecordCategory,
    id: string,
    patch: Partial<T>
  ): Promise<BaseRecord | null>;

  /** Query records by category + user_id (+ optional filter), paginated. */
  query(params: QueryParams): Promise<QueryResult>;
}
