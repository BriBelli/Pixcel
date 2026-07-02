/**
 * STORE CORE — the shared Map-backed record logic used by the dev adapters.
 *
 * Both `memory.ts` (process-only) and `file.ts` (openable JSON) implement the same
 * {@link Repository} semantics: `${category}:${id}` keys, structuredClone on read/write,
 * and the identical query/pagination/`total` behavior. This factors that once so the two
 * adapters can't drift. The file adapter layers a persist hook on top of the mutating ops.
 *
 * Pure TS — no React/Next/DOM — so it runs under `node:test`.
 */

import type { BaseRecord } from '../models';
import type { QueryParams, QueryResult, Repository } from '../repository';

const key = (category: string, id: string) => `${category}:${id}`;

/** Deep-clone so the store and its callers never share references. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Build a Repository over the given Map. `onMutate` (optional) fires AFTER each successful
 * `put`/`update` so a persistence layer (the file adapter) can flush the whole store.
 */
export function createStoreRepository(
  store: Map<string, BaseRecord>,
  onMutate?: () => void
): Repository {
  return {
    async put<T extends BaseRecord>(record: T): Promise<T> {
      store.set(key(record.category, record.id), clone(record));
      onMutate?.();
      return clone(record);
    },

    async get(category, id) {
      const found = store.get(key(category, id));
      return found ? clone(found) : null;
    },

    async update<T extends BaseRecord>(category: string, id: string, patch: Partial<T>) {
      const existing = store.get(key(category, id));
      if (!existing) return null;
      // Shallow-merge the patch, then force-bump updated_at. `id`/`category` are
      // never meant to move; the patch type doesn't include them anyway.
      const next: BaseRecord = { ...existing, ...patch, updated_at: Date.now() };
      store.set(key(category, id), clone(next));
      onMutate?.();
      return clone(next);
    },

    async query(params: QueryParams): Promise<QueryResult> {
      const { category, user_id, filter, limit, offset = 0, sort = 'asc' } = params;

      // Filter by category + user_id (+ optional thread_id/status).
      let matched = [...store.values()].filter(
        (r) => r.category === category && r.user_id === user_id
      );
      if (filter?.thread_id !== undefined) {
        matched = matched.filter(
          (r) => (r as { thread_id?: string }).thread_id === filter.thread_id
        );
      }
      if (filter?.status !== undefined) {
        matched = matched.filter((r) => r.status === filter.status);
      }

      // Sort by created_at (stable tiebreak on id for determinism).
      matched.sort((a, b) => {
        const d = a.created_at - b.created_at;
        const c = d !== 0 ? d : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        return sort === 'asc' ? c : -c;
      });

      // `total` = the full filtered count BEFORE pagination, so callers can page.
      const total = matched.length;
      const start = Math.max(0, offset);
      const end = limit === undefined ? undefined : start + limit;
      const items = matched.slice(start, end).map((r) => clone(r));

      return { items, total };
    },
  };
}
