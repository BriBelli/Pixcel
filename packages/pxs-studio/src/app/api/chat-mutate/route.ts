import {
  DEV_USER_ID,
  cascadeDeactivateDownstream,
  getDb,
  transitionStatus,
} from '../../../lib/db';
import type { Interaction } from '../../../lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/chat-mutate — the chat mutation endpoint (PR-4b: delete-last-turn).
 *
 * The SAFE, NO-SPEND half of chat mutations: a turn is soft-deleted (audit-preserving) via the
 * already-unit-tested status layer, entirely behind the PR-3 Repository port. NO model/API calls,
 * no db internals. Only `action: 'delete'` is supported in this pass.
 *
 * Body: { action, user_id?, thread_id, interaction_id }
 *   action         'delete' (else 400 "unsupported action")
 *   user_id        default DEV_USER_ID
 *   thread_id      the conversation thread (used to cascade-deactivate downstream turns → inactive)
 *   interaction_id the turn to soft-delete (404 if missing)
 *
 * Delete flow: read the target interaction → transitionStatus → 'deleted' (guarded: only flips
 * an `active` row, so it's idempotent and audit-safe) → cascadeDeactivateDownstream to deactivate
 * any turns after it → 'inactive' (a no-op for a last turn, but correct for future middle-delete).
 * Returns { ok }.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      user_id?: string;
      thread_id?: string;
      interaction_id?: string;
    };

    const action = (body.action ?? '').trim();
    if (action !== 'delete') {
      return Response.json({ error: 'unsupported action' }, { status: 400 });
    }

    const interactionId = (body.interaction_id ?? '').trim();
    if (!interactionId) {
      return Response.json({ error: 'interaction_id is required' }, { status: 400 });
    }
    const threadId = (body.thread_id ?? '').trim();
    // user_id defaults to the dev subject (kept for parity with the other chat routes).
    void ((body.user_id ?? '').trim() || DEV_USER_ID);

    const db = await getDb();

    // Read the target — 404 if it isn't there.
    const it = (await db.get('interaction', interactionId)) as Interaction | null;
    if (!it) {
      return Response.json({ error: 'interaction not found' }, { status: 404 });
    }

    // Soft-delete: flip active → 'deleted' (guarded; preserves the audit trail).
    await transitionStatus(db, 'interaction', interactionId, 'deleted');

    // Cascade any downstream turns to 'inactive'. For a LAST turn this deactivates nothing, but it
    // keeps the endpoint correct once middle-turn delete lands.
    if (threadId) {
      await cascadeDeactivateDownstream(db, threadId, it.created_at);
    }

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to mutate chat: ${message}` }, { status: 500 });
  }
}
