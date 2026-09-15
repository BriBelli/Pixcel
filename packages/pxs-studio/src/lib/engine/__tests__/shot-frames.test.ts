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

test('MID-SHOT KEYFRAMES ARE NOT SUPPORTED — stated, with the technique when one exists', () => {
  // The headline capability people expect from demos. No wired model takes a frame at an arbitrary
  // time, and implying otherwise would be a control the engine cannot honour.
  const plan = planFrames(seedance);
  assert.equal(plan.midShotKeyframes.supported, false);
  assert.match(plan.midShotKeyframes.why, /arbitrary time/i);
  // Interpolating models can approximate it by chaining — a workflow, not a parameter.
  assert.match(plan.midShotKeyframes.technique!, /chain/i);
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
