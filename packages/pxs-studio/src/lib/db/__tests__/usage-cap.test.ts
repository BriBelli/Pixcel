/**
 * Usage metering + the hard-cap gate.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRepository } from '../adapters/memory';
import type { UserRecord } from '../models';
import { checkCap, costUsd, DEFAULT_HARD_CAP_USD, recordUsage } from '../usage';

test('costUsd uses Opus 4.8 pricing ($5/1M in, $25/1M out)', () => {
  assert.equal(costUsd(1_000_000, 0), 5);
  assert.equal(costUsd(0, 1_000_000), 25);
  assert.equal(costUsd(1_000_000, 1_000_000), 30);
});

test('recordUsage writes a Usage row and increments the user running totals', async () => {
  const repo = createMemoryRepository();
  const usage = await recordUsage(repo, {
    user_id: 'dev-user',
    interaction_id: 'i1',
    input_tokens: 1000,
    output_tokens: 2000,
  });
  assert.equal(usage.category, 'usage');
  assert.equal(usage.interaction_id, 'i1');
  assert.equal(usage.cost_usd, costUsd(1000, 2000));

  const user = (await repo.get('user', 'dev-user')) as UserRecord;
  assert.equal(user.running_input_tokens, 1000);
  assert.equal(user.running_output_tokens, 2000);
  assert.equal(user.running_cost_usd, costUsd(1000, 2000));
  assert.equal(user.hard_cap_usd, DEFAULT_HARD_CAP_USD);
});

test('recordUsage accumulates across calls', async () => {
  const repo = createMemoryRepository();
  await recordUsage(repo, { user_id: 'u', interaction_id: 'a', input_tokens: 100, output_tokens: 100 });
  await recordUsage(repo, { user_id: 'u', interaction_id: 'b', input_tokens: 100, output_tokens: 100 });
  const user = (await repo.get('user', 'u')) as UserRecord;
  assert.equal(user.running_input_tokens, 200);
  assert.equal(user.running_output_tokens, 200);
});

test('checkCap flips allowed=false once running spend reaches the cap', async () => {
  const repo = createMemoryRepository();
  // Unknown user → allowed, spent 0.
  const fresh = await checkCap(repo, 'u');
  assert.equal(fresh.allowed, true);
  assert.equal(fresh.spent_usd, 0);
  assert.equal(fresh.cap_usd, DEFAULT_HARD_CAP_USD);

  // Burn tokens to hit exactly the $5 cap: output at $25/1M → 200_000 tokens = $5.
  await recordUsage(repo, { user_id: 'u', interaction_id: 'i', input_tokens: 0, output_tokens: 200_000 });
  const capped = await checkCap(repo, 'u');
  assert.equal(capped.spent_usd, 5);
  assert.equal(capped.allowed, false, 'spent >= cap → blocked');
  assert.equal(capped.remaining_usd, 0);
});
