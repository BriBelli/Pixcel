/**
 * Unit tests for the stale-while-revalidate freshness policy. Pure + deterministic — `now` is
 * injected, so no clock flake. Run: `tsx --test src/lib/engine/__tests__/staleness.test.ts`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeFreshness, isDueForRefresh, DEFAULT_TTL_HOURS } from '../staleness';

const HOUR = 3_600_000;
/** A fixed "now" so ages are exact. */
const NOW = Date.parse('2026-07-17T00:00:00Z');
const iso = (hoursAgo: number) => new Date(NOW - hoursAgo * HOUR).toISOString();

test('fresh: within the TTL → assert plainly, no refresh', () => {
  const v = judgeFreshness(iso(1), NOW);
  assert.equal(v.freshness, 'fresh');
  assert.equal(v.shouldRefresh, false);
  assert.ok(v.ageHours !== null && v.ageHours < DEFAULT_TTL_HOURS);
});

test('aging: past TTL but under 2×TTL → still served, but refresh queued', () => {
  const v = judgeFreshness(iso(DEFAULT_TTL_HOURS + 1), NOW);
  assert.equal(v.freshness, 'aging');
  assert.equal(v.shouldRefresh, true);
});

test('stale: at/over 2×TTL → stale + refresh', () => {
  const v = judgeFreshness(iso(DEFAULT_TTL_HOURS * 2 + 5), NOW);
  assert.equal(v.freshness, 'stale');
  assert.equal(v.shouldRefresh, true);
});

test('unknown: no stamp → unverified, refresh, null age', () => {
  const v = judgeFreshness(undefined, NOW);
  assert.equal(v.freshness, 'unknown');
  assert.equal(v.ageHours, null);
  assert.equal(v.shouldRefresh, true);
  assert.match(v.asOf, /unverified/);
});

test('unparseable stamp is treated as unknown, not a crash', () => {
  const v = judgeFreshness('not-a-date', NOW);
  assert.equal(v.freshness, 'unknown');
});

test('custom TTL is honored', () => {
  // 12h old with a 6h TTL → past 2×TTL → stale.
  const v = judgeFreshness(iso(12), NOW, 6);
  assert.equal(v.freshness, 'stale');
});

test('asOf carries the stamp date for graceful "as of" phrasing', () => {
  const v = judgeFreshness('2026-07-10', NOW);
  assert.match(v.asOf, /as of 2026-07-10/);
});

test('isDueForRefresh mirrors the verdict', () => {
  assert.equal(isDueForRefresh(iso(1), NOW), false);
  assert.equal(isDueForRefresh(iso(DEFAULT_TTL_HOURS * 3), NOW), true);
  assert.equal(isDueForRefresh(null, NOW), true);
});
