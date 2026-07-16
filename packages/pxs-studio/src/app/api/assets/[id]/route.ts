import { getDb, type Asset } from '../../../../lib/db';

export const runtime = 'nodejs';

/**
 * /api/assets/[id] — edit + delete a single asset (Slice 4).
 *
 * PATCH  { title?, alt_text?, caption?, description?, tags? }  → update the editorial metadata
 *         (the WordPress-style Details drawer fields). Behind the Repository port.
 * DELETE → soft-delete (status:'deleted') so it drops from the catalog but the audit row survives.
 */

const EDITABLE: (keyof Asset)[] = ['title', 'alt_text', 'caption', 'description', 'tags'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Partial<Asset>;
    const patch: Partial<Asset> = {};
    for (const k of EDITABLE) {
      if (k in body) {
        // tags is a string[]; the rest are strings.
        (patch as Record<string, unknown>)[k] = body[k];
      }
    }
    const db = await getDb();
    const updated = await db.update<Asset>('asset', id, patch);
    if (!updated) return Response.json({ error: 'asset not found' }, { status: 404 });
    return Response.json({ asset: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to update asset: ${message}` }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const updated = await db.update<Asset>('asset', id, { status: 'deleted' });
    if (!updated) return Response.json({ error: 'asset not found' }, { status: 404 });
    return Response.json({ ok: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to delete asset: ${message}` }, { status: 500 });
  }
}
