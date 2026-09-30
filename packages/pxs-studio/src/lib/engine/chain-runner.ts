/**
 * CHAIN RUNNER — the live wiring between the chain orchestrator and the real world.
 *
 * `clip-chain.ts` is deliberately dependency-injected and knows nothing about fal, budgets or the
 * database, which is what lets its twelve tests run without spending a cent. This is the other half:
 * the real renderer, the real frame extractor, and the real price of a beat.
 *
 * Kept out of the route because a route should marshal a request, not own a rendering strategy.
 */

import './adapters/fal-video';
import { extractFrame } from './adapters/fal-frames';
import { runClipChain, type ChainBeat, type ChainDeps, type ChainEvent, type ChainOptions } from './clip-chain';
import { getVideoExecutor } from './video-executor';
import { estimateVideoCost } from './video-cost';
import { MEDIA_MODELS, type MediaModel } from './media-registry';

export interface ChainRunInput {
  beats: ChainBeat[];
  modelId: string;
  resolution?: string;
  aspectRatio?: string;
  audio?: boolean;
  /** The still the FIRST beat opens on, when the user pinned one. */
  startFrame?: string;
  /**
   * Images that guide the LOOK — the car, the wardrobe, the palette — without being the frame the
   * shot opens on. The distinction matters: a reference showing the subject mid-action (flames
   * already lit, a door already open) would, as a startFrame, make the sequence BEGIN there.
   *
   * These reach beat 1 only. From beat 2 on, the model's image slot is taken by the bridging frame,
   * which is the stronger continuity signal anyway — it carries the subject forward as it actually
   * looked a moment ago rather than as a separate picture of it.
   */
  references?: string[];
  /** Remaining budget. The whole chain is priced against it BEFORE the first beat renders. */
  budgetUsd?: number;
  defaultDurationSec?: number;
}

/** Build the live deps for a model and run the chain. Yields the orchestrator's events unchanged. */
export async function* runLiveChain(input: ChainRunInput): AsyncGenerator<ChainEvent> {
  const model: MediaModel | undefined = MEDIA_MODELS.find((m) => m.id === input.modelId);
  if (!model) {
    yield { type: 'stopped', atBeat: 0, reason: `Unknown model "${input.modelId}".`, produced: 0 };
    yield { type: 'done', clips: [], costUsd: 0 };
    return;
  }
  const executor = getVideoExecutor(model.provider);
  if (!executor) {
    yield {
      type: 'stopped',
      atBeat: 0,
      reason: `${model.label} has no registered adapter, so it cannot render a chain.`,
      produced: 0,
    };
    yield { type: 'done', clips: [], costUsd: 0 };
    return;
  }

  const resolution = input.resolution ?? '720p';

  const deps: ChainDeps = {
    // ONE BEAT = ONE RENDER. `startFrame` is what makes it open where the last one landed; the
    // adapter routes that to the model's image-to-video endpoint.
    renderBeat: async ({ prompt, durationSec, startFrame, index }) => {
      let url = '';
      let costUsd = 0;
      let reason: string | undefined;
      let hasAudio: boolean | undefined;
      let clipDuration: number | undefined;
      try {
        for await (const ev of executor.generate({
          modelId: model.id,
          prompt,
          durationSec,
          resolution,
          aspectRatio: input.aspectRatio,
          audio: input.audio,
          startFrame,
          // Beat 1 only — see `references` above. A bridged beat already has its opening still.
          references: !startFrame && index === 0 ? input.references : undefined,
        })) {
          if (ev.type === 'clip') {
            url = ev.clip.url;
            hasAudio = ev.clip.hasAudio;
            clipDuration = ev.clip.durationSec;
          } else if (ev.type === 'done') {
            costUsd = ev.costUsd ?? 0;
          } else if (ev.type === 'error') {
            reason = ev.detail || ev.reason;
          }
        }
      } catch (err) {
        reason = err instanceof Error ? err.message : 'the renderer crashed';
      }
      return {
        clip: url ? { url, durationSec: clipDuration ?? durationSec, hasAudio } : null,
        costUsd,
        reason,
      };
    },

    extractLastFrame: (videoUrl) => extractFrame(videoUrl, 'last'),

    // The (low, high) band for ONE beat, from the same estimator a single render is priced with —
    // so a chain's quote and a render's quote can never drift apart.
    estimateBeatUsd: (durationSec) => {
      const est = estimateVideoCost(model, { durationSec, resolution, count: 1 });
      // `exact` marks a published per-second price; where it is inferred, widen the top of the band
      // so an estimate the user approves is not quietly optimistic.
      return est.exact ? [est.totalUsd, est.totalUsd] : [est.totalUsd, Number((est.totalUsd * 1.25).toFixed(3))];
    },
  };

  const opts: ChainOptions = {
    defaultDurationSec: input.defaultDurationSec ?? 5,
    startFrame: input.startFrame,
    budgetUsd: input.budgetUsd,
  };

  yield* runClipChain(input.beats, deps, opts);
}
