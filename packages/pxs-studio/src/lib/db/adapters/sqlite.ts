/**
 * SQLITE DEV ADAPTER — the local {@link Repository} implementation on Node's BUILT-IN
 * `node:sqlite` (`DatabaseSync`). Replaces the JSON-file dev store: local = SQLite,
 * prod = DynamoDB (later), tests = in-memory — all behind the ONE Repository port.
 *
 * SINGLE-TABLE DESIGN (DynamoDB-style): every entity lives in one `records` table,
 * keyed by `pk = "${category}:${id}"`, with the full record stored as JSON in `doc`.
 * A handful of columns are PROMOTED out of the JSON (id/category/user_id/status/
 * thread_id/created_at/updated_at) purely so we can filter/sort/index — the doc is
 * the source of truth on read.
 *
 * Semantics MATCH the memory adapter / store-core exactly: structuredClone on read/write,
 * sort by created_at with an id tiebreak for determinism, and `total` = the filtered count
 * BEFORE limit/offset. Requires Node 24 (that's when `node:sqlite` shipped).
 *
 * Dev-only, server-side (node:sqlite + node:path). Do NOT point production at this.
 */

import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { BaseRecord } from '../models';
import type { QueryParams, QueryResult, Repository } from '../repository';

const pk = (category: string, id: string) => `${category}:${id}`;

/** Deep-clone so the store and its callers never share references (matches store-core). */
function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Resolve the dev DB file path. Under `next dev`, cwd is the pxs-studio package root, so the
 * default lands at `packages/pxs-studio/.pxs-dev.db`. Override with PXS_DEV_DB_PATH; pass
 * `':memory:'` for an ephemeral in-process DB (tests).
 */
export function resolveDevDbPath(filePath?: string): string {
  if (filePath) return filePath;
  // cwd = the studio package under `next dev` / the tsx scripts.
  return process.env.PXS_DEV_DB_PATH || path.join(process.cwd(), '.pxs-dev.db');
}

/** Create the single `records` table + its indexes if they don't already exist. */
function createSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      pk         TEXT PRIMARY KEY,
      id         TEXT NOT NULL,
      category   TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      status     TEXT NOT NULL,
      thread_id  TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      doc        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_records_cat_user ON records (category, user_id);
    CREATE INDEX IF NOT EXISTS idx_records_thread   ON records (thread_id);
    CREATE INDEX IF NOT EXISTS idx_records_status   ON records (status);
  `);
}

/** Read the `thread_id` a record carries (Interaction has it), else null for the column. */
function threadIdOf(record: BaseRecord): string | null {
  return (record as { thread_id?: string }).thread_id ?? null;
}

/**
 * Create a SQLite-backed repository. Opens/creates the DB file and its schema on construction.
 * `getPath()` exposes the resolved path (used by the inspect script).
 */
export function createSqliteRepository(
  filePath?: string
): Repository & { getPath(): string } {
  const resolved = resolveDevDbPath(filePath);
  const db = new DatabaseSync(resolved);
  createSchema(db);

  const upsert = db.prepare(`
    INSERT INTO records (pk, id, category, user_id, status, thread_id, created_at, updated_at, doc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(pk) DO UPDATE SET
      id = excluded.id,
      category = excluded.category,
      user_id = excluded.user_id,
      status = excluded.status,
      thread_id = excluded.thread_id,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      doc = excluded.doc
  `);
  const selectDoc = db.prepare(`SELECT doc FROM records WHERE pk = ?`);

  function write(record: BaseRecord): void {
    upsert.run(
      pk(record.category, record.id),
      record.id,
      record.category,
      record.user_id,
      record.status,
      threadIdOf(record),
      record.created_at,
      record.updated_at,
      JSON.stringify(record)
    );
  }

  return {
    async put<T extends BaseRecord>(record: T): Promise<T> {
      write(record);
      return clone(record);
    },

    async get(category, id) {
      const row = selectDoc.get(pk(category, id)) as { doc: string } | undefined;
      return row ? (JSON.parse(row.doc) as BaseRecord) : null;
    },

    async update<T extends BaseRecord>(category: string, id: string, patch: Partial<T>) {
      const row = selectDoc.get(pk(category, id)) as { doc: string } | undefined;
      if (!row) return null;
      const existing = JSON.parse(row.doc) as BaseRecord;
      // Shallow-merge, then force-bump updated_at (matches memory/store-core). Date.now()
      // is fine here — this is normal runtime, not a deterministic workflow script.
      const next: BaseRecord = { ...existing, ...patch, updated_at: Date.now() };
      write(next);
      return clone(next);
    },

    async query(params: QueryParams): Promise<QueryResult> {
      const { category, user_id, filter, limit, offset = 0, sort = 'asc' } = params;

      // Build the shared WHERE for both the COUNT and the page.
      const where: string[] = ['category = ?', 'user_id = ?'];
      const args: unknown[] = [category, user_id];
      if (filter?.thread_id !== undefined) {
        where.push('thread_id = ?');
        args.push(filter.thread_id);
      }
      if (filter?.status !== undefined) {
        where.push('status = ?');
        args.push(filter.status);
      }
      const whereSql = `WHERE ${where.join(' AND ')}`;

      // `total` = the full filtered count BEFORE pagination, so callers can page.
      const countRow = db
        .prepare(`SELECT COUNT(*) AS n FROM records ${whereSql}`)
        .get(...args) as { n: number };
      const total = Number(countRow.n);

      // Sort by created_at with an id tiebreak for determinism (matches store-core).
      const dir = sort === 'asc' ? 'ASC' : 'DESC';
      let sql = `SELECT doc FROM records ${whereSql} ORDER BY created_at ${dir}, id ${dir}`;
      const pageArgs = [...args];
      if (limit !== undefined) {
        // SQLite needs a LIMIT to honor OFFSET; -1 = "no limit" so offset works alone.
        sql += ` LIMIT ? OFFSET ?`;
        pageArgs.push(limit, Math.max(0, offset));
      } else if (offset > 0) {
        sql += ` LIMIT -1 OFFSET ?`;
        pageArgs.push(Math.max(0, offset));
      }

      const rows = db.prepare(sql).all(...pageArgs) as Array<{ doc: string }>;
      const items = rows.map((r) => JSON.parse(r.doc) as BaseRecord);
      return { items, total };
    },

    getPath: () => resolved,
  };
}
