/**
 * Jobs — work that outlives the request that started it.
 *
 * A render is minutes; an HTTP request is seconds. Holding one inside the other gave a hard 600s
 * ceiling, lost all visibility when a tab closed, and threw away a running chain on a restart. The
 * first live chain died exactly that way: beat 1 rendered, was paid for, and vanished.
 *
 * The subtle part is INTERRUPTION. A job whose process died looks identical, in the database, to one
 * running perfectly well — nothing writes "I have crashed" on the way out. The heartbeat is the only
 * difference, and getting its staleness window wrong is expensive in both directions: too tight and
 * a healthy render is declared dead mid-beat (and "resuming" it pays for the same clip twice); too
 * loose and a dead job looks alive forever.
 *
 * Pure: memory repository, no network, no spend.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRepository } from '../adapters/memory';
import {
  HEARTBEAT_STALE_MS,
  createJob,
  getJob,
  isCancelRequested,
  listJobs,
  recordJobClip,
  remainingBeats,
  requestJobCancel,
  updateJob,
} from '../jobs';
import type { Job } from '../models';

const USER = 'dev-user';
const BEATS = [{ prompt: 'idle' }, { prompt: 'launch' }, { prompt: 'flame on the upshift' }];

async function newChain(repo = createMemoryRepository(), now = Date.now()) {
  const job = await createJob(
    repo,
    { user_id: USER, kind: 'video_chain', totalBeats: BEATS.length, thread_id: 't1', spec: { beats: BEATS, modelId: 'seedance-2.5' } },
    now,
  );
  return { repo, job };
}

test('a new job is QUEUED with nothing produced and nothing spent', async () => {
  const { job } = await newChain();
  assert.equal(job.job_status, 'queued');
  assert.deepEqual(job.clip_asset_ids, []);
  assert.equal(job.cost_usd, 0);
  assert.equal(job.progress.totalBeats, 3);
});

test('each finished beat advances the job and accumulates its cost', async () => {
  const { repo, job } = await newChain();
  await recordJobClip(repo, job.id, 'asset-1', 0.5);
  await recordJobClip(repo, job.id, 'asset-2', 0.5);
  const after = (await getJob(repo, job.id))!;
  assert.deepEqual(after.clip_asset_ids, ['asset-1', 'asset-2']);
  assert.equal(after.cost_usd, 1, 'spend accumulates per beat, not at the end');
  assert.equal(after.progress.beatIndex, 2);
});

// ── INTERRUPTION ─────────────────────────────────────────────────────────────────────────────────

test('a running job with a FRESH heartbeat is left alone', async () => {
  const { repo, job } = await newChain();
  const now = Date.now();
  await updateJob(repo, job.id, { job_status: 'running' }, now);
  const read = (await getJob(repo, job.id, now + 1000))!;
  assert.equal(read.job_status, 'running', 'a live render must never be declared dead mid-beat');
});

test('a running job with a COLD heartbeat is reported as interrupted', async () => {
  const { repo, job } = await newChain();
  const now = Date.now();
  await updateJob(repo, job.id, { job_status: 'running' }, now);
  const read = (await getJob(repo, job.id, now + HEARTBEAT_STALE_MS + 1000))!;
  assert.equal(read.job_status, 'interrupted');
  assert.match(read.error!, /saved/i, 'the user must be told their finished clips survived');
});

test('interruption is WRITTEN BACK, so the state settles once', async () => {
  const { repo, job } = await newChain();
  const now = Date.now();
  await updateJob(repo, job.id, { job_status: 'running' }, now);
  await getJob(repo, job.id, now + HEARTBEAT_STALE_MS + 1000);
  const raw = (await repo.get('job', job.id)) as Job;
  assert.equal(raw.job_status, 'interrupted', 'not re-derived by every reader');
});

test('the staleness window is longer than a single beat', () => {
  // A beat is 75-120s and the worker only stamps BETWEEN beats. A window under that would declare a
  // healthy render dead and offer to re-render a clip already being paid for.
  assert.ok(HEARTBEAT_STALE_MS > 120_000 * 2, 'must comfortably exceed one beat');
});

test('a finished job is never reinterpreted, however old', async () => {
  const { repo, job } = await newChain();
  await updateJob(repo, job.id, { job_status: 'done' });
  const read = (await getJob(repo, job.id, Date.now() + HEARTBEAT_STALE_MS * 10))!;
  assert.equal(read.job_status, 'done', 'only a RUNNING job can be interrupted');
});

// ── RESUME ───────────────────────────────────────────────────────────────────────────────────────

test('remaining beats come from the CLIPS produced, not a stored cursor', async () => {
  const { repo, job } = await newChain();
  await recordJobClip(repo, job.id, 'asset-1', 0.5);
  const after = (await getJob(repo, job.id))!;
  assert.deepEqual(
    remainingBeats(after).map((b) => b.prompt),
    ['launch', 'flame on the upshift'],
    'the clips are what cost money — they are the source of truth for what is still owed',
  );
});

test('a job that produced every beat owes nothing', async () => {
  const { repo, job } = await newChain();
  for (let i = 0; i < BEATS.length; i++) await recordJobClip(repo, job.id, `asset-${i}`, 0.5);
  assert.deepEqual(remainingBeats((await getJob(repo, job.id))!), []);
});

// ── CANCELLATION ─────────────────────────────────────────────────────────────────────────────────

test('cancel sets a flag the worker reads at the beat boundary', async () => {
  const { repo, job } = await newChain();
  await updateJob(repo, job.id, { job_status: 'running' });
  assert.equal(await isCancelRequested(repo, job.id), false);
  assert.equal(await requestJobCancel(repo, job.id), true);
  assert.equal(await isCancelRequested(repo, job.id), true);
});

test('a job that already finished cannot be cancelled', async () => {
  const { repo, job } = await newChain();
  await updateJob(repo, job.id, { job_status: 'done' });
  assert.equal(await requestJobCancel(repo, job.id), false, 'there is nothing left to stop');
});

test('jobs are listed newest first', async () => {
  const repo = createMemoryRepository();
  const a = await createJob(repo, { user_id: USER, kind: 'video_render', totalBeats: 1, spec: { modelId: 'm' } }, 1000);
  const b = await createJob(repo, { user_id: USER, kind: 'video_render', totalBeats: 1, spec: { modelId: 'm' } }, 2000);
  const list = await listJobs(repo, USER);
  assert.equal(list[0]!.id, b.id);
  assert.equal(list[1]!.id, a.id);
});

test('one user cannot see another user\'s jobs', async () => {
  const repo = createMemoryRepository();
  await createJob(repo, { user_id: 'someone-else', kind: 'video_render', totalBeats: 1, spec: { modelId: 'm' } });
  assert.deepEqual(await listJobs(repo, USER), []);
});
