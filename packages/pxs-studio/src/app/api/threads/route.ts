import { getDb, DEV_USER_ID, type Thread } from '../../../lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/threads — the user's recent projects (active threads, newest first). Feeds the splash
 * greeting's REAL personalization (specific "Continue: <title>" chips + state-aware copy), so the
 * landing reflects the user's actual work instead of filler.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 8));

  try {
    const db = await getDb();
    // Fetch the active threads, then sort by LAST-UPDATED desc (the project record's updated_at — a
    // thread rises when you work on it or open it, like Cursor/Claude-Code history). The repo query
    // sorts by created_at, so we re-sort in memory (fine at project scale; a GSI handles it later).
    const { items } = await db.query({ category: 'thread', user_id: userId, filter: { status: 'active' } });
    const threads = (items as Thread[])
      .slice()
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, limit)
      .map((t) => ({ id: t.id, title: (t.title ?? '').trim() || 'Untitled', updated_at: t.updated_at }));
    return Response.json({ threads });
  } catch (err) {
    console.warn('[threads] list failed:', err);
    return Response.json({ threads: [] });
  }
}
