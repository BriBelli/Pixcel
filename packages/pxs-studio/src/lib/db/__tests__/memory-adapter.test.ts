/**
 * Memory adapter: put/get/update round-trips + pagination over active records (MOD 2).
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRepository } from '../adapters/memory';
import type { Interaction, Thread } from '../models';

function thread(id: string, over: Partial<Thread> = {}): Thread {
  const now = Date.now();
  return {
    id,
    user_id: 'dev-user',
    category: 'thread',
    status: 'active',
    created_at: now,
    updated_at: now,
    title: `thread ${id}`,
    ...over,
  };
}

function interaction(id: string, created_at: number, over: Partial<Interaction> = {}): Interaction {
  return {
    id,
    user_id: 'dev-user',
    category: 'interaction',
    status: 'active',
    created_at,
    updated_at: created_at,
    thread_id: 't1',
    model: 'claude-opus-4-8',
    prompt: { text: 'hi' },
    response: { text: '', tokens_used: 0, a2ui: null, a2ui_version: 'a2ui-v1' },
    ...over,
  };
}

test('put/get round-trip returns a deep clone (no reference sharing)', async () => {
  const repo = createMemoryRepository();
  const t = thread('t1');
  await repo.put(t);
  const got = (await repo.get('thread', 't1')) as Thread;
  assert.equal(got.id, 't1');
  assert.equal(got.title, 'thread t1');
  // Mutating the returned copy must not affect the store.
  got.title = 'MUTATED';
  const again = (await repo.get('thread', 't1')) as Thread;
  assert.equal(again.title, 'thread t1');
});

test('get returns null for a missing record', async () => {
  const repo = createMemoryRepository();
  assert.equal(await repo.get('thread', 'nope'), null);
});

test('update shallow-merges the patch and bumps updated_at', async () => {
  const repo = createMemoryRepository();
  const t = thread('t1', { created_at: 1000, updated_at: 1000 });
  await repo.put(t);
  const updated = (await repo.update('thread', 't1', { title: 'renamed' } as Partial<Thread>)) as Thread;
  assert.equal(updated.title, 'renamed');
  assert.equal(updated.status, 'active'); // untouched field preserved (shallow merge)
  assert.ok(updated.updated_at > 1000, 'updated_at bumped');
  assert.equal(updated.created_at, 1000, 'created_at preserved');
});

test('update returns null when the record does not exist', async () => {
  const repo = createMemoryRepository();
  assert.equal(await repo.update('thread', 'missing', { title: 'x' } as Partial<Thread>), null);
});

test('pagination over active records: total excludes archived, slice is correct (MOD 2)', async () => {
  const repo = createMemoryRepository();
  // 5 active + 2 archived interactions in thread t1.
  for (let i = 0; i < 5; i++) await repo.put(interaction(`a${i}`, 100 + i));
  await repo.put(interaction('x0', 50, { status: 'archived' }));
  await repo.put(interaction('x1', 999, { status: 'archived' }));

  const page = await repo.query({
    category: 'interaction',
    user_id: 'dev-user',
    filter: { thread_id: 't1', status: 'active' },
    limit: 2,
    offset: 2,
  });

  assert.equal(page.total, 5, 'total counts active rows only, before pagination');
  assert.equal(page.items.length, 2, 'limit honored');
  // Sorted asc by created_at: a0..a4 → offset 2 → a2, a3.
  assert.deepEqual(
    page.items.map((i) => i.id),
    ['a2', 'a3']
  );
  // No archived row leaked into the page.
  assert.ok(page.items.every((i) => i.status === 'active'));
});

test('query sort desc reverses order', async () => {
  const repo = createMemoryRepository();
  await repo.put(interaction('a0', 100));
  await repo.put(interaction('a1', 200));
  const page = await repo.query({
    category: 'interaction',
    user_id: 'dev-user',
    filter: { thread_id: 't1' },
    sort: 'desc',
  });
  assert.deepEqual(
    page.items.map((i) => i.id),
    ['a1', 'a0']
  );
});
