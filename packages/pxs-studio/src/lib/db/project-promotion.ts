/**
 * Project auto-promotion — the draft→saved lifecycle (OBJECT-MODEL-HANDOFF §4, PROJECT-MODEL.md).
 *
 * A project (Thread) is born a DRAFT: `retention: 'ephemeral'` + a 14-day `expires_at`. It persists so
 * work is never lost, but an empty draft is swept by the later GC. It promotes to `saved` — durable,
 * first-class, no expiry — AUTOMATICALLY on its FIRST asset. There is deliberately NO save button.
 *
 * The asymmetry vs `Asset.retention` (which needs a deliberate save) is intentional and MUST NOT be
 * harmonized (§4): losing a workspace is the exact failure this model exists to prevent, so a project
 * saves itself; an asset is cheap to make and expensive to store, so saving one is opt-in.
 */

import type { Repository } from './repository';
import type { Thread } from './models';

/** Ephemeral (draft) projects are swept 14 days after birth unless they produce an asset. */
export const EPHEMERAL_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * The retention fields a NEW project is born with — a DRAFT (ephemeral + 14-day expiry). Spread into
 * the Thread at creation: `{ ...thread, ...draftBirthFields(now) }`.
 */
export function draftBirthFields(now: number): Pick<Thread, 'retention' | 'expires_at'> {
  return { retention: 'ephemeral', expires_at: now + EPHEMERAL_TTL_MS };
}

/**
 * Promote a project ephemeral → saved because it just produced an asset. Call right AFTER an asset is
 * written for `threadId`. Idempotent (a saved project is left untouched) and safe on a missing/absent
 * thread. Clears `expires_at` — a saved project never expires — and stamps `promoted_at`.
 */
export async function promoteThreadForAsset(
  repo: Repository,
  threadId: string | undefined | null,
  now: number,
): Promise<void> {
  if (!threadId) return;
  const rec = await repo.get('thread', threadId);
  if (!rec) return;
  if ((rec as Thread).retention === 'saved') return; // already promoted — nothing to do
  await repo.update<Thread>('thread', threadId, {
    retention: 'saved',
    promoted_at: now,
    expires_at: undefined,
  });
}
