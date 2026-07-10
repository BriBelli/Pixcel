/**
 * Unit tests for `parseClassifyResult` — the Operator's verdict validator. The classify call
 * uses a structured-output SCHEMA, so input is clean JSON (no regex, no fence-stripping). These
 * assert the action branches (ask / propose / transfer / reply) + defaulting. The Operator has NO
 * generative action — `dispatch` was removed; generation lives only in the specialist it transfers to.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseClassifyResult, defaultStagedQuestion } from '../chat-classify';

test('defaultStagedQuestion: the safety net is a well-formed staged ask (label + modes)', () => {
  const q = defaultStagedQuestion();
  assert.ok(q.label.length > 0, 'must carry a real question label');
  assert.ok(q.placeholder && q.placeholder.length > 0, 'must show a worked example');
  assert.deepEqual(q.chips, ['A quick take', 'A guided in-depth render']);
});

test('dispatch is no longer a valid Operator action → defaults to reply', () => {
  // The Operator can never generate; a stray 'dispatch' verdict must fall back to conversation.
  const r = parseClassifyResult(
    JSON.stringify({ intent: 'create', action: 'dispatch', workflow: 'image', generationPrompt: 'a photoreal Z28 Camaro' })
  );
  assert.equal(r.action, 'reply');
});

test('transfer: carries the Epistemic Frame (goal/subject/medium/depth)', () => {
  const r = parseClassifyResult(
    JSON.stringify({ intent: 'create', action: 'transfer', workflow: 'image', frame: { goal: 'photoreal Camaro for a childhood video scene', subject: 'Camaro Z28', medium: 'video', depth: 'guided' } })
  );
  assert.equal(r.action, 'transfer');
  assert.equal(r.workflow, 'image');
  assert.equal(r.frame?.goal, 'photoreal Camaro for a childhood video scene');
  assert.equal(r.frame?.subject, 'Camaro Z28');
  assert.equal(r.frame?.medium, 'video');
  assert.equal(r.frame?.depth, 'guided');
});

test('transfer: a "quick" don\'t-care request carries depth=quick (agent renders, not the Operator)', () => {
  const r = parseClassifyResult(
    JSON.stringify({ intent: 'create', action: 'transfer', workflow: 'image', frame: { goal: 'a few Camaros, any', subject: 'Camaro', medium: 'image', depth: 'quick' } })
  );
  assert.equal(r.action, 'transfer');
  assert.equal(r.frame?.depth, 'quick');
});

test('transfer: an unknown depth is dropped (undefined), never invented', () => {
  const r = parseClassifyResult(
    JSON.stringify({ intent: 'create', action: 'transfer', frame: { goal: 'a Camaro', depth: 'turbo' } })
  );
  assert.equal(r.frame?.depth, undefined);
});

test('transfer with a blank goal → no frame attached', () => {
  const r = parseClassifyResult(JSON.stringify({ intent: 'create', action: 'transfer', frame: { goal: '  ' } }));
  assert.equal(r.action, 'transfer');
  assert.equal(r.frame, undefined);
});

test('ask: carries the A2UI question (label + placeholder + chips)', () => {
  const r = parseClassifyResult(
    JSON.stringify({ intent: 'create', action: 'ask', question: { label: 'What kind of car?', placeholder: 'e.g. sleek sports car', chips: ['Sports car', 'Pickup', 'Cartoon'] } })
  );
  assert.equal(r.action, 'ask');
  assert.equal(r.question?.label, 'What kind of car?');
  assert.equal(r.question?.placeholder, 'e.g. sleek sports car');
  assert.deepEqual(r.question?.chips, ['Sports car', 'Pickup', 'Cartoon']);
});

test('reply: carries suggestions, clamped to ≤4 non-empty', () => {
  const r = parseClassifyResult(
    JSON.stringify({ intent: 'chat', action: 'reply', suggestions: ['  a  ', '', 'b', 'c', 'd', 'e'] })
  );
  assert.equal(r.action, 'reply');
  assert.deepEqual(r.suggestions, ['a', 'b', 'c', 'd']);
});

test('invalid action → reply; invalid intent → other', () => {
  const r = parseClassifyResult(JSON.stringify({ intent: 'banana', action: 'nope', suggestions: [] }));
  assert.equal(r.intent, 'other');
  assert.equal(r.action, 'reply');
});

test('ask with a blank label → no question attached', () => {
  const r = parseClassifyResult(JSON.stringify({ intent: 'create', action: 'ask', question: { label: '   ' } }));
  assert.equal(r.action, 'ask');
  assert.equal(r.question, undefined);
});

test('non-JSON → throws (caller falls back to stubs)', () => {
  assert.throws(() => parseClassifyResult('not json at all'));
  assert.throws(() => parseClassifyResult(''));
});
