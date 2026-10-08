/**
 * Studio context — what the Operator should already know about this studio.
 *
 * Brian, after the fifth time asking elsewhere for a prompt: "it's like I need an agent for the
 * agent." He had a phrasing that beat letterboxing, saved in a chat message, and had to go and
 * fetch it again — the studio watched him solve that problem and learned nothing.
 *
 * The signal was already here. Keeping something is a judgement; building on it is a stronger one,
 * because you staked another render on it. Nothing asks the user to rate anything.
 *
 * Pure: memory repository, no network.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRepository } from '../../db/adapters/memory';
import { readStudioContext, studioContextBrief } from '../studio-context';
import type { Asset } from '../../db/models';

const USER = 'dev-user';
let seq = 0;

function asset(over: Partial<Asset> = {}): Asset {
  seq++;
  return {
    id: `asset-${seq}`,
    user_id: USER,
    category: 'asset',
    status: 'active',
    created_at: 1000 + seq,
    updated_at: 1000 + seq,
    kind: 'image',
    source: 'generated',
    retention: 'ephemeral',
    thread_id: 't1',
    interaction_id: 'i1',
    url: `/api/media/${seq}.png`,
    ...over,
  };
}

async function ctxOf(assets: Asset[]) {
  const repo = createMemoryRepository();
  for (const a of assets) await repo.put(a);
  return readStudioContext(repo, USER);
}

test('an empty studio says nothing rather than saying "you have nothing"', async () => {
  const ctx = await ctxOf([]);
  assert.deepEqual(ctx.holdings, []);
  assert.equal(studioContextBrief(ctx), '', 'an Operator told it has no assets reasons worse than one told nothing');
});

test('a SAVED asset is something the plan should know about', async () => {
  const ctx = await ctxOf([
    asset({ retention: 'saved', title: 'Clean 16:9 plate', prompt: 'the long prompt that produced it, at length' }),
    asset({ retention: 'ephemeral', prompt: 'a throwaway take nobody kept' }),
  ]);
  assert.equal(ctx.holdings.length, 1);
  assert.equal(ctx.holdings[0]!.label, 'Clean 16:9 plate');
});

test('an asset BUILT ON counts as kept, even if never explicitly saved', async () => {
  // Staking another render on something is a stronger judgement than filing it.
  const plate = asset({ id: 'plate', prompt: 'the plate prompt, long enough to be worth recording' });
  const derived = asset({ reference_asset_ids: ['plate'] });
  const ctx = await ctxOf([plate, derived]);
  assert.ok(ctx.holdings.some((h) => h.id === 'plate'), 'the thing it was built FROM is clearly worth keeping');
});

test('a parent in an edit chain counts too', async () => {
  const base = asset({ id: 'base', prompt: 'the base image prompt, long enough to record' });
  const edit = asset({ parent_asset_id: 'base' });
  const ctx = await ctxOf([base, edit]);
  assert.ok(ctx.holdings.some((h) => h.id === 'base'));
});

// ── WHAT WORKED ──────────────────────────────────────────────────────────────────────────────────

test('the prompt behind a kept result is a prompt that WORKED', async () => {
  const ctx = await ctxOf([
    asset({
      retention: 'saved',
      model_label: 'Grok Imagine Image 2.0 (xAI)',
      prompt: 'Extend this image to a full 16:9 frame. No black bars, no letterboxing, no borders.',
    }),
  ]);
  assert.equal(ctx.provenRecipes.length, 1);
  assert.match(ctx.provenRecipes[0]!.prompt, /no black bars/i);
  assert.equal(ctx.provenRecipes[0]!.modelLabel, 'Grok Imagine Image 2.0 (xAI)');

  const brief = studioContextBrief(ctx);
  assert.match(brief, /PROMPTS THAT WORKED/);
  assert.match(brief, /no black bars/i, 'the hard-won constraint must reach the Operator verbatim');
});

test('near-identical takes of one idea are one lesson, not four', async () => {
  const p = 'Extend this image to a full 16:9 frame, no black bars, keeping the car exactly as it is';
  const ctx = await ctxOf([
    asset({ retention: 'saved', prompt: p }),
    asset({ retention: 'saved', prompt: p }),
    asset({ retention: 'saved', prompt: `${p} and the driver too` }),
  ]);
  assert.equal(ctx.provenRecipes.length, 1, 'deduped on the opening words');
});

test('a trivially short prompt is not a recipe', async () => {
  const ctx = await ctxOf([asset({ retention: 'saved', prompt: 'a car' })]);
  assert.deepEqual(ctx.provenRecipes, []);
});

// ── WHO KEEPS WINNING ────────────────────────────────────────────────────────────────────────────
// Three controlled comparisons went Grok's way and nothing recorded it. The registry rated Grok
// LOWEST of the three on reference work.

test('models are ranked by what the user KEPT, not by any rating', async () => {
  const ctx = await ctxOf([
    asset({ retention: 'saved', model_label: 'Grok', prompt: 'a prompt long enough to count as one' }),
    asset({ retention: 'saved', model_label: 'Grok', prompt: 'another prompt long enough to count' }),
    asset({ retention: 'saved', model_label: 'Grok', prompt: 'a third prompt long enough to count' }),
    asset({ retention: 'saved', model_label: 'GPT Image 1.5', prompt: 'one prompt long enough to count' }),
  ]);
  assert.equal(ctx.trusted[0]!.modelLabel, 'Grok');
  assert.equal(ctx.trusted[0]!.kept, 3);

  const brief = studioContextBrief(ctx);
  assert.match(brief, /Weigh it ABOVE the registry/, 'the user\'s own outcomes outrank the researched scores');
});

test('our own machinery never counts as a model the user chose', async () => {
  const ctx = await ctxOf([
    asset({ retention: 'saved', model_label: 'Assembled sequence', kind: 'video', prompt: 'a prompt long enough to count' }),
    asset({ retention: 'saved', model_label: 'Bridging frame', prompt: 'another prompt long enough to count' }),
    asset({ retention: 'saved', model_label: 'Grok', prompt: 'a third prompt long enough to count' }),
  ]);
  assert.deepEqual(ctx.trusted.map((t) => t.modelLabel), ['Grok']);
});

test('the brief stays small — it is injected on EVERY turn', async () => {
  const many = Array.from({ length: 40 }, (_, i) =>
    asset({ retention: 'saved', model_label: `M${i}`, title: `Asset ${i}`, prompt: `prompt number ${i} long enough to count as a recipe` }),
  );
  const brief = studioContextBrief(await ctxOf(many));
  assert.ok(brief.length < 4000, `digest, not a dump: ${brief.length} chars`);
});

// ── THE SIGNAL THAT ACTUALLY EXISTS ──────────────────────────────────────────────────────────────
// The first live read found almost nothing: Grok had been called perfect three times and saved
// zero times. Saving is a filing act, and people do not file while they are working. Downloading
// is what they actually do with a render they rate.

test('a DOWNLOADED render counts as kept — the verdict people actually give', async () => {
  const ctx = await ctxOf([
    asset({ kept_count: 1, model_label: 'Grok', prompt: 'a prompt long enough to count as a recipe' }),
    asset({ model_label: 'GPT Image 1.5', prompt: 'another prompt long enough to count as one' }),
  ]);
  assert.equal(ctx.trusted.length, 1);
  assert.equal(ctx.trusted[0]!.modelLabel, 'Grok', 'the one they took is the one they rated');
});

test('one model written two ways is ONE model', async () => {
  const ctx = await ctxOf([
    asset({ kept_count: 1, model_label: 'Seedance 2.5 (ByteDance)', prompt: 'a prompt long enough to count' }),
    asset({ kept_count: 1, model_label: 'seedance-2.5', prompt: 'another prompt long enough to count' }),
  ]);
  assert.equal(ctx.trusted.length, 1, 'the label and the id are the same thing');
  assert.equal(ctx.trusted[0]!.kept, 2);
  assert.equal(ctx.trusted[0]!.modelLabel, 'Seedance 2.5 (ByteDance)', 'the fullest spelling reads best');
});

test('a TITLE is never mistaken for a prompt', async () => {
  // An assembled scene stores its name in `prompt`; offering "Lamborghini launch sequence" as a
  // proven recipe would teach the Operator that three words are a brief.
  const ctx = await ctxOf([
    asset({ retention: 'saved', title: 'Lamborghini launch sequence', prompt: 'Lamborghini launch sequence' }),
  ]);
  assert.deepEqual(ctx.provenRecipes, []);
});

test('our own machinery is not material to plan with', async () => {
  const ctx = await ctxOf([
    asset({ retention: 'saved', model_label: 'Bridging frame', prompt: 'a prompt long enough to count' }),
    asset({ retention: 'saved', model_label: 'Assembled sequence', prompt: 'another prompt long enough' }),
  ]);
  assert.deepEqual(ctx.holdings, [], 'a bridging frame is plumbing, not a creative holding');
  assert.deepEqual(ctx.provenRecipes, []);
});

test('a label that merely repeats the kind is noise, not a holding', async () => {
  const ctx = await ctxOf([asset({ retention: 'saved', kind: 'image' })]);
  assert.deepEqual(ctx.holdings, [], '"[image] image" tells a planner nothing');
});

test('a NAME that happens to be long enough is still not a brief', async () => {
  const ctx = await ctxOf([
    asset({ kept_count: 1, prompt: 'Lamborghini launch sequence' }),
    asset({ kept_count: 1, prompt: 'Extend this image to a full 16:9 frame with no black bars anywhere' }),
  ]);
  assert.equal(ctx.provenRecipes.length, 1, 'three words is a name, however many characters it has');
  assert.match(ctx.provenRecipes[0]!.prompt, /16:9/);
});
