/**
 * Unit tests for the honest prompt score (prompt-score.ts). Pure heuristic → deterministic.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { scoreBuilder, scorePart, bandOf } from '../prompt-score';

test('scorePart: empty is thin, rich is strong, anchors help', () => {
  assert.equal(scorePart('', []).band, 'thin');
  assert.equal(scorePart('a photoreal 1969 Camaro SS with brushed metal trim and chrome', []).band, 'strong');
  // a short value lifted by anchors
  const withAnchors = scorePart('a Camaro', ['candy-red gloss', 'chrome trim', 'matte black']);
  assert.ok(withAnchors.raw > scorePart('a Camaro', []).raw);
});

test('bandOf: thresholds', () => {
  assert.equal(bandOf(0), 'thin');
  assert.equal(bandOf(0.5), 'good');
  assert.equal(bandOf(0.9), 'strong');
});

test('scoreBuilder: weighted — a filled heavy part outscores a filled light part', () => {
  const rich = 'a photoreal chrome-trimmed muscle car on a wet street';
  const heavy = scoreBuilder([
    { id: 'subject', weight: 3, value: rich, anchors: [] },
    { id: 'style', weight: 1, value: '', anchors: [] },
  ]);
  const light = scoreBuilder([
    { id: 'subject', weight: 1, value: '', anchors: [] },
    { id: 'style', weight: 3, value: '', anchors: [] },
  ]);
  assert.ok(heavy.overall > light.overall, 'heavier filled part should move the score more');
  assert.equal(heavy.total, 2);
});

test('scoreBuilder: all-empty → 0 / thin; all-rich → high / strong', () => {
  const empty = scoreBuilder([{ id: 'a', weight: 1, value: '', anchors: [] }]);
  assert.equal(empty.overall, 0);
  assert.equal(empty.overallBand, 'thin');
  assert.equal(empty.filled, 0);

  const rich = scoreBuilder([
    { id: 'a', weight: 1, value: 'a very detailed and specific descriptive subject line here', anchors: ['x', 'y'] },
  ]);
  assert.ok(rich.overall >= 75);
  assert.equal(rich.overallBand, 'strong');
  assert.equal(rich.filled, 1);
});
