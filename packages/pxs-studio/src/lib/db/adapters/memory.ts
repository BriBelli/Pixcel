/**
 * IN-MEMORY DEV ADAPTER — the v1 {@link Repository} implementation (Decision 8).
 *
 * Backing store: a `Map` keyed `${category}:${id}`. Reads and writes DEEP-CLONE
 * (structuredClone) so callers can never mutate the store by reference — the same
 * defensive-copy contract a network adapter would give for free. Semantics live in
 * `store-core.ts`, shared with the file adapter so the two can't drift.
 *
 * The DynamoDB adapter is a later swap behind the Repository port; this file is dev-only.
 * Pure TS — no React/Next/DOM — so it runs under `node:test`.
 */

import type { BaseRecord } from '../models';
import type { Repository } from '../repository';
import { createStoreRepository } from './store-core';

export function createMemoryRepository(): Repository {
  const store = new Map<string, BaseRecord>();
  return createStoreRepository(store);
}
