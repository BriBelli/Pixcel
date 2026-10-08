import { getDb } from '../../../../../lib/db';
import type { Asset } from '../../../../../lib/db/models';

export const runtime = 'nodejs';

/**
 * POST /api/assets/:id/kept — record that the user took this one.
 *
 * The studio reads "what worked" from what the user KEEPS, and the first live read found almost
 * nothing: Brian had called Grok's output perfect three times and saved none of it. Saving is a
 * deliberate filing act, and people do not file things while they are working.
 *
 * DOWNLOADING is the act they actually perform, and it is a stronger signal than a rating would be:
 * nobody downloads a render they think is bad, and it costs them nothing to express. So the download
 * button tells the server, and the judgement gets recorded from work the user was doing anyway.
 *
 * Deliberately NOT a promotion to retention:'saved'. Taking a copy is not the same as filing it in
 * the library, and quietly conflating them would fill their Assets catalog with every take they ever
 * glanced at. This records the VERDICT, not a filing decision.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const db = await getDb();
    const asset = (await db.get('asset', id)) as Asset | null;
    if (!asset) return Response.json({ error: 'No such asset.' }, { status: 404 });

    await db.update<Asset>('asset', id, {
      kept_at: Date.now(),
      kept_count: (asset.kept_count ?? 0) + 1,
    } as Partial<Asset>);

    return Response.json({ ok: true });
  } catch (err) {
    // A verdict that fails to record must never break the download it came from.
    return Response.json({ error: err instanceof Error ? err.message : 'Could not record.' }, { status: 500 });
  }
}
