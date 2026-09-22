/**
 * Content policy — what a MODEL will make, as a researched fact with levels.
 *
 * Brian's correction, and it is the right one: "uncensored" is not a property of Replicate. Replicate
 * and fal are universal hosts serving permissive and heavily-filtered models side by side, so the
 * ceiling belongs to the MODEL, differs by KIND (a model may allow graphic violence and refuse
 * nudity), and is a LEVEL rather than a switch. Like every other model fact, it is researched from
 * the provider's own policy with provenance — never hand-typed, because hand-typed opinion is wrong
 * the moment a provider updates its terms and does not know it.
 *
 * Pure; no network, no spend.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  levelRank,
  normalizeAxis,
  normalizeLevel,
  normalizeContentPolicy,
  policyReason,
  servesDemand,
  UNKNOWN_POLICY,
  type ContentPolicy,
} from '../content-policy';

const permissive: ContentPolicy = {
  limits: { nudity: 'explicit', sexual: 'moderate', violence: 'explicit', gore: 'explicit' },
  basis: 'documented',
  sourceUrl: 'https://example.test/policy',
};
const filtered: ContentPolicy = {
  limits: { nudity: 'blocked', sexual: 'blocked', violence: 'mild', gore: 'blocked' },
  basis: 'documented',
};

test('levels are ORDERED, so routing is a comparison not a lookup', () => {
  assert.ok(levelRank('blocked') < levelRank('mild'));
  assert.ok(levelRank('mild') < levelRank('moderate'));
  assert.ok(levelRank('moderate') < levelRank('explicit'));
});

test('a model whose ceiling clears the brief serves it', () => {
  const v = servesDemand(permissive, { nudity: 'moderate', violence: 'explicit' });
  assert.equal(v.ok, true);
  assert.deepEqual(v.blocked, []);
  assert.deepEqual(v.unknown, []);
});

test('a model below the brief is benched, naming the axis and its real ceiling', () => {
  const v = servesDemand(filtered, { nudity: 'explicit' });
  assert.equal(v.ok, false);
  assert.deepEqual(v.blocked, [{ axis: 'nudity', ceiling: 'blocked' }]);
  const why = policyReason('Ideogram 3.0', v);
  assert.match(why!, /Ideogram 3\.0/);
  assert.match(why!, /nudity/, 'the user must be told WHICH axis, or they cannot act on it');
});

test('axes are judged INDEPENDENTLY — graphic violence yes, nudity no', () => {
  const mixed: ContentPolicy = { limits: { violence: 'explicit', gore: 'explicit', nudity: 'blocked' }, basis: 'documented' };
  assert.equal(servesDemand(mixed, { violence: 'explicit' }).ok, true, 'a war scene routes here');
  assert.equal(servesDemand(mixed, { nudity: 'moderate' }).ok, false, 'a nude does not');
});

// ── THE SAFE DEFAULT ─────────────────────────────────────────────────────────────────────────────
// The whole point of separating "unknown" from "blocked": routing a mature brief at a model whose
// policy nobody has read buys a refusal the user pays for.

test('an UNRESEARCHED model is not permission — it is benched as unverified', () => {
  const v = servesDemand(UNKNOWN_POLICY, { nudity: 'explicit' });
  assert.equal(v.ok, false, 'unknown must never route a mature brief');
  assert.deepEqual(v.unknown, ['nudity']);
  assert.deepEqual(v.blocked, [], 'and it is NOT reported as a refusal — we simply have not checked');
  assert.match(policyReason('Some Model', v)!, /hasn't been verified/);
});

test('an unresearched model still serves an ordinary brief', () => {
  assert.equal(servesDemand(UNKNOWN_POLICY, {}).ok, true, 'no mature demand → no gate');
  assert.equal(
    servesDemand(UNKNOWN_POLICY, { nudity: 'blocked' }).ok,
    true,
    'a brief needing nothing on an axis does not test that axis',
  );
});

// ── ENUM-LOCKED INGESTION ────────────────────────────────────────────────────────────────────────
// Providers use their own words. We translate onto OUR nouns and DROP what does not map, exactly as
// the task vocabulary does — a coined axis would be a fact nothing can route on.

test("provider phrasing is translated onto our vocabulary", () => {
  assert.equal(normalizeLevel('uncensored'), 'explicit');
  assert.equal(normalizeLevel('suggestive'), 'mild');
  assert.equal(normalizeLevel('prohibited'), 'blocked');
  assert.equal(normalizeAxis('NSFW'), 'sexual');
  assert.equal(normalizeAxis('blood'), 'gore');
  assert.equal(normalizeAxis('public figure'), 'likeness');
});

test('unmapped axes and levels are DROPPED, never coined', () => {
  assert.equal(normalizeAxis('vibes'), undefined);
  assert.equal(normalizeLevel('spicy'), undefined);
  const p = normalizeContentPolicy({ limits: { vibes: 'spicy', nudity: 'explicit' }, basis: 'documented' });
  assert.deepEqual(p!.limits, { nudity: 'explicit' }, 'the recognizable axis survives alone');
});

test('a policy with nothing recognizable is undefined, not an empty ceiling set', () => {
  assert.equal(normalizeContentPolicy({ limits: { vibes: 'spicy' } }), undefined);
  assert.equal(normalizeContentPolicy(null), undefined);
  assert.equal(normalizeContentPolicy('explicit'), undefined);
});

test('research must say HOW it knows — documented beats observed', () => {
  const doc = normalizeContentPolicy({ limits: { nudity: 'explicit' }, basis: 'documented', sourceUrl: 'https://x.test' });
  assert.equal(doc!.basis, 'documented');
  assert.equal(doc!.sourceUrl, 'https://x.test', 'the receipt travels with the claim');
  // An unstated basis is the weaker one — never silently upgraded to "documented".
  assert.equal(normalizeContentPolicy({ limits: { nudity: 'explicit' } })!.basis, 'observed');
});
