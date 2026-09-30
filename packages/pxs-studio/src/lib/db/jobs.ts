/**
 * THE JOB STORE — reading and writing work that outlives the request that started it.
 *
 * The one piece of real logic in here is INTERRUPTION DETECTION. A job that stopped because its
 * process died looks, in the database, exactly like a job that is running perfectly well: status
 * `running`, some clips done, more to go. Nothing writes "I have crashed" on the way out.
 *
 * The difference is the HEARTBEAT. A live worker stamps the job between beats; a dead one stops. So
 * a `running` job whose heartbeat has gone cold is interrupted, and that is decided at READ time
 * rather than by a sweeper — no background process to own, and the answer is always current.
 */

import type { Repository } from './repository';
import type { Job } from './models';

/**
 * How long a heartbeat may go cold before the job is presumed dead.
 *
 * Generous on purpose: a single video beat is 75-120 seconds and the worker only stamps BETWEEN
 * beats, so anything tighter would declare a perfectly healthy render dead mid-beat — and offering
 * to "resume" a job that is still running is how you pay for the same clip twice.
 */
export const HEARTBEAT_STALE_MS = 6 * 60 * 1000;

const newJobId = () => `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export interface CreateJobInput {
  user_id: string;
  kind: Job['kind'];
  spec: Job['spec'];
  totalBeats: number;
  thread_id?: string;
  interaction_id?: string;
}

/** Record the work as QUEUED. The worker picks it up; the request returns the id and lets go. */
export async function createJob(repo: Repository, input: CreateJobInput, now = Date.now()): Promise<Job> {
  const job: Job = {
    id: newJobId(),
    user_id: input.user_id,
    category: 'job',
    status: 'active',
    created_at: now,
    updated_at: now,
    kind: input.kind,
    job_status: 'queued',
    spec: input.spec,
    progress: { beatIndex: 0, totalBeats: input.totalBeats },
    clip_asset_ids: [],
    cost_usd: 0,
    thread_id: input.thread_id,
    interaction_id: input.interaction_id,
  };
  await repo.put(job);
  return job;
}

/**
 * Read a job, resolving what its stored status actually MEANS right now.
 *
 * A `running` job with a cold heartbeat is reported as `interrupted` — and written back, so the
 * state is settled once rather than re-derived by every reader.
 */
export async function getJob(repo: Repository, id: string, now = Date.now()): Promise<Job | null> {
  const job = (await repo.get('job', id)) as Job | null;
  if (!job) return null;
  if (job.job_status !== 'running') return job;

  const beat = job.heartbeat_at ?? job.updated_at;
  if (now - beat <= HEARTBEAT_STALE_MS) return job;

  const interrupted: Job = {
    ...job,
    job_status: 'interrupted',
    error: 'Interrupted — the server stopped while this was running. The clips it finished are saved.',
    updated_at: now,
  };
  await repo.update<Job>('job', id, {
    job_status: interrupted.job_status,
    error: interrupted.error,
  } as Partial<Job>);
  return interrupted;
}

/** Patch a job. Every write stamps the heartbeat, which is what keeps a live job looking alive. */
export async function updateJob(
  repo: Repository,
  id: string,
  patch: Partial<Job>,
  now = Date.now(),
): Promise<void> {
  await repo.update<Job>('job', id, { ...patch, heartbeat_at: now } as Partial<Job>);
}

/** Record one finished beat: its asset, its cost, and where the work has got to. */
export async function recordJobClip(
  repo: Repository,
  id: string,
  clipAssetId: string,
  costUsd: number,
  now = Date.now(),
): Promise<void> {
  const job = (await repo.get('job', id)) as Job | null;
  if (!job) return;
  await updateJob(
    repo,
    id,
    {
      clip_asset_ids: [...job.clip_asset_ids, clipAssetId],
      cost_usd: Number((job.cost_usd + costUsd).toFixed(4)),
      progress: { ...job.progress, beatIndex: job.clip_asset_ids.length + 1 },
    },
    now,
  );
}

/**
 * Ask a running job to stop.
 *
 * Cooperative, and checked BETWEEN beats — the only point where stopping is free. A beat already in
 * flight cannot be un-billed, so the honest promise is "no further beats", not "no further charge".
 */
export async function requestJobCancel(repo: Repository, id: string, now = Date.now()): Promise<boolean> {
  const job = (await repo.get('job', id)) as Job | null;
  if (!job) return false;
  if (job.job_status !== 'running' && job.job_status !== 'queued') return false;
  await updateJob(repo, id, { control: 'cancel' }, now);
  return true;
}

/** Has this job been asked to stop? Called by the worker at each beat boundary. */
export async function isCancelRequested(repo: Repository, id: string): Promise<boolean> {
  const job = (await repo.get('job', id)) as Job | null;
  return job?.control === 'cancel';
}

/** A user's jobs, newest first — what "you have a render running" is read from. */
export async function listJobs(repo: Repository, user_id: string, limit = 20): Promise<Job[]> {
  const { items } = await repo.query({ category: 'job', user_id, limit, sort: 'desc' });
  return items as Job[];
}

/**
 * The beats a RESUMED job still owes.
 *
 * Derived from clips already produced rather than from a stored cursor, because the clips are the
 * thing that actually cost money — trusting a counter that disagrees with them would either
 * re-render a beat the user has paid for or skip one they have not.
 */
export function remainingBeats(job: Job): { prompt: string; durationSec?: number }[] {
  const all = job.spec.beats ?? [];
  return all.slice(job.clip_asset_ids.length);
}
