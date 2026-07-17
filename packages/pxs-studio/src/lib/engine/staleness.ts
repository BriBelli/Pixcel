/**
 * STALENESS — the stale-while-revalidate policy for the living model registry.
 *
 * Brian's freshness concern, answered: a workflow must NEVER pay a live-traversal tax mid-turn.
 * So the rule is "serve now, refresh between":
 *
 *   1. The registry snapshot is ALWAYS served instantly (it's seeded, never empty — no cold start).
 *   2. If a record is older than its TTL, it is still served — AND a background refresh is queued
 *      for NEXT time. The user's turn never blocks on the network.
 *   3. Every asserted capability carries its `sourceRefreshedAt`, so the agent can say "as of <date>"
 *      and gracefully downgrade confidence when stale, rather than stalling (graceful-specialist).
 *
 * This file is pure policy (no I/O, no fetch). It decides WHAT is stale and by how much; the actual
 * background refresh worker (research the provider docs / models endpoint, reconcile the shard) is a
 * separate seam that consumes these signals. Kept pure so it's trivially testable and deterministic.
 */

/** Default freshness window before a record is considered stale (Brian's "reinvoke 24h"). */
export const DEFAULT_TTL_HOURS = 24;

/** How confident the agent should be in a record, given its age. Drives graceful phrasing +
 *  whether a refresh is worth queuing. `fresh` → assert plainly; `aging`/`stale` → hedge + refresh;
 *  `unknown` → no stamp at all (never verified) — reason, but flag it as unconfirmed. */
export type Freshness = 'fresh' | 'aging' | 'stale' | 'unknown';

export interface StalenessVerdict {
  freshness: Freshness;
  /** Age in hours (null when there's no stamp to measure). */
  ageHours: number | null;
  /** Should the background refresh worker be queued for this record? (stale or unknown). */
  shouldRefresh: boolean;
  /** A one-line, human/agent-readable "as of" note for graceful surfacing. */
  asOf: string;
}

/** Parse an ISO date (YYYY-MM-DD or full ISO) to epoch ms, or null if unparseable/absent. */
function toEpoch(iso: string | undefined | null): number | null {
  if (!iso || typeof iso !== 'string') return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * Judge a record's freshness against a TTL. `now` is injected (never `Date.now()` inline) so the
 * policy is deterministic and testable — callers pass the current epoch ms.
 *
 * Thresholds: < TTL → fresh · < 2×TTL → aging (serve, but queue a refresh) · ≥ 2×TTL → stale ·
 * no stamp → unknown (serve with a flag, and refresh). "aging" gives the background worker a head
 * start so records rarely reach hard-stale during real use.
 */
export function judgeFreshness(
  sourceRefreshedAt: string | undefined | null,
  now: number,
  ttlHours: number = DEFAULT_TTL_HOURS
): StalenessVerdict {
  const stamp = toEpoch(sourceRefreshedAt);
  if (stamp === null) {
    return { freshness: 'unknown', ageHours: null, shouldRefresh: true, asOf: 'freshness unverified' };
  }
  const ageHours = Math.max(0, (now - stamp) / 3_600_000);
  const asOf = `as of ${new Date(stamp).toISOString().slice(0, 10)}`;
  if (ageHours < ttlHours) return { freshness: 'fresh', ageHours, shouldRefresh: false, asOf };
  if (ageHours < ttlHours * 2) return { freshness: 'aging', ageHours, shouldRefresh: true, asOf };
  return { freshness: 'stale', ageHours, shouldRefresh: true, asOf };
}

/** Convenience: is this record due for a background refresh? (stale/aging/unknown → yes). */
export function isDueForRefresh(
  sourceRefreshedAt: string | undefined | null,
  now: number,
  ttlHours: number = DEFAULT_TTL_HOURS
): boolean {
  return judgeFreshness(sourceRefreshedAt, now, ttlHours).shouldRefresh;
}
