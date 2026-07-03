/**
 * SQLite adapter: put/get/update round-trips + query filter/pagination/total + status filter.
 *
 * Mirrors memory-adapter.test.ts but against the SQLite adapter over an in-memory DB
 * (`:memory:`), so it needs no temp files. Requires Node 24 (`node:sqlite`).
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createSqliteRepository } from '../adapters/sqlite';
import type { Interaction, Thread } from '../models';

function repo() {
  // Fresh ephemeral DB per test — no cross-test leakage, no files.
  return createSqliteRepository(':memory:');
}

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
  const r = repo();
  await r.put(thread('t1'));
  const got = (await r.get('thread', 't1')) as Thread;
  assert.equal(got.id, 't1');
  assert.equal(got.title, 'thread t1');
  // Reads deserialize fresh JSON each time, so mutating a copy can't touch the store.
  got.title = 'MUTATED';
  const again = (await r.get('thread', 't1')) as Thread;
  assert.equal(again.title, 'thread t1');
});

test('get returns null for a missing record', async () => {
  const r = repo();
  assert.equal(await r.get('thread', 'nope'), null);
});

test('update shallow-merges the patch and bumps updated_at', async () => {
  const r = repo();
  await r.put(thread('t1', { created_at: 1000, updated_at: 1000 }));
  const updated = (await r.update('thread', 't1', { title: 'renamed' } as Partial<Thread>)) as Thread;
  assert.equal(updated.title, 'renamed');
  assert.equal(updated.status, 'active'); // untouched field preserved (shallow merge)
  assert.ok(updated.updated_at > 1000, 'updated_at bumped');
  assert.equal(updated.created_at, 1000, 'created_at preserved');
});

test('update returns null when the record does not exist', async () => {
  const r = repo();
  assert.equal(await r.update('thread', 'missing', { title: 'x' } as Partial<Thread>), null);
});

test('pagination + total: total excludes archived, slice is correct', async () => {
  const r = repo();
  for (let i = 0; i < 5; i++) await r.put(interaction(`a${i}`, 100 + i));
  await r.put(interaction('x0', 50, { status: 'archived' }));
  await r.put(interaction('x1', 999, { status: 'archived' }));

  const page = await r.query({
    category: 'interaction',
    user_id: 'dev-user',
    filter: { thread_id: 't1', status: 'active' },
    limit: 2,
    offset: 2,
  });

  assert.equal(page.total, 5, 'total counts active rows only, before pagination');
  assert.equal(page.items.length, 2, 'limit honored');
  assert.deepEqual(
    page.items.map((i) => i.id),
    ['a2', 'a3']
  );
  assert.ok(page.items.every((i) => i.status === 'active'));
});

test('query status filter narrows results', async () => {
  const r = repo();
  for (let i = 0; i < 3; i++) await r.put(interaction(`a${i}`, 100 + i));
  await r.put(interaction('z0', 200, { status: 'archived' }));

  const active = await r.query({
    category: 'interaction',
    user_id: 'dev-user',
    filter: { status: 'active' },
  });
  assert.equal(active.total, 3);
  assert.ok(active.items.every((i) => i.status === 'active'));

  const archived = await r.query({
    category: 'interaction',
    user_id: 'dev-user',
    filter: { status: 'archived' },
  });
  assert.equal(archived.total, 1);
  assert.deepEqual(
    archived.items.map((i) => i.id),
    ['z0']
  );
});

test('query sort desc reverses order', async () => {
  const r = repo();
  await r.put(interaction('a0', 100));
  await r.put(interaction('a1', 200));
  const page = await r.query({
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

test('query with offset and no limit returns the tail from offset', async () => {
  const r = repo();
  for (let i = 0; i < 4; i++) await r.put(interaction(`a${i}`, 100 + i));
  const page = await r.query({
    category: 'interaction',
    user_id: 'dev-user',
    offset: 2,
  });
  assert.equal(page.total, 4);
  assert.deepEqual(
    page.items.map((i) => i.id),
    ['a2', 'a3']
  );
});
