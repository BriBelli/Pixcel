/**
 * REGISTRY REFRESH RUNNER — the impure seam that ties the pure refresh engine to the DB.
 *
 * The engine (`engine/model-refresh.ts`) is pure + injected-I/O. This runner is where it meets the
 * repository: it overlays the PERSISTED freshness onto the seed catalog (so the seed const is never
 * mutated — the DB holds the living stamps + discoveries, layered on top), runs a pass, and persists
 * each provider's diff as a `model_refresh` record.
 *
 * The persisted `checked_at` becomes the freshness the due-check reads — so once a provider is
 * refreshed, it isn't re-checked until its TTL lapses. That's what makes `refreshRegistryIfDue` a
 * safe fire-and-forget from a hot path: on most turns it does ZERO network (nothing is due) and
 * returns instantly; it only reaches out once per provider per TTL window.
 */

import { IMAGE_MODELS, type ImageModel } from '../engine/model-registry';
import { PROVIDERS, registryTag } from '../engine/provider-roster';
import {
  runRegistryRefresh,
  providersDue,
  liveRefreshDeps,
  type RefreshDeps,
  type ReconcileResult,
} from '../engine/model-refresh';
import { DEFAULT_TTL_HOURS } from '../engine/staleness';
import type { Repository } from '../db/repository';
import type { ModelRefreshRecord } from '../db/models';

/** Registry refreshes are SYSTEM state, not per-end-user. */
export const SYSTEM_USER_ID = 'system';
const recordId = (provider: string) => `model_refresh:${provider}`;
const isoDay = (epoch: number) => new Date(epoch).toISOString().slice(0, 10);

/** Load the persisted per-provider refresh state, keyed by roster provider id. */
export async function loadRefreshState(repo: Repository): Promise<Map<string, ModelRefreshRecord>> {
  const res = await repo.query({ category: 'model_refresh', user_id: SYSTEM_USER_ID });
  const map = new Map<string, ModelRefreshRecord>();
  for (const r of res.items as ModelRefreshRecord[]) map.set(r.provider, r);
  return map;
}

/**
 * Overlay persisted freshness onto the seed catalog: a model's effective `sourceRefreshedAt` is the
 * NEWER of its seed stamp and its provider's last persisted `checked_at`. The seed array is never
 * mutated (returns copies only where a stamp is newer). This is the stale-while-revalidate read of
 * freshness — the seed provides the base, the DB provides the living updates.
 */
export function overlayFreshness(seed: ImageModel[], state: Map<string, ModelRefreshRecord>): ImageModel[] {
  const stampByTag = new Map<string, string>();
  for (const p of PROVIDERS) {
    const rec = state.get(p.id);
    if (rec) stampByTag.set(registryTag(p), isoDay(rec.checked_at));
  }
  return seed.map((m) => {
    const stamp = stampByTag.get(m.provider);
    if (!stamp) return m;
    return Date.parse(stamp) > Date.parse(m.sourceRefreshedAt) ? { ...m, sourceRefreshedAt: stamp } : m;
  });
}

async function persistResults(repo: Repository, results: ReconcileResult[], now: number): Promise<void> {
  for (const r of results) {
    const rec: ModelRefreshRecord = {
      id: recordId(r.provider),
      user_id: SYSTEM_USER_ID,
      category: 'model_refresh',
      status: 'active',
      created_at: now,
      updated_at: now,
      provider: r.provider,
      checked_at: now,
      confirmed: r.confirmed,
      discovered: r.discovered,
      unconfirmed: r.unconfirmed,
    };
    await repo.put(rec); // upsert by category + id (stable per provider)
  }
}

export interface RefreshSummary {
  ranAt: number;
  providersChecked: string[];
  discoveredCount: number;
  unconfirmedCount: number;
  results: ReconcileResult[];
}

/** Run a full refresh pass with the given deps (inject `fetchLive` in tests; `liveRefreshDeps` for
 *  real network) and persist every diff. Overlays persisted freshness first so due-selection is
 *  correct across process restarts. */
export async function refreshRegistry(repo: Repository, deps: RefreshDeps): Promise<RefreshSummary> {
  const state = await loadRefreshState(repo);
  const effective = overlayFreshness(IMAGE_MODELS, state);
  const results = await runRegistryRefresh(effective, deps);
  await persistResults(repo, results, deps.now);
  return {
    ranAt: deps.now,
    providersChecked: results.map((r) => r.provider),
    discoveredCount: results.reduce((n, r) => n + r.discovered.length, 0),
    unconfirmedCount: results.reduce((n, r) => n + r.unconfirmed.length, 0),
    results,
  };
}

/**
 * Guarded entry point for a hot path: refresh ONLY if something is actually due (using persisted
 * freshness), otherwise return `{ skipped: true }` having done no network. Safe to call
 * fire-and-forget (`void refreshRegistryIfDue(db, Date.now()).catch(() => {})`) — on the vast
 * majority of turns nothing is due and it's a single cheap DB read.
 */
export async function refreshRegistryIfDue(
  repo: Repository,
  now: number,
  ttlHours: number = DEFAULT_TTL_HOURS
): Promise<RefreshSummary | { skipped: true }> {
  const state = await loadRefreshState(repo);
  const effective = overlayFreshness(IMAGE_MODELS, state);
  const due = providersDue(PROVIDERS, effective, now, ttlHours);
  if (due.length === 0) return { skipped: true };
  return refreshRegistry(repo, liveRefreshDeps(now));
}
