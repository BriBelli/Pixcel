import { DEV_USER_ID, getDb } from '../../../lib/db';
import { checkCap } from '../../../lib/db/usage';
import { createJob, listJobs } from '../../../lib/db/jobs';
import { startVideoJob } from '../../../lib/engine/video-job-runner';
import type { Thread } from '../../../lib/db/models';

export const runtime = 'nodejs';

const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** GET /api/jobs — the user's jobs, newest first. "You have a render running" is read from here. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = (url.searchParams.get('user_id') ?? '').trim() || DEV_USER_ID;
  try {
    const db = await getDb();
    const jobs = await listJobs(db, userId);
    return Response.json(
      {
        jobs: jobs.map((j) => ({
          id: j.id,
          kind: j.kind,
          status: j.job_status,
          progress: j.progress,
          costUsd: j.cost_usd,
          clips: j.clip_asset_ids.length,
          error: j.error,
          updatedAt: j.updated_at,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to list jobs.' }, { status: 500 });
  }
}

/**
 * POST /api/jobs — start video work and RETURN IMMEDIATELY.
 *
 * This is the whole point of the job architecture: the request records what to do, hands back an id,
 * and lets go. The render then has no relationship to the request that asked for it — no 600s
 * ceiling, no lost visibility when a tab closes, and a server restart leaves a resumable record
 * rather than a hole where a paid-for render used to be.
 *
 * The spend gate still runs HERE, before the job is created, so a job that could never be afforded
 * is refused at the door rather than discovered mid-chain.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    user_id?: string;
    thread_id?: string;
    kind?: 'video_chain' | 'video_render';
    prompt?: string;
    beats?: { prompt?: string; durationSec?: number }[];
    modelId?: string;
    resolution?: string;
    aspectRatio?: string;
    audio?: boolean;
    startFrame?: string;
    keyframes?: { url: string; atSec: number }[];
    references?: string[];
    durationSec?: number;
  };

  const userId = (body.user_id ?? '').trim() || DEV_USER_ID;
  const beats = (body.beats ?? [])
    .map((b) => ({ prompt: (b?.prompt ?? '').trim(), durationSec: b?.durationSec }))
    .filter((b) => b.prompt.length > 0);
  const prompt = (body.prompt ?? '').trim();

  // A CHAIN needs two or more beats; one beat is an ordinary render and chaining it would cost more
  // for the same shot.
  const kind: 'video_chain' | 'video_render' = beats.length >= 2 ? 'video_chain' : 'video_render';
  if (kind === 'video_render' && !prompt) {
    return Response.json({ error: 'A prompt, or two or more beats, is required.' }, { status: 400 });
  }
  const modelId = (body.modelId ?? '').trim() || 'seedance-2.5';

  try {
    const db = await getDb();

    let remainingUsd: number | undefined;
    try {
      const cap = await checkCap(db, userId);
      remainingUsd = cap.remaining_usd;
      if (!cap.allowed) {
        return Response.json(
          {
            error: `Budget reached — $${cap.spent_usd.toFixed(2)} of $${cap.cap_usd.toFixed(2)} spent. Raise your budget to keep generating.`,
          },
          { status: 402 },
        );
      }
    } catch {
      /* a cap check that cannot run must not block the work */
    }

    // Ensure a thread so the clips are never orphaned.
    const now = Date.now();
    let threadId = (body.thread_id ?? '').trim();
    const existing = threadId ? await db.get('thread', threadId) : null;
    if (!existing) {
      threadId = threadId || newId('thread');
      await db.put({
        id: threadId,
        user_id: userId,
        category: 'thread',
        status: 'active',
        created_at: now,
        updated_at: now,
        title: (beats[0]?.prompt ?? prompt).slice(0, 40),
      } as Thread);
    }

    const job = await createJob(db, {
      user_id: userId,
      kind,
      thread_id: threadId,
      interaction_id: newId('interaction'),
      totalBeats: kind === 'video_chain' ? beats.length : 1,
      spec: {
        beats: kind === 'video_chain' ? beats : [{ prompt, durationSec: body.durationSec }],
        prompt: prompt || undefined,
        modelId,
        resolution: body.resolution,
        aspectRatio: body.aspectRatio,
        audio: body.audio,
        startFrame: body.startFrame,
        references: body.references,
        budgetUsd: remainingUsd,
        defaultDurationSec: body.durationSec,
      },
    });

    // FIRE AND FORGET — deliberately unawaited. Awaiting here would rebuild the exact coupling this
    // architecture exists to remove.
    startVideoJob(db, job);

    return Response.json({ jobId: job.id, kind, totalBeats: job.progress.totalBeats, threadId }, { status: 202 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to start the job.' }, { status: 500 });
  }
}
