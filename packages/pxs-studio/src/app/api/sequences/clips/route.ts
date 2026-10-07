import { DEV_USER_ID, getDb, listAssets } from '../../../../lib/db';
import type { Asset } from '../../../../lib/db/models';

export const runtime = 'nodejs';

/**
 * GET /api/sequences/clips?thread_id=… — every clip in a project, oldest first.
 *
 * The raw material of a cut. Order here is the order they were MADE, which is the sensible default
 * for a chained sequence and merely a starting point for anything else — the strip reorders, and the
 * order that matters is the one you assemble with.
 *
 * Assembled SCENES are returned separately rather than mixed in. A scene is made OF clips, so
 * offering it as an ingredient alongside them invites cutting a scene into itself.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const threadId = (url.searchParams.get('thread_id') ?? '').trim();
  const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
  if (!threadId) return Response.json({ error: 'thread_id is required.' }, { status: 400 });

  try {
    const db = await getDb();
    const { items } = await listAssets(db, userId, threadId, { sort: 'asc' });
    const videos = (items as Asset[]).filter((a) => a.kind === 'video');

    // A scene is one we assembled: it cites the clips it was cut from.
    const isScene = (a: Asset) => (a.reference_asset_ids?.length ?? 0) > 0 && a.model_label === 'Assembled sequence';

    const shape = (a: Asset) => ({
      assetId: a.id,
      url: a.url,
      durationSec: a.duration_sec,
      hasAudio: a.has_audio,
      thumbnailUrl: a.thumbnail_url,
      modelLabel: a.model_label,
      prompt: a.prompt,
      createdAt: a.created_at,
      // The still it opened on, when it was part of a chain — what makes the order meaningful.
      openedOn: a.parent_asset_id ?? undefined,
    });

    return Response.json(
      {
        clips: videos.filter((a) => !isScene(a)).map(shape),
        scenes: videos.filter(isScene).map((a) => ({ ...shape(a), fromClips: a.reference_asset_ids ?? [] })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to list clips.' }, { status: 500 });
  }
}
