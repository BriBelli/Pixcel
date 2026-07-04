import { DEV_USER_ID, getDb, listActiveInteractions } from '../../../lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/chat-history — the reload/reopen HYDRATION read (PR-4b part 1).
 *
 * Restores a conversation from the SQLite store so chat persistence is VISIBLE: the client
 * calls this on reload with the stored thread id and rebuilds its ChatTurn[] from the persisted
 * interactions. READ-ONLY — behind the PR-3 Repository port, NO model/API calls, no writes.
 *
 * Query params:
 *   thread_id  (required — 400 if missing)
 *   user_id    (default DEV_USER_ID)
 *   limit/offset (optional ints, forwarded to the paginated query)
 *
 * Returns: { thread_id, user_id, total, interactions } where `interactions` are the ACTIVE
 * interactions ascending by created_at (audit rows excluded by listActiveInteractions).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const threadId = (url.searchParams.get('thread_id') ?? '').trim();
    if (!threadId) {
      return Response.json({ error: 'thread_id is required' }, { status: 400 });
    }

    const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;

    const parseInt = (raw: string | null): number | undefined => {
      if (raw == null || raw.trim() === '') return undefined;
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) ? n : undefined;
    };
    const limit = parseInt(url.searchParams.get('limit'));
    const offset = parseInt(url.searchParams.get('offset'));

    const db = await getDb();
    const { items, total } = await listActiveInteractions(db, userId, threadId, { limit, offset });

    return Response.json({ thread_id: threadId, user_id: userId, total, interactions: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to load chat history: ${message}` }, { status: 500 });
  }
}
