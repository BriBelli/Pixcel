import { getDb, DEV_USER_ID, proposeRecipeText, saveThreadAsRecipe } from '../../../../../lib/db';

export const runtime = 'nodejs';

/**
 * /api/threads/[id]/template — Save as template (the micro-workflow):
 *   GET  → the PROPOSED recipe { text, name } to show in the review/edit dialog (nothing written).
 *   POST { text?, name? } → save the user-reviewed recipe (with their manual [SLOT]s) as a Prompt.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
    const db = await getDb();
    const proposal = await proposeRecipeText(db, userId, id);
    if (!proposal) return Response.json({ error: 'project not found' }, { status: 404 });
    return Response.json(proposal);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to read recipe: ${message}` }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
    const body = (await req.json().catch(() => ({}))) as { text?: string; name?: string };
    const db = await getDb();
    const promptId = await saveThreadAsRecipe(db, userId, id, Date.now(), { text: body.text, name: body.name });
    if (!promptId) return Response.json({ error: 'no recipe text to save' }, { status: 422 });
    return Response.json({ prompt_id: promptId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to save template: ${message}` }, { status: 500 });
  }
}
