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
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit')) || 8));

  try {
    const db = await getDb();
    const { items } = await db.query({
      category: 'thread',
      user_id: userId,
      filter: { status: 'active' },
      sort: 'desc', // newest first
      limit,
    });
    const threads = (items as Thread[]).map((t) => ({
      id: t.id,
      title: (t.title ?? '').trim() || 'Untitled',
      updated_at: t.updated_at,
    }));
    return Response.json({ threads });
  } catch (err) {
    console.warn('[threads] list failed:', err);
    return Response.json({ threads: [] });
  }
}
