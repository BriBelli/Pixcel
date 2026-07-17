import { getDb } from '../../../../lib/db';
import { liveRefreshDeps } from '../../../../lib/engine/model-refresh';
import { refreshRegistry, loadRefreshState } from '../../../../lib/agents/model-refresh-runner';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE MODEL-REGISTRY REFRESH ENDPOINT.
 *
 * GET  → what the Model agent currently KNOWS (the persisted per-provider refresh state) — the
 *        living overlay: last checked, confirmed models, discovered candidates, review flags.
 * POST → force a refresh pass now (a cron or a manual "check for new models"). Real network. This is
 *        the out-of-band worker made callable; the hot path triggers the same engine lazily.
 */
export async function GET() {
  const db = await getDb();
  const state = await loadRefreshState(db);
  return Response.json({ providers: Array.from(state.values()) });
}

export async function POST() {
  const db = await getDb();
  try {
    const summary = await refreshRegistry(db, liveRefreshDeps(Date.now()));
    return Response.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'refresh failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
