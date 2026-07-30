import { getDb, DEV_USER_ID, saveThreadAsRecipe } from '../../../../../lib/db';

export const runtime = 'nodejs';

/** POST /api/threads/[id]/template — Save as template: extract the project's recipe into a named Prompt. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
    const db = await getDb();
    const promptId = await saveThreadAsRecipe(db, userId, id, Date.now());
    if (!promptId) return Response.json({ error: 'no recipe to save from this project yet' }, { status: 422 });
    return Response.json({ prompt_id: promptId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to save template: ${message}` }, { status: 500 });
  }
}
