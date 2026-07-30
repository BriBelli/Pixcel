import { getDb, DEV_USER_ID, duplicateThread } from '../../../../../lib/db';

export const runtime = 'nodejs';

/** POST /api/threads/[id]/duplicate — Duplicate (Save As): a full independent copy of the project. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
    const db = await getDb();
    const newId = await duplicateThread(db, userId, id, Date.now());
    if (!newId) return Response.json({ error: 'project not found' }, { status: 404 });
    return Response.json({ thread_id: newId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to duplicate project: ${message}` }, { status: 500 });
  }
}
