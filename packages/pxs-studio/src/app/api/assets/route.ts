import { DEV_USER_ID, getDb, listSavedAssets, promoteThreadForAsset, type Asset } from '../../../lib/db';

export const runtime = 'nodejs';

/**
 * /api/assets — the Assets catalog surface (Slice 4).
 *
 * GET  ?user_id=&kind=   → the user's SAVED (first-class) assets, newest first.
 * POST { url, ... }      → SAVE (promote) an asset: create a durable first-class asset
 *                          (retention:'saved') from a generated tile / upload, with metadata
 *                          prefilled from the workflow. Dedupes by url so re-saving is idempotent.
 *
 * Saved assets are the user's GOLD — they own what they made (paid tokens, their words). This is the
 * deliberate act that promotes an in-state asset to first-class. Behind the same Repository port.
 */

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const VALID_KINDS: Asset['kind'][] = ['image', 'video', 'pixel', 'vector'];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
    const kindParam = (url.searchParams.get('kind') ?? '').trim();
    const kind = VALID_KINDS.includes(kindParam as Asset['kind']) ? (kindParam as Asset['kind']) : undefined;

    const db = await getDb();
    const { items, total } = await listSavedAssets(db, userId, { kind });
    return Response.json({ user_id: userId, total, assets: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to list assets: ${message}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Asset> & { user_id?: string };
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });

    const userId = (body.user_id ?? '').trim() || DEV_USER_ID;
    const kind = VALID_KINDS.includes(body.kind as Asset['kind']) ? (body.kind as Asset['kind']) : 'image';
    const db = await getDb();

    // Idempotent: if this exact media is already saved for the user, return it (no duplicate).
    const existing = (await listSavedAssets(db, userId)).items.find((a) => a.url === url);
    if (existing) return Response.json({ asset: existing, deduped: true });

    const now = Date.now();
    const asset: Asset = {
      id: newId('asset'),
      user_id: userId,
      category: 'asset',
      status: 'active',
      created_at: now,
      updated_at: now,
      kind,
      // Deliberate save → first-class, durable. Provenance carried from the workflow.
      source: body.source === 'upload' ? 'upload' : 'generated',
      retention: 'saved',
      url,
      thread_id: typeof body.thread_id === 'string' ? body.thread_id : '',
      interaction_id: typeof body.interaction_id === 'string' ? body.interaction_id : '',
      model_label: typeof body.model_label === 'string' ? body.model_label : undefined,
      prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
      reference_asset_ids: Array.isArray(body.reference_asset_ids) ? body.reference_asset_ids : undefined,
      // Prefill editorial metadata from the workflow (title from the subject/prompt) — the spiderweb.
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 80) : undefined,
    };
    await db.put(asset);
    // Saving an asset out of a project promotes that project → saved too (idempotent; no-op if the
    // asset has no thread or the project is already saved).
    await promoteThreadForAsset(db, asset.thread_id, now);
    return Response.json({ asset });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to save asset: ${message}` }, { status: 500 });
  }
}
