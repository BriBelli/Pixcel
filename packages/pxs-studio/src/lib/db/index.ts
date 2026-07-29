/**
 * DB ENTRY — the dev singleton + the public re-export surface.
 *
 * `getDb()` returns a module-level, lazily-created dev repository — the store the chat-turn
 * route persists through. Locally it uses the SQLITE adapter so real turns land in a proper
 * SQLite file (`.pxs-dev.db`); if constructing it ever throws it falls back to the in-memory
 * adapter so the route never breaks. Prod will swap to DynamoDB — changing ONLY this factory,
 * every caller keeps the Repository port.
 *
 * `getDb` is ASYNC because it loads the SQLite adapter via a DYNAMIC `import()` — that's what
 * keeps the whole graph safe on Node < 24: `./adapters/sqlite` statically imports `node:sqlite`
 * (Node 24+ only), so we must NEVER import it statically here. The dynamic import rejects on old
 * Node and we fall back to memory. Server-side only. Tests import `createMemoryRepository` directly.
 */

import { createMemoryRepository } from './adapters/memory';
import type { Repository } from './repository';

let singleton: Repository | null = null;
let pending: Promise<Repository> | null = null;

/** The process-wide dev repository (lazy singleton). SQLite in dev, memory as fallback. */
export async function getDb(): Promise<Repository> {
  if (singleton) return singleton;
  // De-dupe concurrent first-calls so we build the singleton exactly once.
  if (pending) return pending;
  pending = (async () => {
    // Prefer the SQLite adapter in dev. DYNAMIC import so `node:sqlite` is only evaluated on
    // Node 24+; any failure (old Node, unwritable path) falls back to memory so the chat never breaks.
    if (process.env.NODE_ENV !== 'production') {
      try {
        const { createSqliteRepository } = await import('./adapters/sqlite');
        singleton = createSqliteRepository();
        return singleton;
      } catch (err) {
        // LOUD on purpose: this fallback SILENTLY drops persistence — every restart wipes threads,
        // gallery, usage. "Assets are the backbone" → a data-loss degradation must never hide in the
        // log. A bordered banner survives a noisy Next.js dev stream where a lone warn would scroll off.
        const line = '─'.repeat(72);
        console.warn(
          `\n┌${line}┐\n` +
            `│  ⚠  PIXCEL DEV DB: NOT PERSISTING — running the in-memory store.\n` +
            `│     Node ${process.versions.node} lacks node:sqlite (needs Node >= 24). Chat works, but\n` +
            `│     EVERY RESTART WIPES threads / gallery / usage.\n` +
            `│     Fix: \`nvm use\` in the repo (reads .nvmrc → 24), then restart the dev server.\n` +
            `└${line}┘`,
          err
        );
      }
    }
    singleton = createMemoryRepository();
    return singleton;
  })();
  return pending;
}

export * from './models';
export * from './repository';
export * from './status';
export * from './queries';
export * from './usage';
export * from './project-promotion';
export { LivingContext, createLivingContext } from './living-context';
export { createMemoryRepository } from './adapters/memory';
