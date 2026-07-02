/**
 * DB ENTRY — the dev singleton + the public re-export surface.
 *
 * `getDb()` returns a module-level, lazily-created dev repository — the store the chat-turn
 * route persists through. In dev it uses the FILE adapter so real turns land in an openable
 * JSON file (`.pxs-dev-db.json`); if constructing/writing the file adapter ever throws it
 * falls back to the in-memory adapter so the route never breaks. Swapping to DynamoDB later
 * means changing ONLY this factory — every caller keeps the Repository port.
 *
 * `getDb` touches `node:fs` (via the file adapter), so it's server-side only. Pure TS otherwise
 * — no React/Next/DOM. Tests import `createMemoryRepository` directly, NOT `getDb`.
 */

import { createFileRepository } from './adapters/file';
import { createMemoryRepository } from './adapters/memory';
import type { Repository } from './repository';

let singleton: Repository | null = null;

/** The process-wide dev repository (lazy singleton). File-backed in dev, memory as fallback. */
export function getDb(): Repository {
  if (singleton) return singleton;
  // Prefer the openable file adapter in dev. Any failure (fs unavailable, unwritable path)
  // falls back to memory so persistence never breaks the chat stream.
  if (process.env.NODE_ENV !== 'production') {
    try {
      singleton = createFileRepository();
      return singleton;
    } catch (err) {
      console.warn('[db] file adapter unavailable, falling back to memory:', err);
    }
  }
  singleton = createMemoryRepository();
  return singleton;
}

export * from './models';
export * from './repository';
export * from './status';
export * from './queries';
export * from './usage';
export { LivingContext, createLivingContext } from './living-context';
export { createMemoryRepository } from './adapters/memory';
export { createFileRepository, resolveDevDbPath } from './adapters/file';
