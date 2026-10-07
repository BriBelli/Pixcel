import { DEV_USER_ID, getDb, ingestMedia } from '../../../../lib/db';
import { readMedia } from '../../../../lib/db/media-store';
import { mergeVideos, reachableVideoUrl } from '../../../../lib/engine/adapters/fal-assemble';
import { promoteThreadForAsset } from '../../../../lib/db/project-promotion';
import type { Asset } from '../../../../lib/db/models';

export const runtime = 'nodejs';
export const maxDuration = 600;

const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * POST /api/sequences/assemble — join a sequence of clips into one scene.
 *
 * This is the step that was missing. Chaining produced N clips in order and stopped there: three
 * files in a gallery, nothing to join them, no way to get them out. You could generate but you could
 * not finish.
 *
 * The scene is persisted as a FIRST-CLASS asset with the clips as its lineage, so the sequence stays
 * inspectable — you can see what it was made from, and re-assemble it differently later without
 * re-rendering a frame.
 *
 * `{ clipAssetIds: string[], title?: string, thread_id?: string }`
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    clipAssetIds?: string[];
    title?: string;
    thread_id?: string;
    user_id?: string;
  };
  const ids = (body.clipAssetIds ?? []).filter((x): x is string => typeof x === 'string' && x.length > 0);
  const userId = (body.user_id ?? '').trim() || DEV_USER_ID;

  if (ids.length === 0) return Response.json({ error: 'clipAssetIds is required.' }, { status: 400 });

  try {
    const db = await getDb();
    const key = process.env.FAL_API_KEY;
    if (!key) return Response.json({ error: 'Assembly needs a fal key.' }, { status: 503 });

    // ORDER IS THE SEQUENCE. The ids arrive in the order the scene should play, which is not
    // necessarily the order they were created — re-cutting is the whole point of having a timeline.
    const clips: Asset[] = [];
    for (const id of ids) {
      const a = (await db.get('asset', id)) as Asset | null;
      if (!a) return Response.json({ error: `Clip ${id} no longer exists.` }, { status: 404 });
      if (a.kind !== 'video') return Response.json({ error: `${id} is not a clip.` }, { status: 400 });
      clips.push(a);
    }

    // fal fetches the videos itself, and our urls are local-only. Upload what it cannot reach.
    const reachable: string[] = [];
    for (const c of clips) {
      let bytes: Uint8Array | undefined;
      let fileName: string | undefined;
      if (c.url.startsWith('/api/media/')) {
        const id = c.url.slice('/api/media/'.length);
        const stored = await readMedia(id);
        if (!stored) {
          return Response.json({ error: `The file for clip ${c.id} is missing.` }, { status: 410 });
        }
        bytes = new Uint8Array(stored.bytes);
        fileName = id;
      }
      const url = await reachableVideoUrl({ url: c.url, bytes, fileName }, key);
      if (!url) return Response.json({ error: `Could not prepare clip ${c.id} for assembly.` }, { status: 502 });
      reachable.push(url);
    }

    const { scene, reason } = await mergeVideos(reachable);
    if (!scene) return Response.json({ error: reason ?? 'Assembly failed.' }, { status: 502 });

    // TAKE THE BYTES, same as any other creation — the merged scene is a creation in its own right
    // and must not depend on fal's retention any more than a clip does.
    const stored = await ingestMedia(scene.url);
    const now = Date.now();
    const threadId = (body.thread_id ?? '').trim() || clips[0]!.thread_id;

    const asset: Asset = {
      id: newId('asset'),
      user_id: userId,
      category: 'asset',
      status: 'active',
      created_at: now,
      updated_at: now,
      kind: 'video',
      source: 'generated',
      // A SCENE IS DELIBERATE. Unlike a raw clip it is the thing you set out to make, so it is saved
      // first-class rather than left ephemeral and GC-eligible.
      retention: 'saved',
      thread_id: threadId,
      interaction_id: clips[0]!.interaction_id,
      url: stored.url,
      model_label: 'Assembled sequence',
      duration_sec: scene.durationSec ? Math.round(scene.durationSec) : undefined,
      has_audio: clips.some((c) => c.has_audio),
      // The clips it was cut from — the lineage that makes a re-cut possible without re-rendering.
      reference_asset_ids: ids,
      title: (body.title ?? '').trim() || undefined,
      prompt: clips.map((c) => c.prompt).filter(Boolean).join(' → ') || undefined,
    };
    await db.put(asset);
    await promoteThreadForAsset(db, threadId, now).catch(() => {});

    return Response.json({
      asset: {
        id: asset.id,
        url: asset.url,
        durationSec: asset.duration_sec,
        hasAudio: asset.has_audio,
        fromClips: ids.length,
      },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Assembly failed.' }, { status: 500 });
  }
}
