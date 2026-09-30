/**
 * PERSISTING ONE CLIP — extracted so the route and the job worker cannot drift apart.
 *
 * This lived inside the video route, which was fine while the route was the only thing that made
 * clips. The worker now makes them too, and two copies of "how a clip becomes an asset" is exactly
 * how one of them quietly stops recording lineage, or the poster frame, or the cost.
 *
 * Called the MOMENT a clip exists, never batched at the end of a run. That is not a preference: a
 * chain outlives the request that started it, and the process holding un-written clips is the one
 * that dies. Beat 1 of the first live chain rendered, was paid for, and was lost exactly that way.
 */

import type { Repository } from './repository';
import type { Asset } from './models';
import { ingestMedia } from './media-store';
import { promoteThreadForAsset } from './project-promotion';

export interface ClipToPersist {
  url: string;
  modelId: string;
  modelLabel?: string;
  index: number;
  durationSec?: number;
  hasAudio?: boolean;
  thumbnailUrl?: string;
  /** For a chained beat: the still it opened on — the edge back to the previous beat. */
  openedOn?: string;
}

export interface PersistClipContext {
  repo: Repository;
  userId: string;
  threadId: string;
  interactionId: string;
  /** The prompt that produced it — the recipe stored alongside the pixels. */
  prompt: string;
  /** Already-persisted reference assets (the user's pinned frames), shared across a run. */
  referenceAssetIds?: string[];
  /** The previous beat's asset id, for the chain's single-parent edge. */
  previousClipAssetId?: string;
  costUsd?: number;
  now?: number;
}

const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Write one clip down, with everything that makes it findable later.
 *
 * Returns the new asset's id, or null if it could not be written — never throws, because a failed
 * write must not take down the render that produced it.
 */
export async function persistClip(
  clip: ClipToPersist,
  ctx: PersistClipContext,
): Promise<string | null> {
  const now = ctx.now ?? Date.now();
  try {
    // The bridging still is a real input that produced this clip, so it becomes a real asset —
    // otherwise the lineage edge points at a provider url that expires and the chain cannot be
    // reassembled or re-rendered from the middle.
    const bridgeIds: string[] = [];
    if (clip.openedOn) {
      const bridge = await ingestMedia(clip.openedOn);
      const bridgeId = newId('asset');
      await ctx.repo.put({
        id: bridgeId,
        user_id: ctx.userId,
        category: 'asset',
        status: 'active',
        created_at: now,
        updated_at: now,
        kind: 'image',
        source: 'generated',
        retention: 'ephemeral',
        thread_id: ctx.threadId,
        interaction_id: ctx.interactionId,
        url: bridge.url,
        model_label: 'Bridging frame',
        index: clip.index,
      } as Asset);
      bridgeIds.push(bridgeId);
    }

    // TAKE THE BYTES. Provider video urls expire fastest of anything here and the file IS the
    // creation, so durability cannot depend on the vendor's retention policy.
    const stored = await ingestMedia(clip.url);
    if (!stored.stored) {
      console.warn(`[persist-clip] could not store the clip: ${stored.reason} — keeping the provider url, which WILL expire`);
    }
    const poster = clip.thumbnailUrl ? await ingestMedia(clip.thumbnailUrl) : null;

    const refs = [...(ctx.referenceAssetIds ?? []), ...bridgeIds];
    const assetId = newId('asset');
    await ctx.repo.put({
      id: assetId,
      user_id: ctx.userId,
      category: 'asset',
      status: 'active',
      created_at: now,
      updated_at: now,
      kind: 'video',
      source: 'generated',
      retention: 'ephemeral',
      thread_id: ctx.threadId,
      interaction_id: ctx.interactionId,
      url: stored.url,
      model: clip.modelId,
      model_label: clip.modelLabel || undefined,
      index: clip.index,
      prompt: ctx.prompt,
      gen_cost_usd: ctx.costUsd,
      duration_sec: clip.durationSec,
      has_audio: clip.hasAudio,
      thumbnail_url: poster?.url ?? clip.thumbnailUrl,
      reference_asset_ids: refs.length > 0 ? refs : undefined,
      // A CHAIN is a lineage CHAIN: beat 2's parent is beat 1, because beat 2 literally opens on the
      // frame beat 1 ended with.
      parent_asset_id: clip.openedOn ? ctx.previousClipAssetId : undefined,
    } as Asset);

    await promoteThreadForAsset(ctx.repo, ctx.threadId, now).catch(() => {});
    return assetId;
  } catch (err) {
    console.warn('[persist-clip] failed:', err);
    return null;
  }
}

/** Persist the user's pinned frames / references once per run, returning their asset ids. */
export async function persistReferences(
  urls: (string | undefined)[],
  ctx: Pick<PersistClipContext, 'repo' | 'userId' | 'threadId' | 'interactionId' | 'now'>,
): Promise<string[]> {
  const now = ctx.now ?? Date.now();
  const clean = urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  const ids: string[] = [];
  for (let i = 0; i < clean.length; i++) {
    try {
      const stored = await ingestMedia(clean[i]!);
      const id = newId('asset');
      await ctx.repo.put({
        id,
        user_id: ctx.userId,
        category: 'asset',
        status: 'active',
        created_at: now,
        updated_at: now,
        kind: 'image',
        source: 'upload',
        retention: 'ephemeral',
        thread_id: ctx.threadId,
        interaction_id: ctx.interactionId,
        url: stored.url,
        index: i,
      } as Asset);
      ids.push(id);
    } catch (err) {
      console.warn('[persist-clip] reference persist failed:', err);
    }
  }
  return ids;
}
