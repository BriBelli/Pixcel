/**
 * Shot-frame tests — the timeline must render the SELECTED MODEL'S real slots, not a generic ideal.
 * Pure; no network, no spend.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planFrames, validateFrames, framesToRequest } from '../shot-frames';
import { allVideoModels } from '../../agents/video-model-agent';
import type { MediaModel } from '../media-registry';

const seedance = allVideoModels().find((m) => m.id === 'seedance-2')!;
const kling = allVideoModels().find((m) => m.id === 'kling-3')!;
const cap = (m: MediaModel, slot: string) => planFrames(m).offers.find((o) => o.slot === slot)!;

test('the timeline offers what THIS model actually takes', () => {
  // Seedance interpolates between two stills and holds 9 references.
  assert.equal(cap(seedance, 'start').capacity, 1);
  assert.equal(cap(seedance, 'end').capacity, 1);
  assert.equal(cap(seedance, 'reference').capacity, 9);
  assert.equal(planFrames(seedance).supportsInterpolation, true);

  // Kling opens on a still but does not choose where the shot lands.
  assert.equal(cap(kling, 'start').capacity, 1);
  assert.equal(cap(kling, 'end').capacity, 1); // kling declares 'keyframe' motion
});

test('an unavailable slot carries a REASON — never a silently missing control', () => {
  const textOnly = {
    ...seedance,
    label: 'TextOnly',
    video: { ...seedance.video!, motion: ['text'], maxReferenceImages: 0 },
  } as MediaModel;
  const plan = planFrames(textOnly);
  assert.equal(plan.offers.every((o) => o.capacity === 0), true);
  assert.match(plan.offers.find((o) => o.slot === 'start')!.unavailable!, /text only/i);
  assert.match(plan.offers.find((o) => o.slot === 'reference')!.unavailable!, /no reference images/i);
});

test('a model without the parameter is honest about HOW mid-shot timing works there', () => {
  // This used to assert `supported: false` for every model, because no wired model took a frame at a
  // chosen time. That was true when written and became a hand-typed claim about what models cannot
  // do — FLUX.3 takes a list of stills pinned to frame indices. The capability is now READ, and the
  // distinction that matters is native (a parameter) versus asked-for (a request).
  const plan = planFrames(seedance);
  assert.equal(plan.midShotKeyframes.native, false, 'Seedance has no keyframe parameter');
  assert.equal(plan.midShotKeyframes.supported, true, 'but the timing can still be asked for');
  assert.match(plan.midShotKeyframes.why, /words/i, 'and the user is told it is words, not a control');
});

test('over-filling a slot is rejected with the real limit, and the rest still fly', () => {
  const plan = planFrames(seedance);
  const v = validateFrames(plan, [
    { slot: 'start', url: 'a.png' },
    { slot: 'start', url: 'b.png' }, // one opening frame only
    { slot: 'reference', url: 'r.png' },
  ]);
  assert.equal(v.ok, false);
  assert.deepEqual(v.accepted.map((f) => f.url), ['a.png', 'r.png']);
  assert.match(v.rejected[0].reason, /takes 1 image/);
});

test('a frame the model cannot take is refused by NAME, not dropped', () => {
  const textOnly = { ...seedance, label: 'TextOnly', video: { ...seedance.video!, motion: ['text'], maxReferenceImages: 0 } } as MediaModel;
  const v = validateFrames(planFrames(textOnly), [{ slot: 'start', url: 'a.png' }]);
  assert.equal(v.accepted.length, 0);
  assert.match(v.rejected[0].reason, /TextOnly/);
});

test('frames map onto the request fields the video seam already speaks', () => {
  const req = framesToRequest([
    { slot: 'start', url: 'first.png' },
    { slot: 'end', url: 'last.png' },
    { slot: 'reference', url: 'r1.png' },
    { slot: 'reference', url: 'r2.png' },
  ]);
  assert.equal(req.startFrame, 'first.png');
  assert.equal(req.endFrame, 'last.png');
  assert.deepEqual(req.references, ['r1.png', 'r2.png']);
  // Nothing pinned → nothing sent, rather than empty fields the provider must reject.
  assert.deepEqual(framesToRequest([]), {});
});

// ── FRAMES AT A CHOSEN MOMENT ────────────────────────────────────────────────────────────────────
// Brian: "we should be able to add in-between images too... even at what time within the timed
// duration. Have the end frame being a flame make the ending cut mid flame and not allow a smooth
// flame to end."
//
// He was right, and `midShotKeyframes: { supported: false }` was hardcoded for every model — true
// when written, and a hand-typed claim about what models cannot do. FLUX.3 takes a list of stills
// each pinned to a frame index, so the claim had rotted.

test('a model that takes timed stills says so, natively', async () => {
  const { planFrames } = await import('../shot-frames');
  const { MEDIA_MODELS } = await import('../media-registry');
  const flux = MEDIA_MODELS.find((m) => m.id === 'flux-3-video');
  if (!flux) return; // not registered in this build
  const plan = planFrames(flux);
  assert.equal(plan.midShotKeyframes.supported, true);
  assert.equal(plan.midShotKeyframes.native, true, 'a parameter, not a polite request');
  assert.ok((plan.midShotKeyframes.max ?? 0) > 2, 'more than just an opening and a closing still');
  assert.ok(plan.midShotKeyframes.fps, 'a timestamp needs a frame rate to become an index');
});

test('a model without the parameter offers the TECHNIQUE, not a refusal', async () => {
  const { planFrames } = await import('../shot-frames');
  const { MEDIA_MODELS } = await import('../media-registry');
  const seedance = MEDIA_MODELS.find((m) => m.id === 'seedance-2.5');
  if (!seedance) return;
  const plan = planFrames(seedance);
  assert.equal(plan.midShotKeyframes.native, false, 'it has no keyframe parameter');
  assert.equal(plan.midShotKeyframes.supported, true, 'but mid-shot timing is still ASKABLE');
  assert.match(plan.midShotKeyframes.technique ?? '', /prompt/i);
  assert.match(plan.midShotKeyframes.why, /words/i, 'and the user must be told it is a request');
});

test('FLUX.3 turns seconds into frame indices, in order, without collisions', async () => {
  const { planFalRequest } = await import('../adapters/fal-video');
  const { input, path } = planFalRequest(
    {
      modelId: 'flux-3-video',
      prompt: 'the car at speed',
      durationSec: 6,
      resolution: '1080p',
      startFrame: 'https://x.test/open.png',
      keyframes: [
        { url: 'https://x.test/flame.png', atSec: 2 },
        { url: 'https://x.test/settle.png', atSec: 4 },
      ],
    } as never,
    'blackforestlabs/flux-3',
    'flux3',
  );
  assert.match(path, /keyframes-to-video/);
  const kf = input.keyframes as { image_url: string; frame_index: number }[];
  assert.deepEqual(kf.map((k) => k.frame_index), [0, 48, 96], 'seconds × 24fps, opening frame included');
  assert.equal(input.duration, 6, 'integer seconds — the API rejects anything else');
});

test('the fallback asks for the timing in words, as a clock', async () => {
  const { planFalRequest } = await import('../adapters/fal-video');
  const { input, path } = planFalRequest(
    {
      modelId: 'seedance-2.5',
      prompt: 'the car at speed',
      durationSec: 6,
      keyframes: [{ url: 'https://x.test/flame.png', atSec: 2 }],
    } as never,
    'bytedance/seedance-2.5',
    'seedance',
  );
  assert.match(path, /reference-to-video/, 'the still rides along as a reference');
  assert.match(String(input.prompt), /@Image1 at 0:02/, 'addressed by the handle the model already uses');
  assert.match(String(input.prompt), /do not hold on them/i, 'reach it and move on, not freeze there');
});

// ── MOMENTS ON THE TIMELINE ──────────────────────────────────────────────────────────────────────

test('moments travel to the request in time order, whatever order they were pinned', async () => {
  const { framesToRequest } = await import('../shot-frames');
  const req = framesToRequest([
    { slot: 'key', url: 'b', atSec: 3 },
    { slot: 'start', url: 'open', atSec: 0 },
    { slot: 'key', url: 'a', atSec: 1.5 },
  ]);
  assert.equal(req.startFrame, 'open');
  assert.deepEqual(req.keyframes, [{ url: 'a', atSec: 1.5 }, { url: 'b', atSec: 3 }]);
});

test('a moment after the shot ends is REJECTED with the reason, not quietly sent', async () => {
  const { planFrames, validateFrames } = await import('../shot-frames');
  const { MEDIA_MODELS } = await import('../media-registry');
  const flux = MEDIA_MODELS.find((m) => m.id === 'flux-3-video');
  if (!flux) return;
  // Shortening the shot strands a moment that used to fit; the user must be told it no longer does.
  const v = validateFrames(planFrames(flux), [{ slot: 'key', url: 'late', atSec: 7 }], 5);
  assert.equal(v.accepted.length, 0);
  assert.match(v.rejected[0]!.reason, /after the shot ends/);
});

test('on a model WITHOUT native moments, an opening frame and moments cannot share a shot', async () => {
  const { planFrames, validateFrames } = await import('../shot-frames');
  // Seedance's image-to-video takes no references, and the asked-for route sends moments AS
  // references — dropping them silently would charge for a shot that ignored them.
  const v = validateFrames(
    planFrames(seedance),
    [
      { slot: 'start', url: 'open', atSec: 0 },
      { slot: 'key', url: 'flame', atSec: 2 },
    ],
    6,
  );
  assert.equal(v.accepted.map((f) => f.slot).join(), 'start');
  assert.match(v.rejected[0]!.reason, /FLUX\.3/, 'and points at the model that can do both');
});

test('FLUX.3 takes an opening frame AND moments — the combination the flame shot needs', async () => {
  const { planFrames, validateFrames } = await import('../shot-frames');
  const { MEDIA_MODELS } = await import('../media-registry');
  const flux = MEDIA_MODELS.find((m) => m.id === 'flux-3-video');
  if (!flux) return;
  const v = validateFrames(
    planFrames(flux),
    [
      { slot: 'start', url: 'clean', atSec: 0 },
      { slot: 'key', url: 'flame', atSec: 2 },
      { slot: 'key', url: 'settle', atSec: 3.5 },
    ],
    5,
  );
  assert.equal(v.ok, true, v.rejected.map((r) => r.reason).join('; '));
});
