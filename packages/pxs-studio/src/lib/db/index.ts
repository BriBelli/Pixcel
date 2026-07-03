/**
 * DB ENTRY — the dev singleton + the public re-export surface.
 *
 * `getDb()` returns a module-level, lazily-created dev repository — the store the chat-turn
 * route persists through. Locally it uses the SQLITE adapter so real turns land in a proper
 * SQLite file (`.pxs-dev.db`); if constructing it ever throws it falls back to the in-memory
 * adapter so the route never breaks. Prod will swap to DynamoDB — changing ONLY this factory,
 * every caller keeps the Repository port.
 *
 * `getDb` touches `node:sqlite`, so it's server-side only. Pure TS otherwise — no React/Next/DOM.
 * Tests import `createMemoryRepository` directly, NOT `getDb`.
 */

import { createMemoryRepository } from './adapters/memory';
import { createSqliteRepository } from './adapters/sqlite';
import type { Repository } from './repository';

let singleton: Repository | null = null;

/** The process-wide dev repository (lazy singleton). SQLite in dev, memory as fallback. */
export function getDb(): Repository {
  if (singleton) return singleton;
  // Prefer the SQLite adapter in dev. Any failure (node:sqlite unavailable, unwritable path)
  // falls back to memory so persistence never breaks the chat stream.
  if (process.env.NODE_ENV !== 'production') {
    try {
      singleton = createSqliteRepository();
      return singleton;
    } catch (err) {
      console.warn('[db] sqlite adapter unavailable, falling back to memory:', err);
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
export { createSqliteRepository, resolveDevDbPath } from './adapters/sqlite';
