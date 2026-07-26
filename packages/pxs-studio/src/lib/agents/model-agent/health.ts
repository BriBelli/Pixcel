/**
 * MODEL AGENT — provider healthchecks (the "warming up" probes).
 *
 * The Model agent is the backbone; before Pixcel is usable in a creative section, the agent WAKES UP
 * and WARMS UP — it pings every keyed provider to confirm a live, healthy API connection so there are
 * no surprises at prompt time. A provider that fails is NOT fatal (Brian's rule): the agent reports it
 * clearly (status + a short HTTP reason for hover) and the surface can offer a per-provider retry.
 *
 * A probe is a CHEAP, authed GET (usually the provider's list-models endpoint) that returns 2xx when
 * the key is valid + the API reachable. NO generation, NO spend — this is a connection check only.
 * Providers without a free GET probe are reported 'unverified' (keyed, but not pinged) — never a false
 * 'ready'. Providers the roster has 'dropped' are reported 'dropped' and not pinged.
 */

import {
  PROVIDERS,
  providerKeyPresent,
  type Provider,
  type Modality,
} from '../../engine/provider-roster';

export type HealthStatus = 'ready' | 'unhealthy' | 'unverified' | 'no-key' | 'dropped';

export interface ProviderHealth {
  id: string;
  label: string;
  envKey: string;
  modalities: Modality[];
  keyPresent: boolean;
  status: HealthStatus;
  /** HTTP status from the probe (present when a probe actually ran). */
  httpStatus?: number;
  /** Short human reason — surfaced on hover for a not-ready provider. */
  reason?: string;
  /** Probe round-trip in ms (present when a probe ran). */
  latencyMs?: number;
  checkedAt: string;
}

/** A cheap authed GET that 2xx's when the key is valid + API reachable. No spend. */
interface Probe {
  url: (key: string) => string;
  headers: (key: string) => Record<string, string>;
}

/**
 * Per-provider probes. Only providers with a known FREE list/health endpoint are here; the rest are
 * reported 'unverified' (keyed, reachability not asserted) rather than faking a green check.
 */
const PROBES: Record<string, Probe> = {
  // Google Gemini — key rides as a query param on the models list.
  google: {
    url: (k) => `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`,
    headers: () => ({}),
  },
  // OpenAI — Bearer on the models list.
  openai: {
    url: () => 'https://api.openai.com/v1/models',
    headers: (k) => ({ Authorization: `Bearer ${k}` }),
  },
  // xAI — OpenAI-compatible models list.
  xai: {
    url: () => 'https://api.x.ai/v1/models',
    headers: (k) => ({ Authorization: `Bearer ${k}` }),
  },
  // Replicate — Bearer on the models list.
  replicate: {
    url: () => 'https://api.replicate.com/v1/models',
    headers: (k) => ({ Authorization: `Bearer ${k}` }),
  },
  // Anthropic — the agents' brains. x-api-key + version header.
  anthropic: {
    url: () => 'https://api.anthropic.com/v1/models',
    headers: (k) => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
  },
};

/** Ping one provider. Never throws — always resolves to a ProviderHealth the agent can report. */
export async function checkProvider(p: Provider, timeoutMs = 8000): Promise<ProviderHealth> {
  const base = {
    id: p.id,
    label: p.label,
    envKey: p.envKey,
    modalities: p.modalities,
    checkedAt: new Date().toISOString(),
  };

  if (p.status === 'dropped') {
    return { ...base, keyPresent: providerKeyPresent(p), status: 'dropped', reason: 'Dropped in the roster (reversible)' };
  }

  const keyPresent = providerKeyPresent(p);
  if (!keyPresent) {
    return { ...base, keyPresent, status: 'no-key', reason: `${p.envKey} is not set` };
  }

  const probe = PROBES[p.id];
  if (!probe) {
    return { ...base, keyPresent, status: 'unverified', reason: 'No free healthcheck endpoint — key present, connection not pinged' };
  }

  const key = process.env[p.envKey] as string;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(probe.url(key), { method: 'GET', headers: probe.headers(key), signal: ctrl.signal });
    const latencyMs = Date.now() - t0;
    if (res.ok) return { ...base, keyPresent, status: 'ready', httpStatus: res.status, latencyMs };
    // A short, hover-friendly reason. (Body intentionally not surfaced — could carry provider PII.)
    return {
      ...base,
      keyPresent,
      status: 'unhealthy',
      httpStatus: res.status,
      reason: `HTTP ${res.status} ${res.statusText}`.trim(),
      latencyMs,
    };
  } catch (e) {
    const err = e as Error;
    return {
      ...base,
      keyPresent,
      status: 'unhealthy',
      reason: err.name === 'AbortError' ? `Timed out after ${timeoutMs}ms` : err.message || 'Connection failed',
      latencyMs: Date.now() - t0,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Ping every provider in the roster, concurrently. Dropped/no-key/unverified resolve instantly. */
export async function checkAllProviders(): Promise<ProviderHealth[]> {
  return Promise.all(PROVIDERS.map((p) => checkProvider(p)));
}
