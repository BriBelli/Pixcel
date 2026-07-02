/**
 * STATUS TRANSITIONS — guarded lifecycle moves + the edit/delete cascade.
 *
 * MODIFICATION 1 (Brian): transitions ONLY touch records currently `active`. A row that
 * is already archived/deleted/edited is SKIPPED — returned unchanged with NO write — so the
 * pre-existing audit trail is preserved (and it's cheaper). This makes the cascade idempotent.
 *
 * Pure TS — no React/Next/DOM — so it runs under `node:test`.
 */

import type { BaseRecord, Interaction, RecordCategory, RecordStatus } from './models';
import type { Repository } from './repository';

/**
 * Move a record to `to` — but ONLY if it is currently `active`.
 * If the record is missing → returns `null`. If it exists but is non-active → returns it
 * UNCHANGED with no write (the audit row is preserved).
 */
export async function transitionStatus(
  repo: Repository,
  category: RecordCategory,
  id: string,
  to: RecordStatus
): Promise<BaseRecord | null> {
  const record = await repo.get(category, id);
  if (!record) return null;
  // Guard: skip anything not currently active — never re-mutate an audit row.
  if (record.status !== 'active') return record;
  return repo.update(category, id, { status: to });
}

/**
 * Archive every ACTIVE interaction in `thread_id` whose `created_at >= from_created_at`.
 * Non-active rows are skipped automatically (transitionStatus guards them). Returns the
 * count actually archived. This is the downstream half of the edit/delete cascade.
 */
export async function cascadeArchiveDownstream(
  repo: Repository,
  thread_id: string,
  from_created_at: number
): Promise<number> {
  // Read ALL interactions in the thread for this thread's user. We don't have user_id here,
  // so query is done per-user by the caller path; interactions are addressed by thread_id +
  // status='active' below via a direct scan through the repo query on each candidate.
  // We must know the user_id to query — resolve it from any interaction in the thread.
  const owner = await findThreadOwner(repo, thread_id);
  if (owner === null) return 0;

  const { items } = await repo.query({
    category: 'interaction',
    user_id: owner,
    filter: { thread_id, status: 'active' },
  });

  let archived = 0;
  for (const it of items) {
    if (it.created_at >= from_created_at) {
      const result = await transitionStatus(repo, 'interaction', it.id, 'archived');
      // Count only rows we actually flipped (guard returns the row unchanged otherwise).
      if (result && result.status === 'archived') archived += 1;
    }
  }
  return archived;
}

/**
 * Resolve the user_id that owns a thread by scanning interactions. The repo query needs a
 * user_id, so we can't query "all interactions for a thread" blindly — but the thread record
 * carries the owner. We look it up on the thread first, falling back to null.
 */
async function findThreadOwner(
  repo: Repository,
  thread_id: string
): Promise<string | null> {
  const thread = await repo.get('thread', thread_id);
  if (thread) return thread.user_id;
  return null;
}

/** Type guard the cascade uses to narrow query rows. */
export function isInteraction(r: BaseRecord): r is Interaction {
  return r.category === 'interaction';
}
