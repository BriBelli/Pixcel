import { getDb, type RecordCategory } from '../../../lib/db';

export const runtime = 'nodejs';

/**
 * DEV-ONLY DB VIEWER — GET the current `getDb()` contents as JSON for browser viewing.
 *
 * Lets you SEE the persisted chat data at /api/debug-db without opening the file. READ-ONLY
 * (no writes, no model/API calls) and hard-gated OFF in production (returns 404 so the route's
 * existence isn't advertised). Dev convenience only.
 *
 * NOTE: this folder is intentionally NOT underscore-prefixed — Next treats `_`-prefixed
 * segments as PRIVATE (excluded from routing), which would make the route unreachable.
 */

const CATEGORIES: RecordCategory[] = ['thread', 'interaction', 'prompt', 'usage', 'user'];

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Scope to a user_id (query param) — defaults to the dev user the route persists under.
  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id') || 'dev-user';

  const db = getDb();
  const grouped: Record<string, unknown[]> = {};
  for (const category of CATEGORIES) {
    const { items } = await db.query({ category, user_id: userId });
    if (items.length) grouped[category] = items;
  }

  return Response.json({ user_id: userId, data: grouped });
}
