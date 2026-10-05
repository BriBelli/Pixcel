/**
 * THE MODEL WATCH — "are we behind?", asked on a schedule, answered out loud.
 *
 * The succession sweep was fixed to tell the truth, and then two things kept it useless anyway:
 *
 *   IT ONLY RAN WHEN YOU GENERATED AN IMAGE. The single trigger was the image-agent route, so the
 *   catalog's freshness depended on app traffic. It sat eight days stale while OpenAI shipped two
 *   whole generations.
 *
 *   NOTHING SURFACED IT. Even when it ran and found something, the finding went into a JSON response
 *   nobody reads. A detector reporting into the void is the same as no detector.
 *
 * So this runs on a TIMER, independent of whether anyone touches the app, and writes what it finds
 * somewhere the UI can show it.
 *
 * WHY THIS IS THE CHEAP CHECK, DELIBERATELY. Asking a provider "what models do you have?" is an
 * HTTP GET — no Tavily, no LLM, no spend. The expensive work is RESEARCH (reading a dozen pages per
 * model) and DOCTRINE, and both stay on their existing bounded, TTL-gated paths. This answers the
 * one question that actually burned us — "is there something newer?" — for approximately nothing,
 * which is why it can afford to run every day whether or not you are working.
 */

import type { Repository } from '../db/repository';
import { IMAGE_MODELS } from '../engine/model-registry';
import { MEDIA_MODELS } from '../engine/media-registry';
import { PROVIDERS, authHeaders, registryTag } from '../engine/provider-roster';
import { sweepForSuccessors, type Succession } from '../engine/model-succession';

/** How often to ask. Model launches are a weekly-at-most event; daily is already generous. */
export const WATCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Boot is busy. Let the server settle before spending its attention on this. */
const BOOT_DELAY_MS = 30_000;

/** The single record the UI reads. One row, overwritten — this is a current state, not a log. */
export const WATCH_RECORD_ID = 'model-watch:latest';

export interface BehindOn {
  /** Our registry id. */
  currentId: string;
  currentVersion: string;
  /** The provider's id for the newer model — what to look up when adopting it. */
  successorId: string;
  successorVersion: string;
  /** Which host it was found on. */
  foundOn: string;
}

export interface WatchState {
  checkedAt: number;
  behind: BehindOn[];
  /** Hosts that would not answer. Distinguishes "nothing is newer" from "we could not look". */
  failedHosts: string[];
  /** Ids the user has dismissed — not reported again until something NEWER appears. */
  acknowledged?: string[];
}

/**
 * Ask every active host whether anything newer exists.
 *
 * Returns the findings; never throws. A host that refuses is recorded as a FAILED CHECK rather than
 * folded into "nothing found" — that conflation is the exact bug that kept this silent for weeks.
 */
export async function checkWhatWeAreBehindOn(): Promise<{ behind: BehindOn[]; failedHosts: string[] }> {
  const models = [
    ...IMAGE_MODELS.filter((m) => !m.preview && !m.needsResearch).map((m) => ({
      id: m.id,
      provider: m.provider,
      providerModelId: m.providerModelId,
    })),
    ...MEDIA_MODELS.filter((m) => m.modalities.includes('video') && !m.preview && !m.needsResearch).map((m) => ({
      id: m.id,
      provider: m.provider,
      providerModelId: m.providerModelId,
    })),
  ];

  const hosts = PROVIDERS.filter(
    (p) => p.status === 'active' && p.modelsEndpoint && p.modalities.some((m) => m === 'image' || m === 'video'),
  ).map((p) => registryTag(p));

  const failedHosts = new Set<string>();

  const reports = await sweepForSuccessors(
    models,
    {
      search: async (tag, keyword) => {
        const p = PROVIDERS.find((x) => registryTag(x) === tag) ?? PROVIDERS.find((x) => x.id === tag);
        const key = p ? process.env[p.envKey] : undefined;
        if (!p?.modelsEndpoint || !key) return [];
        const url = p.modelsEndpoint.endsWith('=')
          ? `${p.modelsEndpoint}${encodeURIComponent(keyword)}`
          : p.modelsEndpoint;
        const res = await fetch(url, { headers: authHeaders(p, key), signal: AbortSignal.timeout(30_000) });
        if (!res.ok) {
          failedHosts.add(tag);
          throw new Error(`${tag} returned ${res.status}`);
        }
        const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        const rows = (json?.items ?? json?.models ?? json?.data ?? json?.results) as unknown;
        if (!Array.isArray(rows)) return [];
        return rows.map((r) => (r as Record<string, unknown>).id).filter((id): id is string => typeof id === 'string');
      },
    },
    hosts,
  );

  const behind: BehindOn[] = [];
  for (const r of reports) {
    for (const s of r.successions as Succession[]) {
      behind.push({
        currentId: s.currentId,
        currentVersion: s.currentVersion,
        successorId: s.successorId,
        successorVersion: s.successorVersion,
        foundOn: r.provider,
      });
    }
  }
  return { behind, failedHosts: [...failedHosts] };
}

/** Read what the last check found. Null when it has never run. */
export async function readWatchState(repo: Repository): Promise<WatchState | null> {
  try {
    const rec = (await repo.get('model_refresh', WATCH_RECORD_ID)) as
      | ({ state?: WatchState } & Record<string, unknown>)
      | null;
    return (rec?.state as WatchState) ?? null;
  } catch {
    return null;
  }
}

/** Run a check and persist it, preserving anything the user has already acknowledged. */
export async function runWatch(repo: Repository, now = Date.now()): Promise<WatchState> {
  const previous = await readWatchState(repo);
  const { behind, failedHosts } = await checkWhatWeAreBehindOn();

  // An acknowledgement is for a SPECIFIC successor. A newer one than the one dismissed is news
  // again, which is why this keeps the ids rather than a single "don't tell me" flag.
  const acknowledged = (previous?.acknowledged ?? []).filter((id) => behind.some((b) => b.successorId === id));

  const state: WatchState = { checkedAt: now, behind, failedHosts, acknowledged };
  try {
    await repo.put({
      id: WATCH_RECORD_ID,
      user_id: 'system',
      category: 'model_refresh',
      status: 'active',
      created_at: previous ? (previous.checkedAt ?? now) : now,
      updated_at: now,
      state,
    } as never);
  } catch (err) {
    console.warn('[model-watch] could not persist:', err);
  }
  return state;
}

/** Mark a finding as seen. It stays quiet until something newer than it appears. */
export async function acknowledge(repo: Repository, successorId: string, now = Date.now()): Promise<WatchState | null> {
  const state = await readWatchState(repo);
  if (!state) return null;
  if (!state.acknowledged?.includes(successorId)) {
    state.acknowledged = [...(state.acknowledged ?? []), successorId];
  }
  try {
    await repo.put({
      id: WATCH_RECORD_ID,
      user_id: 'system',
      category: 'model_refresh',
      status: 'active',
      created_at: state.checkedAt,
      updated_at: now,
      state,
    } as never);
  } catch {
    /* best effort */
  }
  return state;
}

/** Findings the user has not dismissed — what a notice should actually show. */
export function unacknowledged(state: WatchState | null): BehindOn[] {
  if (!state) return [];
  const seen = new Set(state.acknowledged ?? []);
  return state.behind.filter((b) => !seen.has(b.successorId));
}

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the watch: once shortly after boot, then daily.
 *
 * Idempotent — a second call is a no-op, because Next may evaluate a module more than once and two
 * timers would double the (small) cost for no benefit.
 */
export function startModelWatch(getRepo: () => Promise<Repository>): void {
  if (timer) return;

  const tick = async () => {
    try {
      const repo = await getRepo();
      const state = await runWatch(repo);
      const n = unacknowledged(state).length;
      if (n > 0) {
        console.warn(
          `[model-watch] BEHIND ON ${n} model${n === 1 ? '' : 's'}: ` +
            unacknowledged(state).map((b) => `${b.currentId} → ${b.successorId}`).join(', '),
        );
      }
      if (state.failedHosts.length > 0) {
        // Said out loud, because "we could not look" quietly reading as "nothing is newer" is the
        // original bug.
        console.warn(`[model-watch] could not check: ${state.failedHosts.join(', ')}`);
      }
    } catch (err) {
      console.warn('[model-watch] check failed:', err);
    }
  };

  setTimeout(() => void tick(), BOOT_DELAY_MS);
  timer = setInterval(() => void tick(), WATCH_INTERVAL_MS);
  // Never hold the process open for this.
  (timer as unknown as { unref?: () => void }).unref?.();
}
