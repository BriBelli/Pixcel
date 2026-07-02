/**
 * FILE-BACKED DEV ADAPTER — same {@link Repository} semantics as the memory adapter, but the
 * store is persisted to an OPENABLE pretty-printed JSON file so dev data is inspectable.
 *
 * Behavior is identical to the memory adapter (shared via `store-core.ts`): `${category}:${id}`
 * keys, structuredClone on read/write, identical query/pagination/`total`. On construction it
 * loads the JSON file if present (else starts empty); after every mutating op (`put`/`update`)
 * it flushes the WHOLE store back to disk as 2-space JSON.
 *
 * Dev-only, server-side. Uses `node:fs` — fine here (no React/Next/DOM). Do NOT point tests at
 * this adapter; the tests use the memory adapter directly.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { BaseRecord } from '../models';
import type { Repository } from '../repository';
import { createStoreRepository } from './store-core';

/**
 * Resolve the dev DB file path. Under `next dev`, cwd is the pxs-studio package root, so the
 * default lands at `packages/pxs-studio/.pxs-dev-db.json`. Override with PXS_DEV_DB_PATH.
 */
export function resolveDevDbPath(filePath?: string): string {
  if (filePath) return filePath;
  return process.env.PXS_DEV_DB_PATH || path.join(process.cwd(), '.pxs-dev-db.json');
}

/** The on-disk shape: a flat map of `${category}:${id}` → record. */
type DiskShape = Record<string, BaseRecord>;

function loadStore(filePath: string): Map<string, BaseRecord> {
  const store = new Map<string, BaseRecord>();
  try {
    if (!fs.existsSync(filePath)) return store;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return store;
    const parsed = JSON.parse(raw) as DiskShape;
    for (const [k, v] of Object.entries(parsed)) store.set(k, v);
  } catch (err) {
    // A corrupt/unreadable file must not crash the app — warn and start empty.
    console.warn(`[db/file] failed to load ${filePath}, starting empty:`, err);
  }
  return store;
}

function writeStore(filePath: string, store: Map<string, BaseRecord>): void {
  const obj: DiskShape = {};
  for (const [k, v] of store.entries()) obj[k] = v;
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

/**
 * Create a file-backed repository. Loads the file on construction; flushes on every mutation.
 * `getPath()` exposes the resolved path (used by the inspect script).
 */
export function createFileRepository(
  filePath?: string
): Repository & { getPath(): string } {
  const resolved = resolveDevDbPath(filePath);
  const store = loadStore(resolved);
  const repo = createStoreRepository(store, () => writeStore(resolved, store));
  return Object.assign(repo, { getPath: () => resolved });
}
