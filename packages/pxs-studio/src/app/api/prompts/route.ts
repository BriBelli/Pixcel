import { getDb, DEV_USER_ID, STARTER_RECIPES, type Prompt, type RecipeSave } from '../../../lib/db';

export const runtime = 'nodejs';

type Scope = 'pixcel' | 'user' | 'community';

interface RecipeOut {
  id: string;
  name: string;
  description?: string;
  variables: string[];
  scope: Scope;
  saved: boolean;
  builtin: boolean;
  source_thread_id?: string;
  updated_at: number;
}

/**
 * GET /api/prompts — the Recipes surface. Two axes, both filterable:
 *   ?scope=pixcel|user|community|all   (default all)   — origin
 *   ?saved=true                        — only recipes THIS user has loved
 *   ?q=<text>                          — search name / description / variables
 * Each recipe carries `scope` + `saved` so the UI can badge + filter. Built-in starters are `pixcel`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
  const scopeParam = (url.searchParams.get('scope') ?? 'all').trim() as Scope | 'all';
  const savedOnly = url.searchParams.get('saved') === 'true';
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

  const starters: RecipeOut[] = STARTER_RECIPES.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    variables: r.variables,
    scope: 'pixcel',
    saved: false,
    builtin: true,
    updated_at: 0,
  }));

  let recipes: RecipeOut[] = starters;
  let savedIds = new Set<string>();
  try {
    const db = await getDb();
    // The user's loves (recipe_save rows) → mark `saved` + power the saved filter.
    const savesQ = await db.query({ category: 'recipe_save', user_id: userId, filter: { status: 'active' } });
    savedIds = new Set((savesQ.items as RecipeSave[]).map((s) => s.recipe_id));

    const { items } = await db.query({ category: 'prompt', user_id: userId, filter: { status: 'active' } });
    const saved: RecipeOut[] = (items as Prompt[])
      .sort((a, b) => b.updated_at - a.updated_at)
      .map((p) => ({
        id: p.id,
        name: p.name ?? 'Untitled recipe',
        variables: p.variables ?? [],
        scope: (p.scope ?? 'user') as Scope,
        saved: savedIds.has(p.id),
        builtin: false,
        source_thread_id: p.source_thread_id,
        updated_at: p.updated_at,
      }));
    recipes = [...saved, ...starters.map((s) => ({ ...s, saved: savedIds.has(s.id) }))];
  } catch (err) {
    console.warn('[prompts] list failed (starters only):', err);
  }

  // Filter: scope → saved → search.
  let out = recipes;
  if (scopeParam !== 'all') out = out.filter((r) => r.scope === scopeParam);
  if (savedOnly) out = out.filter((r) => r.saved || r.scope === 'user');
  if (q) {
    out = out.filter((r) =>
      [r.name, r.description ?? '', ...r.variables].join(' ').toLowerCase().includes(q),
    );
  }
  return Response.json({ recipes: out });
}
