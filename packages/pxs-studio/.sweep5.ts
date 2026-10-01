import { PROVIDERS, authHeaders, registryTag } from './src/lib/engine/provider-roster';
import { IMAGE_MODELS } from './src/lib/engine/model-registry';
import { MEDIA_MODELS } from './src/lib/engine/media-registry';
import { sweepForSuccessors } from './src/lib/engine/model-succession';
const models = [
  ...IMAGE_MODELS.filter((m) => !m.preview && !m.needsResearch).map((m) => ({ id: m.id, provider: m.provider, providerModelId: m.providerModelId })),
  ...MEDIA_MODELS.filter((m) => m.modalities.includes('video') && !m.preview && !m.needsResearch).map((m) => ({ id: m.id, provider: m.provider, providerModelId: m.providerModelId })),
];
const hosts = PROVIDERS.filter((p) => p.status === 'active' && p.modelsEndpoint && p.modalities.some((m) => m === 'image' || m === 'video')).map((p) => registryTag(p));
const failures: string[] = [];
(async () => {
  const reports = await sweepForSuccessors(models, {
    search: async (tag, keyword) => {
      const p = PROVIDERS.find((x) => registryTag(x) === tag) ?? PROVIDERS.find((x) => x.id === tag);
      const key = p ? process.env[p.envKey] : undefined;
      if (!p?.modelsEndpoint || !key) return [];
      const url = p.modelsEndpoint.endsWith('=') ? `${p.modelsEndpoint}${encodeURIComponent(keyword)}` : p.modelsEndpoint;
      const res = await fetch(url, { headers: authHeaders(p, key) });
      if (!res.ok) { failures.push(`${tag} → ${res.status}`); throw new Error(String(res.status)); }
      const j = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const rows = (j?.items ?? j?.models ?? j?.data ?? j?.results) as unknown;
      return Array.isArray(rows) ? rows.map((r) => (r as Record<string, unknown>).id).filter((i): i is string => typeof i === 'string') : [];
    },
  }, hosts);
  console.log('WE ARE BEHIND ON:');
  let any = false;
  for (const r of reports) for (const s of r.successions) { any = true; console.log(`  ${s.currentId} (${s.currentVersion})  →  ${s.successorId} (${s.successorVersion})   [on ${r.provider}]`); }
  if (!any) console.log('  (nothing)');
  console.log('\nFAILED CHECKS:', failures.length ? [...new Set(failures)].join(', ') : '(none — every provider answered)');
})();
