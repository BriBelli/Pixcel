/**
 * MODEL AGENT — the WARM-UP (the agent waking up).
 *
 * On init (and on an interval, and on demand) the Model agent warms up: it pings every keyed provider
 * (see `health.ts`) and assembles a single WarmupState the rest of the system reads. Two consumers:
 *   • the readiness signal — Chat never blocks (Anthropic loads first, the warm-up finishes in the
 *     background before the user executes anything); Image/Video/Audio wait for `isModelAgentReady()`.
 *   • the transparency surface — Brian (and later the UX) can SEE what the agent is managing.
 *
 * THE md + json SPLIT (Brian's call):
 *   • state/health.json  — LIVE runtime state (pings, statuses, HTTP reasons, timings). Gitignored;
 *     rewritten every warm-up. This is what the gate + a future UX read.
 *   • knowledge/…/*.md   — DURABLE, human-readable knowledge (what the agent is "skilled in"). Written
 *     from the roster (provider shards here; model criteria arrive in the registry slice). Committed,
 *     low-churn — it changes when the roster changes, NOT every ping.
 *
 * Spend note: healthchecks are free (list-models GETs). Brian's directive — it is worth warming the
 * agents on init even if it cost money; do it right, always optimal. This costs nothing but latency.
 */

import fs from 'node:fs';
import path from 'node:path';
import { checkAllProviders, type ProviderHealth, type HealthStatus } from './health';
import { PROVIDERS, type Provider, type Modality } from '../../engine/provider-roster';
import { mediaModelsForProvider, type MediaModel } from '../../engine/media-registry';

export interface WarmupSummary {
  total: number;
  ready: number;
  unhealthy: number;
  unverified: number;
  noKey: number;
  dropped: number;
}

export interface WarmupState {
  /** 'warming' while pinging; then 'ready' (≥1 provider up, none failed) / 'degraded' (some failed,
   *  but the agent is usable — a down provider is reported, not fatal) / 'down' (nothing reachable). */
  status: 'warming' | 'ready' | 'degraded' | 'down';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  summary: WarmupSummary;
  providers: ProviderHealth[];
}

// Runtime state dir (gitignored). Written from the app's cwd (packages/pxs-studio) or a script run there.
const AGENT_DIR = path.join(process.cwd(), 'src/lib/agents/model-agent');
const STATE_DIR = path.join(AGENT_DIR, 'state');
const KNOWLEDGE_DIR = path.join(AGENT_DIR, 'knowledge');
const HEALTH_FILE = path.join(STATE_DIR, 'health.json');

let current: WarmupState | null = null;
let inflight: Promise<WarmupState> | null = null;

const emptySummary = (): WarmupSummary => ({ total: 0, ready: 0, unhealthy: 0, unverified: 0, noKey: 0, dropped: 0 });

function summarize(providers: ProviderHealth[]): WarmupSummary {
  const s = emptySummary();
  s.total = providers.length;
  const bump: Record<HealthStatus, keyof WarmupSummary> = {
    ready: 'ready',
    unhealthy: 'unhealthy',
    unverified: 'unverified',
    'no-key': 'noKey',
    dropped: 'dropped',
  };
  for (const p of providers) s[bump[p.status]]++;
  return s;
}

function overallStatus(s: WarmupSummary): WarmupState['status'] {
  const live = s.ready + s.unverified; // keyed + not-failing
  if (live === 0) return 'down';
  return s.unhealthy > 0 ? 'degraded' : 'ready';
}

/** The current warm-up state (null before the first warm-up). Cheap; read by the gate + UX. */
export function getWarmupState(): WarmupState | null {
  return current;
}

/** Has the agent finished warming and found something reachable? The gate for Image/Video/Audio. */
export function isModelAgentReady(): boolean {
  return current != null && current.status !== 'warming' && current.status !== 'down';
}

function writeState(state: WarmupState): void {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
  } catch {
    /* non-fatal — the in-memory state is the source of truth; the file is a mirror for inspection. */
  }
}

/**
 * Run the warm-up. Idempotent: a warm state is reused unless `force`; a concurrent call joins the
 * in-flight ping instead of double-pinging. Always resolves (a failed provider is data, not an error).
 */
export async function warmUp(force = false): Promise<WarmupState> {
  if (current && !force && current.status !== 'warming') return current;
  if (inflight) return inflight;

  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  current = { status: 'warming', startedAt, summary: emptySummary(), providers: [] };

  inflight = (async () => {
    const providers = await checkAllProviders();
    const summary = summarize(providers);
    const state: WarmupState = {
      status: overallStatus(summary),
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - t0,
      summary,
      providers,
    };
    current = state;
    writeState(state);
    return state;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * Regenerate the provider KNOWLEDGE md shards from the roster — the human-readable, low-churn view of
 * what the agent knows about each company. Model-level criteria (image/video/audio) land here in the
 * registry slice; for now each shard carries the provider's identity, modalities, docs, and status.
 */
export function syncProviderKnowledge(): string[] {
  const dir = path.join(KNOWLEDGE_DIR, 'providers');
  fs.mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  for (const p of PROVIDERS) {
    const file = path.join(dir, `${p.id}.md`);
    fs.writeFileSync(file, providerShard(p), 'utf8');
    written.push(file);
  }
  // A tiny index so the directory reads as a catalog.
  fs.writeFileSync(
    path.join(KNOWLEDGE_DIR, 'README.md'),
    knowledgeReadme(),
    'utf8',
  );
  return written;
}

function providerShard(p: Provider): string {
  return `---
provider: ${p.id}
label: ${JSON.stringify(p.label)}
modalities: [${p.modalities.join(', ')}]
status: ${p.status}
envKey: ${p.envKey}
registryTag: ${p.registryTag ?? p.id}
docsUrl: ${p.docsUrl}
${p.modelsEndpoint ? `modelsEndpoint: ${p.modelsEndpoint}\n` : ''}---

# ${p.label}

${p.note ?? ''}

## What the agent knows
- **Modalities:** ${p.modalities.join(', ')}
- **Roster status:** ${p.status}
- **Docs (refresh source):** ${p.docsUrl}

## Models
${renderProviderModels(p.id)}
_Live connection health is tracked separately in \`state/health.json\` (not here — this file is durable
knowledge, not runtime state)._
`;
}

/** Render this provider's models from the union registry, grouped by modality (Image/Video/Audio). */
function renderProviderModels(providerId: string): string {
  const models = mediaModelsForProvider(providerId);
  if (models.length === 0) {
    return '_No curated models yet — the registry refresh sources them from the provider docs._\n';
  }
  const order: Modality[] = ['image', 'video', 'audio'];
  const sections: string[] = [];
  for (const modality of order) {
    const inMod = models.filter((m) => m.modalities.includes(modality));
    if (inMod.length === 0) continue;
    const rows = inMod.map((m) => modelLine(m, modality)).join('\n');
    sections.push(`### ${modality[0].toUpperCase()}${modality.slice(1)}\n${rows}`);
  }
  return sections.join('\n\n') + '\n';
}

function modelLine(m: MediaModel, modality: Modality): string {
  const flags: string[] = [`tier ${m.tier}`];
  if (m.modalities.length > 1) flags.push(`omni: ${m.modalities.join('+')}`);
  if (m.needsResearch) flags.push('needs-research');
  if (m.preview) flags.push('preview');
  if (modality === 'video' && m.video?.nativeAudio) flags.push('native-audio');
  const crit =
    modality === 'image' && m.image
      ? `refs ${m.image.maxReferenceImages}, ${m.image.aspectRatios.length} aspect ratios`
      : modality === 'video' && m.video
        ? `≤${m.video.maxDurationSec}s, ${m.video.resolutions.join('/')}`
        : modality === 'audio' && m.audio
          ? `${m.audio.kind.join('/')}, ≤${m.audio.maxDurationSec}s`
          : '';
  return `- **${m.label}** (\`${m.id}\`) — ${m.brief} _[${flags.join(' · ')}${crit ? ` · ${crit}` : ''}]_`;
}

function knowledgeReadme(): string {
  return `# Model Agent — Knowledge

Durable, human-readable knowledge the Model agent is "skilled in" — one markdown shard per provider
under \`providers/\`, generated from the deterministic roster (\`src/lib/engine/provider-roster.ts\`).

This is the **md** half of the md/json split:
- **\`knowledge/\`** (here) — durable knowledge (providers, and soon per-model criteria). Low-churn,
  committed, changes when the roster/registry changes.
- **\`state/health.json\`** — live runtime health (pings, statuses, HTTP reasons, timings). Rewritten
  every warm-up, gitignored.

Regenerate with \`syncProviderKnowledge()\` (see \`../warmup.ts\`).
`;
}
