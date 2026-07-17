import { getDb } from '../../../../lib/db';
import { runMaintenance, liveMaintenanceDeps } from '../../../../lib/agents/model-maintenance';
import { loadCards } from '../../../../lib/agents/live-catalog';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * THE MAINTENANCE ENDPOINT — closes the loop (a DELIBERATE, metered op; LLM spend).
 *
 * GET  → the living model cards (discovered/researched models + seed overrides/retirements).
 * POST → run a maintenance pass: research un-carded discoveries into routable records, and age /
 *        retire / reset ghosts on repeated-miss evidence. Cron or manual "process discoveries".
 */
export async function GET() {
  const db = await getDb();
  const cards = await loadCards(db);
  return Response.json({ cards: Array.from(cards.values()) });
}

export async function POST() {
  const db = await getDb();
  try {
    const summary = await runMaintenance(db, liveMaintenanceDeps(Date.now()));
    return Response.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'maintenance failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
