'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * model-agent-store — the CLIENT view of the Model agent's warm-up (the "warming up" signal).
 *
 * The server warms the agent on boot (instrumentation.ts) + on demand (/api/model-agent/status). This
 * store fetches that state, polls while it's still 'warming', and exposes the readiness signal the
 * graceful gate reads. Contract (Brian): Chat NEVER blocks; a creative section holds EXECUTION (not
 * typing) only when we KNOW the agent is still warming — never on an unknown/null state (optimistic,
 * since the server usually warmed on boot). A down provider is reported, not fatal.
 * ───────────────────────────────────────────────────────────────────────────── */

import { create } from 'zustand';

export interface ProviderHealthLite {
  id: string;
  label: string;
  status: 'ready' | 'unhealthy' | 'unverified' | 'no-key' | 'dropped';
  reason?: string;
  httpStatus?: number;
  latencyMs?: number;
  modalities: string[];
}

export interface WarmupStateLite {
  status: 'warming' | 'ready' | 'degraded' | 'down';
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  summary: { total: number; ready: number; unhealthy: number; unverified: number; noKey: number; dropped: number };
  providers: ProviderHealthLite[];
}

interface ModelAgentStore {
  state: WarmupStateLite | null;
  loaded: boolean;
  fetching: boolean;
  /** Fetch the warm-up state; self-schedules a re-poll while status is 'warming'. */
  fetchStatus: () => Promise<void>;
  /** Retry ALL providers (no id) or ONE (the per-provider blip retry), then refresh. */
  retry: (providerId?: string) => Promise<void>;
}

export const useModelAgentStore = create<ModelAgentStore>((set, get) => ({
  state: null,
  loaded: false,
  fetching: false,
  fetchStatus: async () => {
    if (get().fetching) return;
    set({ fetching: true });
    try {
      const res = await fetch('/api/model-agent/status');
      const state = (await res.json()) as WarmupStateLite;
      set({ state, loaded: true, fetching: false });
      // Keep polling until it settles (warm-up is ~1s; this stops as soon as it's not 'warming').
      if (state.status === 'warming') {
        setTimeout(() => void get().fetchStatus(), 1200);
      }
    } catch {
      set({ fetching: false });
    }
  },
  retry: async (providerId) => {
    try {
      await fetch('/api/model-agent/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerId ? { provider: providerId } : {}),
      });
    } catch {
      /* non-fatal — the refresh below re-reads whatever state exists. */
    }
    await get().fetchStatus();
  },
}));

/** READY = warmed and something reachable (a down provider is fine — reported, not fatal). */
export const useModelAgentReady = (): boolean =>
  useModelAgentStore((s) => s.state != null && s.state.status !== 'warming' && s.state.status !== 'down');

/** BLOCKING = we KNOW it's still warming. Null/unknown → NOT blocking (optimistic; server warmed on
 *  boot). This is the ONLY condition the creative-section execution gate holds on. */
export const useModelAgentBlocking = (): boolean =>
  useModelAgentStore((s) => s.state?.status === 'warming');

/** Non-hook read of the blocking signal (for use inside event callbacks without re-render coupling). */
export function isModelAgentBlockingNow(): boolean {
  return useModelAgentStore.getState().state?.status === 'warming';
}
