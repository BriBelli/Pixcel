/**
 * Unit tests for `parseClassifyResult` — the DETECTIVE's verdict validator. The classify call
 * uses a structured-output SCHEMA, so input is clean JSON (no regex, no fence-stripping). These
 * assert the action branches (dispatch / ask / reply) + defaulting.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseClassifyResult } from '../chat-classify';

test('dispatch: carries workflow + generationPrompt', () => {
  const r = parseClassifyResult(
    JSON.stringify({ intent: 'create', action: 'dispatch', workflow: 'image', generationPrompt: 'a photoreal Z28 Camaro on a leafy road' })
  );
  assert.equal(r.intent, 'create');
  assert.equal(r.action, 'dispatch');
  assert.equal(r.workflow, 'image');
  assert.equal(r.generationPrompt, 'a photoreal Z28 Camaro on a leafy road');
});

test('transfer: carries the Epistemic Frame (goal/subject/medium)', () => {
  const r = parseClassifyResult(
    JSON.stringify({ intent: 'create', action: 'transfer', workflow: 'image', frame: { goal: 'photoreal Camaro for a childhood video scene', subject: 'Camaro Z28', medium: 'video' } })
  );
  assert.equal(r.action, 'transfer');
  assert.equal(r.workflow, 'image');
  assert.equal(r.frame?.goal, 'photoreal Camaro for a childhood video scene');
  assert.equal(r.frame?.subject, 'Camaro Z28');
  assert.equal(r.frame?.medium, 'video');
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
