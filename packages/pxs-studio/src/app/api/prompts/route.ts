import { getDb, DEV_USER_ID, STARTER_RECIPES, type Prompt } from '../../../lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/prompts — the Recipes surface: the user's saved Recipes (Prompts) + the built-in starters
 * (Character Reference Sheet). Normalized for a list UI; `builtin` distinguishes read-only starters.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;

  const starters = STARTER_RECIPES.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    variables: r.variables,
    builtin: true,
    updated_at: 0,
  }));

  try {
    const db = await getDb();
    const { items } = await db.query({ category: 'prompt', user_id: userId, filter: { status: 'active' } });
    const saved = (items as Prompt[])
      .sort((a, b) => b.updated_at - a.updated_at)
      .map((p) => ({
        id: p.id,
        name: p.name ?? 'Untitled recipe',
        description: undefined as string | undefined,
        variables: p.variables ?? [],
        source_thread_id: p.source_thread_id,
        builtin: false,
        updated_at: p.updated_at,
      }));
    return Response.json({ recipes: [...saved, ...starters] });
  } catch (err) {
    console.warn('[prompts] list failed (starters only):', err);
    return Response.json({ recipes: starters });
  }
}
