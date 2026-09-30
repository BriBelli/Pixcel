/**
 * THE VIDEO JOB WORKER — the thing that outlives the request.
 *
 * A render is minutes; an HTTP request is seconds. Holding one inside the other gave us a hard 600s
 * ceiling (a 2-beat chain barely fit, a 3-beat one could not), lost all visibility the moment a tab
 * closed, and threw away a running chain on a server restart — while the user paid for every second.
 *
 * So the request starts the work and lets go. This runs it, writing everything it learns into the
 * job record as it goes, which is what makes the work watchable from anywhere, survivable across a
 * restart, and RESUMABLE from the beat it reached rather than from the beginning.
 *
 * FIRE-AND-FORGET, DELIBERATELY UNAWAITED. `void startVideoJob(...)` — the caller must not await it,
 * and nothing here may throw into its caller.
 */

import type { Repository } from '../db/repository';
import type { Job } from '../db/models';
import { isCancelRequested, recordJobClip, remainingBeats, updateJob } from '../db/jobs';
import { persistClip, persistReferences } from '../db/persist-clip';
import { runLiveChain } from './chain-runner';
import { MEDIA_MODELS } from './media-registry';

/** Look up the model's label once, so persisted clips carry a human name rather than a slug. */
function labelFor(modelId: string): string {
  return MEDIA_MODELS.find((m) => m.id === modelId)?.label ?? modelId;
}

/**
 * Run a job to completion, or to an honest stop.
 *
 * Never throws: the only caller is a fire-and-forget `void`, so an escaping error would become an
 * unhandled rejection and take the job's final state with it. Every exit writes a status.
 */
export async function runVideoJob(repo: Repository, job: Job): Promise<void> {
  const now = Date.now();
  const modelLabel = labelFor(job.spec.modelId);

  try {
    await updateJob(repo, job.id, { job_status: 'running', progress: { ...job.progress, stage: 'Starting…' } }, now);

    // The user's own pinned frames, persisted once for the whole run.
    const referenceAssetIds = await persistReferences(
      [job.spec.startFrame, ...(job.spec.references ?? [])],
      { repo, userId: job.user_id, threadId: job.thread_id ?? '', interactionId: job.interaction_id ?? '' },
    );

    // RESUME is derived from the clips already produced, not from a stored cursor: the clips are the
    // thing that cost money, so a counter that disagreed with them would either re-render a beat the
    // user has paid for or skip one they have not.
    const beats = remainingBeats(job);
    const alreadyDone = job.clip_asset_ids.length;
    if (beats.length === 0) {
      await updateJob(repo, job.id, { job_status: 'done', progress: { ...job.progress, stage: undefined } });
      return;
    }

    // A resumed chain opens where it left off. Without this it would start from a blank frame and
    // the seam would be visible in the finished sequence.
    let startFrame = job.spec.startFrame;
    let previousClipAssetId: string | undefined = job.clip_asset_ids[job.clip_asset_ids.length - 1];
    if (alreadyDone > 0) {
      const last = (await repo.get('asset', previousClipAssetId!)) as { url?: string } | null;
      if (last?.url) startFrame = last.url;
    }

    let produced = alreadyDone;
    let stopped: string | undefined;

    for await (const ev of runLiveChain({
      beats,
      modelId: job.spec.modelId,
      resolution: job.spec.resolution,
      aspectRatio: job.spec.aspectRatio,
      audio: job.spec.audio,
      startFrame,
      references: job.spec.references,
      budgetUsd: job.spec.budgetUsd,
      defaultDurationSec: job.spec.defaultDurationSec,
    })) {
      // Cancellation is checked at the BEAT BOUNDARY — the only place stopping is free. A beat
      // already in flight cannot be un-billed, so the promise is "no further beats", not "no
      // further charge", and the message says exactly that.
      if (ev.type === 'beat_start') {
        if (await isCancelRequested(repo, job.id)) {
          await updateJob(repo, job.id, {
            job_status: 'cancelled',
            error: `Cancelled after ${produced} of ${job.progress.totalBeats} beats. Everything rendered so far is saved.`,
            progress: { ...job.progress, beatIndex: produced, stage: undefined },
          });
          return;
        }
        await updateJob(repo, job.id, {
          progress: {
            ...job.progress,
            beatIndex: produced,
            stage: `Rendering beat ${produced + 1} of ${job.progress.totalBeats}…`,
          },
        });
      } else if (ev.type === 'bridging') {
        await updateJob(repo, job.id, {
          progress: { ...job.progress, beatIndex: produced, stage: 'Carrying the last frame forward…' },
        });
      } else if (ev.type === 'clip') {
        // Written down the MOMENT it exists. This is what makes the work survivable.
        const assetId = await persistClip(
          {
            url: ev.clip.url,
            modelId: job.spec.modelId,
            modelLabel,
            index: ev.clip.index + alreadyDone,
            durationSec: ev.clip.durationSec,
            hasAudio: ev.clip.hasAudio,
            openedOn: ev.clip.openedOn,
          },
          {
            repo,
            userId: job.user_id,
            threadId: job.thread_id ?? '',
            interactionId: job.interaction_id ?? '',
            prompt: beats[ev.clip.index]?.prompt ?? job.spec.prompt ?? '',
            referenceAssetIds,
            previousClipAssetId,
            costUsd: ev.clip.costUsd,
          },
        );
        if (assetId) {
          previousClipAssetId = assetId;
          await recordJobClip(repo, job.id, assetId, ev.clip.costUsd);
        }
        produced++;
      } else if (ev.type === 'stopped') {
        stopped = ev.reason;
      }
    }

    const final = (await repo.get('job', job.id)) as Job | null;
    const total = final?.clip_asset_ids.length ?? produced;

    if (stopped) {
      // A stop that produced NOTHING is a failure; one that produced some beats is a partial result
      // the user paid for, and calling that "failed" would misrepresent what they actually have.
      await updateJob(repo, job.id, {
        job_status: total > 0 ? 'done' : 'failed',
        error: stopped,
        progress: { ...job.progress, beatIndex: total, stage: undefined },
      });
      return;
    }

    await updateJob(repo, job.id, {
      job_status: 'done',
      progress: { ...job.progress, beatIndex: total, stage: undefined },
    });
  } catch (err) {
    await updateJob(repo, job.id, {
      job_status: 'failed',
      error: err instanceof Error ? err.message : 'The render failed unexpectedly.',
    }).catch(() => {
      /* the job record is the last thing we can write; if that fails there is nowhere left to say so */
    });
  }
}

/**
 * Start a job without waiting for it. The caller returns to the user immediately.
 *
 * `void startVideoJob(...)` is the intended call — awaiting it reintroduces the exact coupling this
 * whole file exists to remove.
 */
export function startVideoJob(repo: Repository, job: Job): void {
  void runVideoJob(repo, job).catch((err) => {
    console.warn('[video-job] runner escaped:', err);
  });
}
