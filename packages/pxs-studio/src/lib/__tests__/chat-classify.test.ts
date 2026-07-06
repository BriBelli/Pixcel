/**
 * Unit tests for the chat-turn classify helper — `parseClassifyResult`, the tolerant JSON parser
 * that turns the classify model's output into `{ intent, suggestions }`. There is NO tool/medium
 * picker anymore — the agent chooses the medium itself; the classify only yields intent + quick-picks.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseClassifyResult } from '../chat-classify';

test('parseClassifyResult: clean valid JSON → intent + suggestions', () => {
  const raw = JSON.stringify({
    intent: 'create',
    suggestions: ['Sleek sports car', 'Boxy retro'],
  });
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'create');
  assert.deepEqual(result.suggestions, ['Sleek sports car', 'Boxy retro']);
});

test('parseClassifyResult: JSON wrapped in a ```json fence → parsed', () => {
  const raw = '```json\n' + JSON.stringify({ intent: 'create', suggestions: ['Fluffy tail'] }) + '\n```';
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'create');
  assert.deepEqual(result.suggestions, ['Fluffy tail']);
});

test('parseClassifyResult: prose before/after a {...} → isolates + parses', () => {
  const raw =
    'Sure, here is the classification you asked for:\n' +
    JSON.stringify({ intent: 'chat', suggestions: ['Tell me more', 'Why?'] }) +
    '\nHope that helps!';
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'chat');
  assert.deepEqual(result.suggestions, ['Tell me more', 'Why?']);
});

test('parseClassifyResult: unparseable / no-JSON → throws', () => {
  assert.throws(() => parseClassifyResult('there is no json object here at all'));
  assert.throws(() => parseClassifyResult(''));
  // Has braces but is not valid JSON → JSON.parse throws.
  assert.throws(() => parseClassifyResult('prose {not valid json} more prose'));
});

test('parseClassifyResult: suggestions >4 / empty / whitespace → clamped to ≤4, trimmed, non-empty', () => {
  const raw = JSON.stringify({
    intent: 'create',
    suggestions: ['  one  ', '', '   ', 'two', 'three', 'four', 'five', 42, null],
  });
  const result = parseClassifyResult(raw);
  // Empty/whitespace/non-string dropped; trimmed; capped at 4.
  assert.deepEqual(result.suggestions, ['one', 'two', 'three', 'four']);
  assert.ok(result.suggestions.length <= 4);
});

test('parseClassifyResult: non-array suggestions → empty array', () => {
  const raw = JSON.stringify({ intent: 'chat', suggestions: 'not an array' });
  const result = parseClassifyResult(raw);
  assert.deepEqual(result.suggestions, []);
});

test("parseClassifyResult: invalid intent value → coerced to 'other'", () => {
  const raw = JSON.stringify({ intent: 'banana', suggestions: [] });
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'other');
});

test('parseClassifyResult: valid intents pass through', () => {
  assert.equal(parseClassifyResult('{"intent":"create","suggestions":[]}').intent, 'create');
  assert.equal(parseClassifyResult('{"intent":"chat","suggestions":[]}').intent, 'chat');
  assert.equal(parseClassifyResult('{"intent":"other","suggestions":[]}').intent, 'other');
});
