import { getDb } from '../../../../lib/db';
import { getJob, requestJobCancel, remainingBeats } from '../../../../lib/db/jobs';
import { startVideoJob } from '../../../../lib/engine/video-job-runner';
import type { Asset, Job } from '../../../../lib/db/models';

export const runtime = 'nodejs';

/** The job, plus the clips it has actually produced — what a waiting UI renders. */
async function withClips(job: Job) {
  const db = await getDb();
  const clips = [];
  for (const id of job.clip_asset_ids) {
    const a = (await db.get('asset', id)) as Asset | null;
    if (a) {
      clips.push({
        assetId: a.id,
        url: a.url,
        index: a.index,
        durationSec: a.duration_sec,
        hasAudio: a.has_audio,
        thumbnailUrl: a.thumbnail_url,
      });
    }
  }
  return {
    id: job.id,
    kind: job.kind,
    status: job.job_status,
    progress: job.progress,
    costUsd: job.cost_usd,
    error: job.error,
    // Only an INTERRUPTED job can be resumed: it is the one state where finishing is a matter of
    // continuing rather than retrying, and where the beats still owed are knowable.
    resumable: job.job_status === 'interrupted' && remainingBeats(job).length > 0,
    remainingBeats: job.job_status === 'interrupted' ? remainingBeats(job).length : undefined,
    clips,
    updatedAt: job.updated_at,
  };
}

/**
 * GET /api/jobs/:id — how is it going?
 *
 * Cheap and idempotent, because this is polled. The one piece of real work it does is deciding
 * whether a `running` job is actually alive: a cold heartbeat means the process died, and that is
 * resolved here at read time rather than by a sweeper nobody owns.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const db = await getDb();
    const job = await getJob(db, id);
    if (!job) return Response.json({ error: 'No such job.' }, { status: 404 });
    return Response.json(await withClips(job), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to read the job.' }, { status: 500 });
  }
}

/**
 * POST /api/jobs/:id — act on a job: `{ action: 'cancel' | 'resume' }`.
 *
 * CANCEL is cooperative and lands at the next beat boundary, which is the only point where stopping
 * costs nothing. A beat already rendering cannot be un-billed, and the response says so rather than
 * implying the spend stops instantly.
 *
 * RESUME is never automatic. Finishing an interrupted chain spends money, so it stays the user's
 * decision — the job sits there with its finished clips until they ask.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  try {
    const db = await getDb();
    const job = await getJob(db, id);
    if (!job) return Response.json({ error: 'No such job.' }, { status: 404 });

    if (body.action === 'cancel') {
      const ok = await requestJobCancel(db, id);
      if (!ok) return Response.json({ error: `This job is already ${job.job_status}.` }, { status: 409 });
      return Response.json({
        ok: true,
        message:
          'Stopping after the current beat. Anything already rendered is saved — a beat in flight ' +
          'cannot be un-billed.',
      });
    }

    if (body.action === 'resume') {
      if (job.job_status !== 'interrupted') {
        return Response.json({ error: `Only an interrupted job can be resumed; this one is ${job.job_status}.` }, { status: 409 });
      }
      const owed = remainingBeats(job);
      if (owed.length === 0) return Response.json({ error: 'Nothing left to render.' }, { status: 409 });
      // The worker derives its own starting point from the clips already recorded, so resuming is
      // just running it again — no separate resume path to drift out of sync.
      startVideoJob(db, { ...job, control: undefined });
      return Response.json({ ok: true, resumedWith: owed.length });
    }

    return Response.json({ error: "Unknown action. Use 'cancel' or 'resume'." }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to act on the job.' }, { status: 500 });
  }
}
