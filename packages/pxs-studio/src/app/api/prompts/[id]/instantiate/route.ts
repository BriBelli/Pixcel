import { getDb, DEV_USER_ID, instantiateRecipe } from '../../../../../lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/prompts/[id]/instantiate — New from template (Recipe → Project): instantiate a Recipe (a
 * saved Prompt or a built-in starter) into a fresh draft project with the method pre-loaded. Returns
 * the new thread id.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
    const db = await getDb();
    const threadId = await instantiateRecipe(db, userId, id, Date.now());
    if (!threadId) return Response.json({ error: 'recipe not found' }, { status: 404 });
    return Response.json({ thread_id: threadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to instantiate recipe: ${message}` }, { status: 500 });
  }
}
