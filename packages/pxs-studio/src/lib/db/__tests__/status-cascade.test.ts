/**
 * Status guard (MOD 1) + the edit/delete cascade.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRepository } from '../adapters/memory';
import type { Interaction, Thread } from '../models';
import { cascadeDeactivateDownstream, transitionStatus } from '../status';

async function seedThread(repo: ReturnType<typeof createMemoryRepository>) {
  const now = Date.now();
  const t: Thread = {
    id: 't1',
    user_id: 'dev-user',
    category: 'thread',
    status: 'active',
    created_at: now,
    updated_at: now,
    title: 'seed',
  };
  await repo.put(t);
}

function interaction(id: string, created_at: number, status: Interaction['status'] = 'active'): Interaction {
  return {
    id,
    user_id: 'dev-user',
    category: 'interaction',
    status,
    created_at,
    updated_at: created_at,
    thread_id: 't1',
    model: 'm',
    prompt: { text: 'p' },
    response: { text: '', tokens_used: 0, a2ui: null, a2ui_version: 'a2ui-v1' },
  };
}

test('transitionStatus flips an active record', async () => {
  const repo = createMemoryRepository();
  await repo.put(interaction('i1', 100));
  const result = (await transitionStatus(repo, 'interaction', 'i1', 'inactive')) as Interaction;
  assert.equal(result.status, 'inactive');
});

test('MOD 1: transitioning a non-active record is a no-op (no write, unchanged)', async () => {
  const repo = createMemoryRepository();
  await repo.put(interaction('i1', 100, 'inactive'));
  const before = (await repo.get('interaction', 'i1')) as Interaction;
  const result = (await transitionStatus(repo, 'interaction', 'i1', 'deleted')) as Interaction;
  // Returned unchanged.
  assert.equal(result.status, 'inactive');
  // No write happened → updated_at identical to the pre-existing audit row.
  const after = (await repo.get('interaction', 'i1')) as Interaction;
  assert.equal(after.status, 'inactive');
  assert.equal(after.updated_at, before.updated_at, 'updated_at unchanged (no write)');
});

test('transitionStatus returns null for a missing record', async () => {
  const repo = createMemoryRepository();
  assert.equal(await transitionStatus(repo, 'interaction', 'ghost', 'inactive'), null);
});

test('cascade: downstream active turns deactivate; a pre-inactive downstream stays untouched', async () => {
  const repo = createMemoryRepository();
  await seedThread(repo);
  await repo.put(interaction('i1', 100)); // the edited turn (caller flips it separately)
  await repo.put(interaction('i2', 200)); // downstream active
  await repo.put(interaction('i3', 300, 'inactive')); // downstream already inactive
  await repo.put(interaction('i4', 400)); // downstream active

  const before3 = (await repo.get('interaction', 'i3')) as Interaction;

  // Cascade deactivates everything at-or-after i2's timestamp that's still active.
  const count = await cascadeDeactivateDownstream(repo, 't1', 200);
  assert.equal(count, 2, 'i2 + i4 deactivated (i3 skipped by the guard)');

  assert.equal(((await repo.get('interaction', 'i2')) as Interaction).status, 'inactive');
  assert.equal(((await repo.get('interaction', 'i4')) as Interaction).status, 'inactive');

  // i3 was already inactive → untouched (updated_at identical).
  const after3 = (await repo.get('interaction', 'i3')) as Interaction;
  assert.equal(after3.status, 'inactive');
  assert.equal(after3.updated_at, before3.updated_at, 'pre-inactive row untouched');

  // i1 was upstream of `from_created_at` → still active.
  assert.equal(((await repo.get('interaction', 'i1')) as Interaction).status, 'active');
});
