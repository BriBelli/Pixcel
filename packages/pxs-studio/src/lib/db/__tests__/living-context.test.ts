/**
 * Living context: memory-first append, markEdited (child w/ parent), markDeleted cascade.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRepository } from '../adapters/memory';
import { createLivingContext } from '../living-context';
import type { Interaction, Thread } from '../models';

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

function interaction(id: string, created_at: number): Interaction {
  return {
    id,
    user_id: 'dev-user',
    category: 'interaction',
    status: 'active',
    created_at,
    updated_at: created_at,
    thread_id: 't1',
    model: 'm',
    prompt: { text: `p-${id}` },
    response: { text: '', tokens_used: 0, a2ui: null, a2ui_version: 'a2ui-v1' },
  };
}

test('append is memory-first: present in memory before flush resolves', async () => {
  const repo = createMemoryRepository();
  await seedThread(repo);
  const ctx = createLivingContext(repo);

  const { flushed } = ctx.append(interaction('i1', 100));
  // Memory-first: present in memory SYNCHRONOUSLY (the caller path never awaits the DB write).
  assert.equal(ctx.peek('t1').length, 1);
  assert.equal(ctx.peek('t1')[0].id, 'i1');
  // The DB write is fired async; awaiting `flushed` confirms it lands.
  await flushed;
  assert.ok(await repo.get('interaction', 'i1'), 'flushed to DB');
});

test('hydrate loads only active interactions, paginated', async () => {
  const repo = createMemoryRepository();
  await seedThread(repo);
  for (let i = 0; i < 4; i++) await repo.put(interaction(`i${i}`, 100 + i));
  await repo.put({ ...interaction('arch', 500), status: 'inactive' });

  const ctx = createLivingContext(repo);
  const items = await ctx.hydrate('dev-user', 't1', { limit: 2, offset: 1 });
  assert.deepEqual(
    items.map((i) => i.id),
    ['i1', 'i2']
  );
  assert.ok(items.every((i) => i.status === 'active'));
});

test('markEdited: target → edited, child inserted with parent_interaction_id, downstream inactive', async () => {
  const repo = createMemoryRepository();
  await seedThread(repo);
  await ctxAppendAll(repo, ['i1:100', 'i2:200', 'i3:300']);

  const ctx = createLivingContext(repo);
  await ctx.hydrate('dev-user', 't1');

  const replacement = interaction('i1b', 150);
  const { flushed } = ctx.markEdited('dev-user', 't1', 'i1', replacement);
  await flushed;

  assert.equal(((await repo.get('interaction', 'i1')) as Interaction).status, 'edited');
  const child = (await repo.get('interaction', 'i1b')) as Interaction;
  assert.equal(child.parent_interaction_id, 'i1');
  // Downstream active turns deactivated (inactive).
  assert.equal(((await repo.get('interaction', 'i2')) as Interaction).status, 'inactive');
  assert.equal(((await repo.get('interaction', 'i3')) as Interaction).status, 'inactive');

  // Memory reflects the swap: edited/inactive gone, child present.
  const ids = ctx.peek('t1').map((i) => i.id);
  assert.ok(!ids.includes('i1'));
  assert.ok(ids.includes('i1b'));
});

test('markDeleted cascades downstream to inactive', async () => {
  const repo = createMemoryRepository();
  await seedThread(repo);
  await ctxAppendAll(repo, ['i1:100', 'i2:200', 'i3:300']);

  const ctx = createLivingContext(repo);
  await ctx.hydrate('dev-user', 't1');

  const { flushed } = ctx.markDeleted('dev-user', 't1', 'i2');
  await flushed;

  assert.equal(((await repo.get('interaction', 'i1')) as Interaction).status, 'active');
  assert.equal(((await repo.get('interaction', 'i2')) as Interaction).status, 'deleted');
  assert.equal(((await repo.get('interaction', 'i3')) as Interaction).status, 'inactive');
});

/** Helper: put several `id:created_at` interactions directly. */
async function ctxAppendAll(
  repo: ReturnType<typeof createMemoryRepository>,
  specs: string[]
) {
  for (const spec of specs) {
    const [id, ts] = spec.split(':');
    await repo.put(interaction(id, Number(ts)));
  }
}
