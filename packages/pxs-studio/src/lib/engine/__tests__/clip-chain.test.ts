/**
 * Clip chaining — a shot per beat, each opening where the last one landed.
 *
 * The Lamborghini. Brian asked for "dead still, then absolutely rips, flames on the upshift" and got
 * a car that drives. No video model here has a timeline, so the beats were averaged into one motion
 * instead of sequenced. The fix is not a better prompt; it is rendering each beat as its own clip
 * and opening the next on the previous one's final frame.
 *
 * Pure: every dependency is injected, so this spends nothing and touches no network.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { estimateChain, runClipChain, type ChainDeps, type ChainEvent } from '../clip-chain';

const BEATS = [
  { prompt: 'the car sits dead still at idle, rain beading on the hood' },
  { prompt: 'it launches hard, rear tyres spinning up spray' },
  { prompt: 'flame spits from the exhaust as it upshifts and pulls away' },
];

/** A chain that always succeeds, recording what each beat was asked to open on. */
function happyDeps(opened: (string | undefined)[] = []): ChainDeps {
  return {
    renderBeat: async ({ index, startFrame }) => {
      opened.push(startFrame);
      return { clip: { url: `https://provider.test/clip-${index}.mp4`, durationSec: 5, hasAudio: true }, costUsd: 0.5 };
    },
    extractLastFrame: async (videoUrl) => ({ frame: { url: `${videoUrl}#lastframe` } }),
    estimateBeatUsd: () => [0.4, 0.6],
  };
}

async function collect(gen: AsyncGenerator<ChainEvent>): Promise<ChainEvent[]> {
  const out: ChainEvent[] = [];
  for await (const ev of gen) out.push(ev);
  return out;
}

test('each beat opens on the PREVIOUS beat\'s last frame — that is the whole technique', async () => {
  const opened: (string | undefined)[] = [];
  const events = await collect(runClipChain(BEATS, happyDeps(opened)));

  assert.equal(opened.length, 3, 'every beat renders');
  assert.equal(opened[0], undefined, 'beat 1 opens on nothing — there is no previous shot');
  assert.equal(opened[1], 'https://provider.test/clip-0.mp4#lastframe', 'beat 2 opens where beat 1 landed');
  assert.equal(opened[2], 'https://provider.test/clip-1.mp4#lastframe', 'beat 3 opens where beat 2 landed');

  const done = events.find((e) => e.type === 'done') as Extract<ChainEvent, { type: 'done' }>;
  assert.equal(done.clips.length, 3);
  assert.equal(done.costUsd, 1.5, 'N beats cost N renders — the whole reason budget is settled first');
});

test('the FIRST beat can open on a still the user pinned', async () => {
  const opened: (string | undefined)[] = [];
  await collect(runClipChain(BEATS, happyDeps(opened), { startFrame: 'https://user.test/hero.png' }));
  assert.equal(opened[0], 'https://user.test/hero.png');
});

test('no bridging frame is pulled after the LAST beat', async () => {
  let extractions = 0;
  const deps = happyDeps();
  const counting: ChainDeps = {
    ...deps,
    extractLastFrame: async (u) => {
      extractions++;
      return deps.extractLastFrame(u);
    },
  };
  await collect(runClipChain(BEATS, counting));
  assert.equal(extractions, 2, '3 beats need 2 bridges — a third would cost time and buy nothing');
});

// ── MONEY ────────────────────────────────────────────────────────────────────────────────────────
// Brian on budgets: "I don't like degrading things for the person. I'd rather just say your budget
// is unavailable for what you requested."

test('a chain over budget is refused WHOLE, before anything renders', async () => {
  let rendered = 0;
  const deps = happyDeps();
  const events = await collect(
    runClipChain(BEATS, { ...deps, renderBeat: async (i) => { rendered++; return deps.renderBeat(i); } }, { budgetUsd: 1.0 }),
  );

  assert.equal(rendered, 0, 'not one frame is rendered on a chain that cannot be paid for');
  const stop = events.find((e) => e.type === 'stopped') as Extract<ChainEvent, { type: 'stopped' }>;
  assert.ok(stop, 'the refusal must be explicit');
  assert.match(stop.reason, /\$1\.80/, 'it must quote what the chain actually costs');
  assert.match(stop.reason, /nothing was rendered/i);
  assert.ok(!events.some((e) => e.type === 'clip'), 'and produce no clips');
});

test('the chain is never silently SHORTENED to fit a budget', async () => {
  const events = await collect(runClipChain(BEATS, happyDeps(), { budgetUsd: 1.0 }));
  const done = events.find((e) => e.type === 'done');
  assert.equal(done, undefined, 'a refused chain does not quietly deliver a partial sequence');
});

test('an affordable chain quotes its worst case up front', async () => {
  const events = await collect(runClipChain(BEATS, happyDeps(), { budgetUsd: 5 }));
  const plan = events.find((e) => e.type === 'plan') as Extract<ChainEvent, { type: 'plan' }>;
  assert.equal(plan.beats, 3);
  assert.equal(plan.estimatedUsd, 1.8, 'the HIGH estimate — a surprise is only ever pleasant downward');
});

test('estimateChain sums per-beat bands across every beat', () => {
  const est = estimateChain(BEATS, () => [0.4, 0.6]);
  assert.deepEqual(est, { low: 1.2, high: 1.8 });
});

// ── PARTIAL RESULTS ARE PAID FOR, SO THEY ARE KEPT ───────────────────────────────────────────────

test('a failed beat stops the chain but KEEPS what was already produced', async () => {
  const deps = happyDeps();
  const events = await collect(
    runClipChain(BEATS, {
      ...deps,
      renderBeat: async (i) =>
        i.index === 2 ? { clip: null, costUsd: 0, reason: 'the provider moderated this beat' } : deps.renderBeat(i),
    }),
  );

  const done = events.find((e) => e.type === 'done') as Extract<ChainEvent, { type: 'done' }>;
  assert.equal(done.clips.length, 2, 'the two paid-for beats survive the third beat failing');
  const stop = events.find((e) => e.type === 'stopped') as Extract<ChainEvent, { type: 'stopped' }>;
  assert.equal(stop.atBeat, 2);
  assert.match(stop.reason, /moderated/, "the provider's own reason reaches the user");
});

test('a failed BRIDGE stops honestly rather than rendering a disconnected beat', async () => {
  const deps = happyDeps();
  let rendered = 0;
  const events = await collect(
    runClipChain(BEATS, {
      ...deps,
      renderBeat: async (i) => { rendered++; return deps.renderBeat(i); },
      extractLastFrame: async () => ({ frame: null, reason: 'extract-frame timed out' }),
    }),
  );

  assert.equal(rendered, 1, 'beat 2 must NOT render — without the still it would not connect');
  const done = events.find((e) => e.type === 'done') as Extract<ChainEvent, { type: 'done' }>;
  assert.equal(done.clips.length, 1, 'and beat 1 is kept');
  const stop = events.find((e) => e.type === 'stopped') as Extract<ChainEvent, { type: 'stopped' }>;
  assert.match(stop.reason, /timed out/);
  assert.match(stop.reason, /saved/i, 'the user must be told their paid work survived');
});

test('an empty chain is a no-op, not an error', async () => {
  const events = await collect(runClipChain([], happyDeps()));
  assert.deepEqual(events, [{ type: 'done', clips: [], costUsd: 0 }]);
});

test('a single beat chains nothing and extracts nothing', async () => {
  let extractions = 0;
  const deps = happyDeps();
  await collect(
    runClipChain([BEATS[0]!], { ...deps, extractLastFrame: async (u) => { extractions++; return deps.extractLastFrame(u); } }),
  );
  assert.equal(extractions, 0);
});

test('per-beat durations are honored over the chain default', async () => {
  const seen: number[] = [];
  const deps = happyDeps();
  await collect(
    runClipChain(
      [{ prompt: 'idle', durationSec: 3 }, { prompt: 'launch' }],
      { ...deps, renderBeat: async (i) => { seen.push(i.durationSec); return deps.renderBeat(i); } },
      { defaultDurationSec: 8 },
    ),
  );
  assert.deepEqual(seen, [3, 8], 'a beat that states its length keeps it; the rest take the default');
});
