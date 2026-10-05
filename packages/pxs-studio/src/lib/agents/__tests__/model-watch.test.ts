/**
 * The model watch — asking "are we behind?" on a schedule, and saying so out loud.
 *
 * The succession sweep was fixed to tell the truth and remained useless for two more reasons: it
 * only ran when someone generated an image, and nothing surfaced what it found. It sat eight days
 * stale while OpenAI shipped two generations, then reported into a JSON response nobody read.
 *
 * These cover the part with real logic: what gets shown, what stays dismissed, and the distinction
 * between "nothing is newer" and "we could not look" — the conflation that started all of this.
 *
 * Pure: memory repository, no network.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRepository } from '../../db/adapters/memory';
import { acknowledge, readWatchState, unacknowledged, WATCH_RECORD_ID, type WatchState } from '../model-watch';

const FINDINGS = [
  { currentId: 'gpt-image-1.5', currentVersion: '1.5', successorId: 'gpt-image-2.5-flare', successorVersion: '2.5', foundOn: 'openai' },
  { currentId: 'flux-2-pro', currentVersion: '2', successorId: 'flux-3', successorVersion: '3', foundOn: 'fal' },
];

async function seed(state: Partial<WatchState> = {}) {
  const repo = createMemoryRepository();
  const full: WatchState = { checkedAt: Date.now(), behind: FINDINGS, failedHosts: [], ...state };
  await repo.put({
    id: WATCH_RECORD_ID,
    user_id: 'system',
    category: 'model_refresh',
    status: 'active',
    created_at: full.checkedAt,
    updated_at: full.checkedAt,
    state: full,
  } as never);
  return repo;
}

test('findings are readable back, so a notice has something to show', async () => {
  const repo = await seed();
  const state = await readWatchState(repo);
  assert.equal(state?.behind.length, 2);
  assert.equal(unacknowledged(state).length, 2);
});

test('a dismissed finding stays quiet', async () => {
  const repo = await seed();
  await acknowledge(repo, 'flux-3');
  const after = await readWatchState(repo);
  assert.deepEqual(
    unacknowledged(after).map((b) => b.successorId),
    ['gpt-image-2.5-flare'],
    'only the dismissed one goes quiet',
  );
});

test('dismissing is per FINDING, never a blanket mute', async () => {
  const repo = await seed();
  await acknowledge(repo, 'flux-3');
  await acknowledge(repo, 'gpt-image-2.5-flare');
  assert.deepEqual(unacknowledged(await readWatchState(repo)), [], 'both dismissed');

  // Something NEWER than what was dismissed is news again — a blanket mute would silence it.
  const state = (await readWatchState(repo))!;
  state.behind = [
    ...FINDINGS,
    { currentId: 'flux-2-pro', currentVersion: '2', successorId: 'flux-4', successorVersion: '4', foundOn: 'fal' },
  ];
  assert.deepEqual(
    unacknowledged(state).map((b) => b.successorId),
    ['flux-4'],
    'a newer model than the dismissed one must still be reported',
  );
});

test('acknowledging the same thing twice does not duplicate', async () => {
  const repo = await seed();
  await acknowledge(repo, 'flux-3');
  await acknowledge(repo, 'flux-3');
  const state = await readWatchState(repo);
  assert.equal(state?.acknowledged?.filter((id) => id === 'flux-3').length, 1);
});

test('nothing found and nothing dismissed means nothing to say', async () => {
  const repo = await seed({ behind: [] });
  assert.deepEqual(unacknowledged(await readWatchState(repo)), [], 'the common case is silence');
});

test('a never-run watch reports nothing rather than guessing', async () => {
  const repo = createMemoryRepository();
  assert.equal(await readWatchState(repo), null);
  assert.deepEqual(unacknowledged(null), []);
});

// ── THE DISTINCTION THAT STARTED ALL OF THIS ─────────────────────────────────────────────────────
// A provider that refused to answer was folded into "nothing found" for weeks. The state keeps the
// two apart so a notice can say "this list may be incomplete" instead of implying all-clear.

test('a host that would not answer is recorded SEPARATELY from having no findings', async () => {
  const repo = await seed({ behind: [], failedHosts: ['openai', 'gemini'] });
  const state = await readWatchState(repo);
  assert.deepEqual(unacknowledged(state), [], 'no findings');
  assert.deepEqual(state?.failedHosts, ['openai', 'gemini'], 'but we could not look everywhere');
});

test('acknowledging on a watch that has never run is a no-op, not a crash', async () => {
  const repo = createMemoryRepository();
  assert.equal(await acknowledge(repo, 'flux-3'), null);
});
