/**
 * Video assets — the hole that made every rendered clip disposable.
 *
 * The video route metered spend and stored the agent's prose, but never wrote the clip down: the
 * `clip` event went to the browser and nowhere else. Provider clip urls EXPIRE, so a paid render was
 * gone as soon as the tab closed — no gallery entry, no lineage, and nothing for the next shot to
 * open on, which is precisely why sequence chaining could not be built on top of it.
 *
 * These lock the shape the route now writes. Pure; memory repository, no network, no spend.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRepository } from '../adapters/memory';
import { listAssets } from '../queries';
import type { Asset } from '../models';

const USER = 'dev-user';
const THREAD = 'thread-1';
const INTERACTION = 'interaction-1';

function clipAsset(over: Partial<Asset> = {}): Asset {
  const now = Date.now();
  return {
    id: 'asset-clip-1',
    user_id: USER,
    category: 'asset',
    status: 'active',
    created_at: now,
    updated_at: now,
    kind: 'video',
    source: 'generated',
    retention: 'ephemeral',
    thread_id: THREAD,
    interaction_id: INTERACTION,
    url: 'https://provider.example/clip.mp4',
    model: 'seedance-2',
    model_label: 'Seedance 2.5',
    index: 0,
    prompt: 'a black Lamborghini launching down a wet street',
    gen_cost_usd: 0.42,
    duration_sec: 8,
    has_audio: true,
    thumbnail_url: 'https://provider.example/poster.jpg',
    ...over,
  };
}

test('a rendered clip survives as an asset, with the facts a gallery needs', async () => {
  const repo = createMemoryRepository();
  await repo.put(clipAsset());

  const { items } = await listAssets(repo, USER, THREAD);
  assert.equal(items.length, 1, 'the clip must be retrievable after the stream ends');

  const [clip] = items;
  assert.equal(clip.kind, 'video');
  assert.equal(clip.url, 'https://provider.example/clip.mp4');
  // Without the poster the tile has nothing to show; without these two the drawer cannot say
  // whether the sound the user paid for actually came back.
  assert.equal(clip.thumbnail_url, 'https://provider.example/poster.jpg');
  assert.equal(clip.duration_sec, 8);
  assert.equal(clip.has_audio, true);
  // Provenance — the FKs the gallery and the hydrate query run on.
  assert.equal(clip.thread_id, THREAD);
  assert.equal(clip.interaction_id, INTERACTION);
  assert.equal(clip.gen_cost_usd, 0.42, 'spend is attributable to the thing it bought');
});

test('a clip points back at the frames that produced it — the edge chaining needs', async () => {
  const repo = createMemoryRepository();
  const now = Date.now();
  const startFrame: Asset = {
    id: 'asset-frame-1',
    user_id: USER,
    category: 'asset',
    status: 'active',
    created_at: now,
    updated_at: now,
    kind: 'image',
    source: 'upload',
    retention: 'ephemeral',
    thread_id: THREAD,
    interaction_id: INTERACTION,
    url: 'data:image/png;base64,AAAA',
    index: 0,
  };
  await repo.put(startFrame);
  await repo.put(clipAsset({ reference_asset_ids: [startFrame.id] }));

  const { items } = await listAssets(repo, USER, THREAD);
  const clip = items.find((a) => a.kind === 'video')!;
  assert.deepEqual(clip.reference_asset_ids, ['asset-frame-1']);
  // The edge must RESOLVE — a dangling id is the same as no lineage at all.
  assert.ok(items.some((a) => a.id === clip.reference_asset_ids![0]));
});

test('clips and images live in one thread listing, so a shot reads in order', async () => {
  const repo = createMemoryRepository();
  const now = Date.now();
  await repo.put({
    id: 'asset-img-1',
    user_id: USER,
    category: 'asset',
    status: 'active',
    created_at: now,
    updated_at: now,
    kind: 'image',
    source: 'generated',
    retention: 'ephemeral',
    thread_id: THREAD,
    interaction_id: INTERACTION,
    url: 'https://provider.example/still.png',
  } as Asset);
  await repo.put(clipAsset({ created_at: now + 1, updated_at: now + 1 }));

  const { items } = await listAssets(repo, USER, THREAD);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((a) => a.kind), ['image', 'video'], 'kind-agnostic, ascending by birth');
});

test('a silent clip records that it is silent, rather than leaving it unknown', async () => {
  const repo = createMemoryRepository();
  await repo.put(clipAsset({ has_audio: false, thumbnail_url: undefined }));
  const { items } = await listAssets(repo, USER, THREAD);
  assert.equal(items[0].has_audio, false, 'false is a receipt; undefined is a shrug');
});
