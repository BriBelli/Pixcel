/**
 * Unit tests for the chat-turn classify helpers — focused on `parseClassifyResult`, the tolerant
 * JSON parser that's the riskiest new code, plus `buildA2UI`.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildA2UI, parseClassifyResult, STUB_A2UI } from '../chat-classify';

test('parseClassifyResult: clean valid JSON → correct fields', () => {
  const raw = JSON.stringify({
    intent: 'create',
    showOptions: true,
    optionsTitle: 'How do you want to make your dragon?',
    suggestions: ['Add fire', 'Make it bigger'],
  });
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'create');
  assert.equal(result.showOptions, true);
  assert.equal(result.optionsTitle, 'How do you want to make your dragon?');
  assert.deepEqual(result.suggestions, ['Add fire', 'Make it bigger']);
});

test('parseClassifyResult: JSON wrapped in a ```json fence → parsed', () => {
  const raw = '```json\n' + JSON.stringify({
    intent: 'create',
    showOptions: true,
    optionsTitle: 'How do you want to make your cat?',
    suggestions: ['Fluffy tail'],
  }) + '\n```';
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'create');
  assert.equal(result.showOptions, true);
  assert.equal(result.optionsTitle, 'How do you want to make your cat?');
  assert.deepEqual(result.suggestions, ['Fluffy tail']);
});

test('parseClassifyResult: prose before/after a {...} → isolates + parses', () => {
  const raw =
    'Sure, here is the classification you asked for:\n' +
    JSON.stringify({
      intent: 'chat',
      showOptions: false,
      optionsTitle: 'anything',
      suggestions: ['Tell me more', 'Why?'],
    }) +
    '\nHope that helps!';
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'chat');
  assert.equal(result.showOptions, false);
  assert.deepEqual(result.suggestions, ['Tell me more', 'Why?']);
});

test('parseClassifyResult: unparseable / no-JSON → throws', () => {
  assert.throws(() => parseClassifyResult('there is no json object here at all'));
  assert.throws(() => parseClassifyResult(''));
  // Has braces but is not valid JSON → JSON.parse throws.
  assert.throws(() => parseClassifyResult('prose {not valid json} more prose'));
});

test("parseClassifyResult: intent 'chat' → showOptions forced false (even if true given)", () => {
  const raw = JSON.stringify({
    intent: 'chat',
    showOptions: true,
    optionsTitle: 'x',
    suggestions: [],
  });
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'chat');
  assert.equal(result.showOptions, false, 'non-create intent must not force the picker');
});

test("parseClassifyResult: intent 'other' → showOptions forced false", () => {
  const raw = JSON.stringify({
    intent: 'other',
    showOptions: true,
    optionsTitle: 'x',
    suggestions: [],
  });
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'other');
  assert.equal(result.showOptions, false);
});

test("parseClassifyResult: intent 'create' with showOptions true → options allowed", () => {
  const raw = JSON.stringify({
    intent: 'create',
    showOptions: true,
    optionsTitle: 'Make what?',
    suggestions: [],
  });
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'create');
  assert.equal(result.showOptions, true);
});

test('parseClassifyResult: suggestions >4 / empty / whitespace → clamped to ≤4, trimmed, non-empty', () => {
  const raw = JSON.stringify({
    intent: 'create',
    showOptions: true,
    optionsTitle: 'Make what?',
    suggestions: ['  one  ', '', '   ', 'two', 'three', 'four', 'five', 42, null],
  });
  const result = parseClassifyResult(raw);
  // Empty/whitespace/non-string dropped; trimmed; capped at 4.
  assert.deepEqual(result.suggestions, ['one', 'two', 'three', 'four']);
  assert.ok(result.suggestions.length <= 4);
});

test('parseClassifyResult: non-array suggestions → empty array', () => {
  const raw = JSON.stringify({
    intent: 'chat',
    showOptions: false,
    optionsTitle: 'x',
    suggestions: 'not an array',
  });
  const result = parseClassifyResult(raw);
  assert.deepEqual(result.suggestions, []);
});

test("parseClassifyResult: invalid intent value → coerced to 'other'", () => {
  const raw = JSON.stringify({
    intent: 'banana',
    showOptions: true,
    optionsTitle: 'x',
    suggestions: [],
  });
  const result = parseClassifyResult(raw);
  assert.equal(result.intent, 'other');
  // 'other' also forces showOptions false.
  assert.equal(result.showOptions, false);
});

test('parseClassifyResult: missing/blank optionsTitle → falls back to STUB_A2UI title', () => {
  const raw = JSON.stringify({
    intent: 'create',
    showOptions: true,
    optionsTitle: '   ',
    suggestions: [],
  });
  const result = parseClassifyResult(raw);
  assert.equal(result.optionsTitle, STUB_A2UI.title);
});

test('buildA2UI: returns an options block with the four ids/labels', () => {
  const block = buildA2UI('Some title');
  assert.equal(block.kind, 'options');
  assert.equal(block.title, 'Some title');
  assert.deepEqual(block.options, [
    { id: 'pixcel', label: 'Use Pixcel Studio' },
    { id: 'image', label: 'Use Image Model' },
    { id: 'both', label: 'Both' },
    { id: 'guidance', label: 'More guidance' },
  ]);
  assert.deepEqual(
    block.options.map((o) => o.id),
    ['pixcel', 'image', 'both', 'guidance']
  );
});
