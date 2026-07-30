import { getDb, DEV_USER_ID, openAssetAsProject } from '../../../../lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/threads/from-asset  { asset_id } — Open as project (§2, the verb that matters): a new draft
 * project seeded from the asset, with its recipe + references rehydrated. Returns the new thread id.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { asset_id?: string; user_id?: string };
    const assetId = (body.asset_id ?? '').trim();
    if (!assetId) return Response.json({ error: 'asset_id is required' }, { status: 400 });
    const userId = (body.user_id ?? '').trim() || DEV_USER_ID;
    const db = await getDb();
    const threadId = await openAssetAsProject(db, userId, assetId, Date.now());
    if (!threadId) return Response.json({ error: 'asset not found' }, { status: 404 });
    return Response.json({ thread_id: threadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to open asset as project: ${message}` }, { status: 500 });
  }
}
