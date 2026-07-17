/**
 * Maintenance-agent tests — discovery research + evidence-based ghost retirement + reset. Injected
 * `research` (no network), in-memory repo. Run: `tsx --test src/lib/agents/__tests__/model-maintenance.test.ts`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryRepository } from '../../db/adapters/memory';
import type { Repository } from '../../db/repository';
import type { ModelRefreshRecord } from '../../db/models';
import {
  runMaintenance,
  toImageModel,
  slugId,
  parseResearch,
  type Discovery,
  type ResearchedModel,
} from '../model-maintenance';
import { getLiveCatalog } from '../live-catalog';

const NOW = Date.parse('2027-01-01T00:00:00Z');

async function seedRefresh(repo: Repository, provider: string, over: Partial<ModelRefreshRecord>): Promise<void> {
  await repo.put({
    id: `model_refresh:${provider}`,
    user_id: 'system',
    category: 'model_refresh',
    status: 'active',
    created_at: NOW,
    updated_at: NOW,
    provider,
    checked_at: NOW,
    confirmed: [],
    discovered: [],
    unconfirmed: [],
    ...over,
  } as ModelRefreshRecord);
}

const research = async (d: Discovery): Promise<ResearchedModel | null> =>
  d.liveId === 'gemini-9-new'
    ? { label: 'Gemini 9', brief: 'A discovered flagship.', confidence: 'high', capabilities: ['photorealism'], costPerImageUsd: [0.05, 0.1] }
    : null;

test('slugId + toImageModel: builds a conservative record; low confidence stays out of routing', () => {
  assert.equal(slugId('black-forest-labs/FLUX.2-Pro'), 'black-forest-labs-flux.2-pro');
  const m = toImageModel({ label: 'X', brief: 'b', confidence: 'low' }, { provider: 'google', liveId: 'gemini-x' }, NOW)!;
  assert.equal(m.provider, 'gemini'); // roster google → registry tag
  assert.equal(m.providerModelId, 'gemini-x');
  assert.equal(m.preview, true);
  assert.equal(m.needsResearch, true);
  // Unknown provider → no card.
  assert.equal(toImageModel({ label: 'X', brief: 'b', confidence: 'high' }, { provider: 'nope', liveId: 'z' }, NOW), null);
});

test('discovery → researched card persisted and appears in the live catalog', async () => {
  const repo = createMemoryRepository();
  await seedRefresh(repo, 'google', { discovered: [{ id: 'gemini-9-new', label: 'Gemini 9' }] });
  const summary = await runMaintenance(repo, { now: NOW, research });
  assert.deepEqual(summary.researched, ['gemini-9-new']);

  const catalog = await getLiveCatalog(repo);
  const found = catalog.find((m) => m.id === 'gemini-9-new');
  assert.ok(found, 'discovered model should be routable in the live catalog');
  assert.ok(!found!.preview); // high confidence → not gated out of routing
  assert.equal(found!.needsResearch, false);
});

test('a research miss (null) persists no card', async () => {
  const repo = createMemoryRepository();
  await seedRefresh(repo, 'google', { discovered: [{ id: 'mystery-model' }] });
  const summary = await runMaintenance(repo, { now: NOW, research });
  assert.equal(summary.researched.length, 0);
  const catalog = await getLiveCatalog(repo);
  assert.equal(catalog.some((m) => m.id === 'mystery-model'), false);
});

test('ghost: retires only after repeated-miss evidence, then drops from the catalog', async () => {
  const repo = createMemoryRepository();
  await seedRefresh(repo, 'google', { unconfirmed: ['nano-banana'] });

  const p1 = await runMaintenance(repo, { now: NOW, research });
  assert.deepEqual(p1.incremented, ['nano-banana']);
  assert.equal(p1.retired.length, 0);
  const p2 = await runMaintenance(repo, { now: NOW + 1, research });
  assert.equal(p2.retired.length, 0);
  const p3 = await runMaintenance(repo, { now: NOW + 2, research });
  assert.deepEqual(p3.retired, ['nano-banana']); // threshold 3 reached

  // A retired seed model is filtered from the live catalog (reversibly).
  const catalog = await getLiveCatalog(repo);
  assert.equal(catalog.some((m) => m.id === 'nano-banana'), false);
});

test('ghost RESET: a retired model that reappears live is un-retired and returns to the catalog', async () => {
  const repo = createMemoryRepository();
  await seedRefresh(repo, 'google', { unconfirmed: ['nano-banana'] });
  // Age it to retirement.
  await runMaintenance(repo, { now: NOW, research });
  await runMaintenance(repo, { now: NOW + 1, research });
  await runMaintenance(repo, { now: NOW + 2, research });
  assert.equal((await getLiveCatalog(repo)).some((m) => m.id === 'nano-banana'), false);

  // Now the refresh confirms it again.
  await seedRefresh(repo, 'google', { confirmed: ['nano-banana'], unconfirmed: [] });
  const reset = await runMaintenance(repo, { now: NOW + 3, research });
  assert.deepEqual(reset.reset, ['nano-banana']);
  assert.ok((await getLiveCatalog(repo)).some((m) => m.id === 'nano-banana'), 'model is back after reappearing');
});

test('parseResearch: tolerant JSON, defaults bad confidence to low, rejects junk', () => {
  const ok = parseResearch('here you go {"label":"A","brief":"b","confidence":"medium"} done');
  assert.equal(ok?.label, 'A');
  assert.equal(ok?.confidence, 'medium');
  const bad = parseResearch('{"label":"A","brief":"b","confidence":"wat"}');
  assert.equal(bad?.confidence, 'low');
  assert.equal(parseResearch('no json here'), null);
  assert.equal(parseResearch('{"brief":"missing label"}'), null);
});
