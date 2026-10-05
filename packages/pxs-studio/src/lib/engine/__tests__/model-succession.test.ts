/**
 * Successor-detection tests, written against the FOUR real misses this is meant to prevent:
 * FLUX two generations stale · Recraft V3 while V4.1 was the API default · Happy Horse 1.0 while 1.1
 * was live · Seedance 2.0 while 2.5 shipped. Every one was caught by a human reading a docs site.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelId, isNewerVersion, findSuccessors,
  familyKey,
} from '../model-succession';

test('parses the id shapes providers actually use', () => {
  const cases: [string, string, number[]][] = [
    ['bytedance/seedance-2.5/text-to-video', 'bytedance-seedance-text-to-video', [2, 5]],
    ['gemini-3.1-flash-image', 'gemini-flash-image', [3, 1]],
    ['recraftv4_1', 'recraft', [4, 1]],
    ['flux-2-pro', 'flux-pro', [2]],
  ];
  for (const [id, family, version] of cases) {
    const p = parseModelId(id);
    assert.equal(p.family, family, `${id} family`);
    assert.deepEqual(p.version, version, `${id} version`);
  }
});

test('version comparison handles uneven component counts', () => {
  assert.equal(isNewerVersion([2, 5], [2, 0]), true);
  assert.equal(isNewerVersion([3], [2, 9]), true);
  assert.equal(isNewerVersion([2, 0], [2]), false); // 2.0 === 2
  assert.equal(isNewerVersion([4, 1], [4, 1]), false);
  assert.equal(isNewerVersion([1, 9], [2, 0]), false);
});

test('THE MISS: Seedance 2.0 → 2.5 is detected across endpoint variants', () => {
  const found = findSuccessors(
    ['bytedance/seedance-2.0/text-to-video'],
    [
      'bytedance/seedance-2.0/text-to-video',
      'bytedance/seedance-2.5/text-to-video',
      'bytedance/seedance-2.5/reference-to-video',
    ],
  );
  assert.equal(found.length, 1, 'several endpoints of one model collapse to ONE finding');
  assert.equal(found[0].currentVersion, '2.0');
  assert.equal(found[0].successorVersion, '2.5');
});

test('the other three real misses are caught too', () => {
  const found = findSuccessors(
    ['recraftv3', 'flux-1.1-pro', 'alibaba/happy-horse/v1.0/text-to-video'],
    ['recraftv3', 'recraftv4_1', 'flux-2-pro', 'alibaba/happy-horse/v1.1/text-to-video'],
  );
  const by = Object.fromEntries(found.map((f) => [f.currentId, f.successorId]));
  assert.equal(by['recraftv3'], 'recraftv4_1');
  assert.equal(by['flux-1.1-pro'], 'flux-2-pro');
  assert.equal(by['alibaba/happy-horse/v1.0/text-to-video'], 'alibaba/happy-horse/v1.1/text-to-video');
});

test('it reports the NEWEST successor, not merely a newer one', () => {
  const found = findSuccessors(['seedance-2.0'], ['seedance-2.1', 'seedance-2.5', 'seedance-2.3']);
  assert.equal(found[0].successorVersion, '2.5');
});

test('CONSERVATIVE: different families never match, however similar', () => {
  // A real listing is mostly other models; a false successor would send us researching nonsense.
  assert.deepEqual(findSuccessors(['flux-2-pro'], ['flux-2-dev', 'gemini-3-pro-image', 'sdxl-1.0']), []);
  // Same family, older or equal → nothing.
  assert.deepEqual(findSuccessors(['seedance-2.5'], ['seedance-2.0', 'seedance-2.5']), []);
  // Unversioned ids are skipped rather than guessed at.
  assert.deepEqual(findSuccessors(['recraft'], ['recraftv4_1']), []);
});

test('an empty or unrelated listing is simply no news', () => {
  assert.deepEqual(findSuccessors(['flux-2-pro'], []), []);
  assert.deepEqual(findSuccessors([], ['flux-9-pro']), []);
});

// ── THE SWEEP ────────────────────────────────────────────────────────────────────────────────────
import { familyKeyword, sweepForSuccessors } from '../model-succession';

test('familyKeyword extracts the model NAME a search index would match', () => {
  assert.equal(familyKeyword('bytedance/seedance-2.0/text-to-video'), 'seedance');
  assert.equal(familyKeyword('fal-ai/kling-video/v3/pro'), 'kling');
  assert.equal(familyKeyword('alibaba/happy-horse/v1.1/text-to-video'), 'happy');
  assert.equal(familyKeyword('recraftv4_1'), 'recraft');
});

test('the sweep asks per family and reports successors against OUR registry ids', async () => {
  const asked: string[] = [];
  const reports = await sweepForSuccessors(
    [{ id: 'seedance-2', provider: 'fal', providerModelId: 'bytedance/seedance-2.0/text-to-video' }],
    {
      search: async (_p, keyword) => {
        asked.push(keyword);
        return ['bytedance/seedance-2.0/text-to-video', 'bytedance/seedance-2.5/text-to-video'];
      },
    },
  );
  assert.deepEqual(asked, ['seedance']);
  const s = reports[0].successions[0];
  // Named by the REGISTRY id, because that is the record a human has to go and update.
  assert.equal(s.currentId, 'seedance-2');
  assert.equal(s.successorVersion, '2.5');
});

test('one query per family, however many endpoint variants we curate', async () => {
  let calls = 0;
  await sweepForSuccessors(
    [
      { id: 'a', provider: 'fal', providerModelId: 'bytedance/seedance-2.0/text-to-video' },
      { id: 'b', provider: 'fal', providerModelId: 'bytedance/seedance-2.0/image-to-video' },
    ],
    { search: async () => { calls++; return []; } },
  );
  assert.equal(calls, 1);
});

test('a provider that will not answer is not a finding — the next pass retries', async () => {
  const reports = await sweepForSuccessors(
    [{ id: 'a', provider: 'fal', providerModelId: 'seedance-2.0' }],
    { search: async () => { throw new Error('rate limited'); } },
  );
  assert.deepEqual(reports[0].successions, []);
  // "Checked and found nothing" must stay distinguishable from "never looked".
  assert.deepEqual(reports[0].checkedFamilies, ['seedance']);
});

// ── THE FLUX 3 MISS ──────────────────────────────────────────────────────────────────────────────
// Our FLUX 2 is registered under Replicate, so the sweep asked Replicate and only Replicate. fal had
// been listing blackforestlabs/flux-3 the whole time and Replicate had nothing, so a whole
// generation went unnoticed while the sweep cheerfully reported "checked, found nothing".
// A model FAMILY is not owned by the host we happen to reach it through.

test('a successor that launched on a DIFFERENT host is still found', async () => {
  const models = [{ id: 'flux-2-pro', provider: 'replicate', providerModelId: 'black-forest-labs/flux-2-pro' }];
  const catalog: Record<string, string[]> = {
    // Replicate has nothing newer — the real situation on 2026-09-23.
    replicate: ['black-forest-labs/flux-2-pro', 'black-forest-labs/flux-2-dev'],
    // fal is where the next generation showed up first.
    fal: ['blackforestlabs/flux-3/text-to-image', 'blackforestlabs/flux-2-pro'],
  };
  const reports = await sweepForSuccessors(
    models,
    { search: async (provider) => catalog[provider] ?? [] },
    ['replicate', 'fal'],
  );

  const found = reports.flatMap((r) => r.successions);
  assert.ok(found.length > 0, 'the successor must be found even though it is on another host');
  assert.ok(
    found.some((s) => /flux-3/.test(s.successorId)),
    `expected flux-3 among ${JSON.stringify(found.map((s) => s.successorId))}`,
  );
  assert.equal(found[0]!.currentId, 'flux-2-pro', 'and it must name OUR record to update');

  // Sweeping only the registered host is exactly the blind spot — prove it stays blind.
  const narrow = await sweepForSuccessors(models, { search: async (p) => catalog[p] ?? [] }, ['replicate']);
  assert.equal(narrow.flatMap((r) => r.successions).length, 0, 'replicate alone cannot see it');
});

test('every swept host reports which families it checked', async () => {
  const reports = await sweepForSuccessors(
    [{ id: 'flux-2-pro', provider: 'replicate', providerModelId: 'black-forest-labs/flux-2-pro' }],
    { search: async () => [] },
    ['replicate', 'fal'],
  );
  assert.deepEqual(reports.map((r) => r.provider).sort(), ['fal', 'replicate']);
  for (const r of reports) {
    assert.ok(r.checkedFamilies.includes('flux'), '"found nothing" must be distinguishable from "never looked"');
  }
});

// ── CODENAMES AND DATES ──────────────────────────────────────────────────────────────────────────
// The GPT Image 2.5 miss. The sweep authenticated, fetched OpenAI's real list, and still reported
// nothing: 'gpt-image-2.5-flare' parsed to family "gpt-image-flare", which can never equal
// "gpt-image". Providers ship variants under labels the version parser cannot read, and treating
// each label as its own family is how you sit two generations behind while reporting "up to date".

test('a CODENAMED variant is the same family as the line it belongs to', () => {
  const found = findSuccessors(
    ['gpt-image-1.5'],
    ['gpt-image-1', 'gpt-image-1.5', 'gpt-image-2', 'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'],
  );
  assert.equal(found.length, 1, 'variants of one version collapse to a single finding');
  assert.equal(found[0]!.successorVersion, '2.5', 'and it is the NEWEST version, not merely a newer one');
  assert.match(found[0]!.successorId, /flare|sunburst/, 'reported by its REAL id, so it can be looked up');
});

test('a DATED build is the same family, and keeps its real id', () => {
  const p = parseModelId('gpt-image-2-2026-04-21');
  assert.equal(familyKey(p.family), familyKey(parseModelId('gpt-image-1.5').family));
  assert.deepEqual(p.version, [2], 'the date is not a version');
  assert.equal(p.raw, 'gpt-image-2-2026-04-21', 'the id we report must be the id that exists');
});

test('a variant label does NOT invent a version bump', () => {
  // grok-imagine-image-quality is a sibling of 2.0, not a successor to it.
  const found = findSuccessors(
    ['grok-imagine-image-2.0'],
    ['grok-imagine-image', 'grok-imagine-image-2.0', 'grok-imagine-image-quality'],
  );
  assert.deepEqual(found, [], 'an unversioned sibling must never read as an upgrade');
});

test('an older version is never reported as a successor', () => {
  assert.deepEqual(findSuccessors(['gpt-image-2'], ['gpt-image-1', 'gpt-image-1.5']), []);
});

// ── NOT EVERY NUMBER IS A VERSION, NOT EVERY SIBLING IS A SUCCESSOR ──────────────────────────────
// Prefix-tolerant matching is permissive by design, and the first live run showed the cost: four of
// eight findings were junk. A detector that cries wolf half the time gets ignored, which is the same
// outcome as the silence it replaced.

test('a TEXT model is never the successor to an image model', () => {
  assert.deepEqual(
    findSuccessors(['gpt-image-1.5'], ['gpt-6.1-sol', 'gpt-5.2']),
    [],
    'gpt-6.1 is a text model — a line does not change what it produces',
  );
  assert.deepEqual(findSuccessors(['grok-imagine-image-2.0'], ['grok-4.7']), []);
});

test('an implausible jump is a number that is not a version', () => {
  // fal writes Gemini 2.5 as 'gemini-25-flash-image'; 'recraft-20b' is a parameter count.
  assert.deepEqual(findSuccessors(['gemini-3-pro-image'], ['gemini-25-flash-image']), []);
  assert.deepEqual(findSuccessors(['recraft-v4.1'], ['recraft-20b']), []);
});

test('but a REAL upgrade still lands', () => {
  const real = findSuccessors(['gpt-image-1.5'], ['gpt-image-2.5-sunburst']);
  assert.equal(real.length, 1, 'the whole point is still to catch this one');
  assert.equal(real[0]!.successorVersion, '2.5');

  assert.equal(findSuccessors(['ideogram-v3'], ['ideogram/v4.5/edit']).length, 1, 'v3 → v4.5');
  assert.equal(findSuccessors(['flux-2-pro'], ['flux-3-pro']).length, 1, 'flux 2 → 3');
});

test('video lines match video successors', () => {
  assert.equal(
    findSuccessors(['kling-3'], ['fal-ai/kling-video/o3/4k/video-to-video']).length,
    1,
    'a video model may still succeed a video model',
  );
});

test('a text model is rejected even on an EXACT family key match', () => {
  // The family key strips 'image' as noise, so 'gpt-image-1.5' and 'gpt-4.1' both key to "gpt".
  // Only the raw ids still carry the medium, which is why the kind is checked there.
  assert.deepEqual(findSuccessors(['gpt-image-1.5'], ['gpt-4.1', 'gpt-5']), []);
});

test('a version we ALREADY carry is not reported as news', () => {
  const found = findSuccessors(
    ['gemini-3-pro-image', 'gemini-3.1-flash-image'],
    ['gemini-3.1-flash-image-preview'],
  );
  assert.deepEqual(found, [], 'we hold 3.1 already — reporting it trains the operator to skim');
});

test('…but an unheld newer version in the same family still reports', () => {
  const found = findSuccessors(['gemini-3-pro-image', 'gemini-3.1-flash-image'], ['gemini-4-pro-image']);
  assert.equal(found.length, 1);
  assert.equal(found[0]!.successorVersion, '4');
});

test('the sweep reports ONE finding per discovery, not one per host', async () => {
  // GPT Image 2.5 is 'gpt-image-2.5-flare' on OpenAI and 'openai/gpt-image-2.5/sunburst/edit' on
  // fal — the same thing shipping, listed twice.
  const catalog: Record<string, string[]> = {
    openai: ['gpt-image-1.5', 'gpt-image-2.5-flare'],
    fal: ['openai/gpt-image-2.5/sunburst/edit'],
  };
  const reports = await sweepForSuccessors(
    [{ id: 'gpt-image-1.5', provider: 'openai', providerModelId: 'gpt-image-1.5' }],
    { search: async (p) => catalog[p] ?? [] },
    ['openai', 'fal'],
  );
  const all = reports.flatMap((r) => r.successions);
  assert.equal(all.length, 1, 'one model shipped, so one finding');
  assert.equal(all[0]!.successorVersion, '2.5');
});

test('the sweep knows the WHOLE catalog when judging what is already held', async () => {
  // The sweep checks one family at a time, so without the full catalog a per-family call has never
  // heard of our other records — which is how an already-registered model kept being "discovered".
  const reports = await sweepForSuccessors(
    [
      { id: 'gemini-3-pro-image', provider: 'gemini', providerModelId: 'gemini-3-pro-image' },
      { id: 'gemini-3.1-flash-image', provider: 'gemini', providerModelId: 'gemini-3.1-flash-image' },
    ],
    { search: async () => ['gemini-3.1-flash-image-preview'] },
    ['gemini'],
  );
  assert.deepEqual(reports.flatMap((r) => r.successions), [], 'we already hold 3.1');
});

test('a version older than what we ALREADY adopted is not news', async () => {
  // Straight from the first live watch run, which reported all three of these the day AFTER they
  // were superseded by adoptions: holding 2.5 makes "gpt-image-2 exists" stale news.
  assert.deepEqual(
    findSuccessors(['gpt-image-1.5'], ['gpt-image-2', 'gpt-image-2-2026-04-21'], ['gpt-image-1.5', 'gpt-image-2.5-flare']),
    [],
    'we already hold something newer than the candidate',
  );
  assert.deepEqual(
    findSuccessors(['ideogram-v3'], ['ideogram/v4/instant'], ['ideogram-v3', 'ideogram/v4.5']),
    [],
    'v4 is behind the v4.5 we hold',
  );
});

test('…and a version NEWER than what we adopted is still news', () => {
  const found = findSuccessors(['gpt-image-1.5'], ['gpt-image-3'], ['gpt-image-1.5', 'gpt-image-2.5-flare']);
  assert.equal(found.length, 1, 'genuinely ahead of everything we hold');
  assert.equal(found[0]!.successorVersion, '3');
});

test('holding a sibling at the SAME version silences it across host spellings', () => {
  // 'fal-ai/flux-3-action/so101' and 'blackforestlabs/flux-3/text-to-image' are both FLUX 3.
  assert.deepEqual(
    findSuccessors(['flux-2-pro'], ['fal-ai/flux-3-action/so101'], ['flux-2-pro', 'blackforestlabs/flux-3/text-to-image']),
    [],
    'we hold FLUX 3 already, however the host spells it',
  );
});
