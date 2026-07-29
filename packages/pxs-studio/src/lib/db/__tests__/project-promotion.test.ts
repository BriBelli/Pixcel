/**
 * Project auto-promotion — draft→saved on first asset (OBJECT-MODEL-HANDOFF §4).
 * Acceptance: a project with an asset is Saved (no expiry); one with none stays ephemeral with an expiry.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRepository } from '../adapters/memory';
import { draftBirthFields, promoteThreadForAsset, EPHEMERAL_TTL_MS } from '../project-promotion';
import type { Thread } from '../models';

function draftThread(id: string, now: number): Thread {
  return {
    id,
    user_id: 'dev-user',
    category: 'thread',
    status: 'active',
    created_at: now,
    updated_at: now,
    title: `thread ${id}`,
    ...draftBirthFields(now),
  };
}

test('a new project is born ephemeral with a 14-day expiry, unpromoted', () => {
  const now = 1_000_000;
  const t = draftThread('t1', now);
  assert.equal(t.retention, 'ephemeral');
  assert.equal(t.expires_at, now + EPHEMERAL_TTL_MS);
  assert.equal(t.promoted_at, undefined);
});

test('first asset promotes ephemeral → saved, stamps promoted_at, clears expiry', async () => {
  const repo = createMemoryRepository();
  const now = 2_000_000;
  await repo.put(draftThread('t2', now));
  await promoteThreadForAsset(repo, 't2', now + 5);
  const t = (await repo.get('thread', 't2')) as Thread;
  assert.equal(t.retention, 'saved');
  assert.equal(t.promoted_at, now + 5);
  assert.equal(t.expires_at, undefined);
});

test('a project with zero assets stays ephemeral and carries an expiry', async () => {
  const repo = createMemoryRepository();
  const now = 3_000_000;
  await repo.put(draftThread('t3', now));
  const t = (await repo.get('thread', 't3')) as Thread;
  assert.equal(t.retention, 'ephemeral');
  assert.ok(t.expires_at && t.expires_at > now);
});

test('promotion is idempotent — a saved project keeps its first stamp', async () => {
  const repo = createMemoryRepository();
  const now = 4_000_000;
  await repo.put(draftThread('t4', now));
  await promoteThreadForAsset(repo, 't4', now + 5);
  await promoteThreadForAsset(repo, 't4', now + 999);
  const t = (await repo.get('thread', 't4')) as Thread;
  assert.equal(t.promoted_at, now + 5);
});

test('promotion is safe on a missing thread or undefined id', async () => {
  const repo = createMemoryRepository();
  await promoteThreadForAsset(repo, 'does-not-exist', 5_000_000);
  await promoteThreadForAsset(repo, undefined, 5_000_000);
  assert.ok(true);
});
