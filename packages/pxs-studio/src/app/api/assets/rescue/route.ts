import { DEV_USER_ID, getDb, ingestMedia } from '../../../../lib/db';
import type { Asset } from '../../../../lib/db/models';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/assets/rescue — take the bytes for anything still pointing at a provider url.
 *
 * Durable storage arrived after a lot of work had already been made, and one path (the chat
 * surface's quick transfer) kept leaking afterwards. The result is a set of assets whose url is
 * still the provider's: alive for now, gone on the vendor's schedule. xAI is explicit about it —
 * it serves `xai-tmp-imgen-…` and means the "tmp".
 *
 * This is a RACE WE CAN STILL WIN for the ones that have not expired yet. Everything already 404
 * is unrecoverable and is reported as such rather than quietly skipped — the user should know which
 * work is gone, not discover it later in a broken tile.
 *
 * Idempotent: an asset already on /api/media is left alone, so running this twice costs nothing.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;

  try {
    const db = await getDb();
    const { items } = await db.query({ category: 'asset', user_id: userId, filter: { status: 'active' } });
    const atRisk = (items as Asset[]).filter((a) => /^https?:\/\//i.test(a.url));

    const rescued: string[] = [];
    const lost: { id: string; modelLabel?: string; reason?: string }[] = [];

    for (const a of atRisk) {
      const stored = await ingestMedia(a.url);
      if (stored.stored) {
        await db.update<Asset>('asset', a.id, { url: stored.url } as Partial<Asset>);
        rescued.push(a.id);
      } else {
        // Already gone. Recorded honestly rather than left to surface as a broken image later.
        lost.push({ id: a.id, modelLabel: a.model_label, reason: stored.reason });
      }
    }

    return Response.json({
      checked: atRisk.length,
      rescued: rescued.length,
      lost: lost.length,
      lostDetail: lost.slice(0, 20),
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Rescue failed.' }, { status: 500 });
  }
}
