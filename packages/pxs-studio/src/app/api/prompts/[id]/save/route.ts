import { getDb, DEV_USER_ID, type RecipeSave } from '../../../../../lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/prompts/[id]/save — toggle "love"/save on a Recipe (a favorite pointer, not a copy). Works
 * for any scope (pixcel starter, another user's community recipe, or your own). Returns the new state.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
    const db = await getDb();
    const now = Date.now();

    const existing = await db.query({ category: 'recipe_save', user_id: userId, filter: { status: 'active' } });
    const hit = (existing.items as RecipeSave[]).find((s) => s.recipe_id === id);
    if (hit) {
      await db.update('recipe_save', hit.id, { status: 'deleted' }); // un-love = status flip
      return Response.json({ saved: false });
    }
    await db.put<RecipeSave>({
      id: `rs-${now}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId,
      category: 'recipe_save',
      status: 'active',
      created_at: now,
      updated_at: now,
      recipe_id: id,
    });
    return Response.json({ saved: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to toggle save: ${message}` }, { status: 500 });
  }
}
