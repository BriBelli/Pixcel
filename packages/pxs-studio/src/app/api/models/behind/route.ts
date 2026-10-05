import { getDb } from '../../../../lib/db';
import { acknowledge, readWatchState, runWatch, unacknowledged } from '../../../../lib/agents/model-watch';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * GET /api/models/behind — what newer models exist that we are not routing to.
 *
 * The succession sweep was fixed to tell the truth and still reported into a JSON response nobody
 * read. This is the surface: cheap, cached (it serves the last scheduled check rather than running
 * one), and shaped for a notice.
 *
 * `?check=1` forces a fresh check. Still cheap — provider model listings are plain HTTP GETs — but
 * it is a deliberate action rather than something a page load triggers.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    const db = await getDb();
    const state = url.searchParams.get('check') === '1' ? await runWatch(db) : await readWatchState(db);
    const behind = unacknowledged(state);
    return Response.json(
      {
        behind,
        // Everything found, including dismissed — so a "show all" view does not need a second call.
        all: state?.behind ?? [],
        checkedAt: state?.checkedAt ?? null,
        // "We could not look" must never read as "nothing is newer". That conflation is the bug
        // that kept this silent for weeks.
        failedHosts: state?.failedHosts ?? [],
        neverRun: state == null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to read the model watch.' }, { status: 500 });
  }
}

/**
 * POST /api/models/behind — `{ acknowledge: '<successorId>' }`.
 *
 * Dismisses ONE finding. Scoped to that successor on purpose: a newer model than the one dismissed
 * is news again, where a blanket "stop telling me" would silence the next real one too.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { acknowledge?: string };
  const id = (body.acknowledge ?? '').trim();
  if (!id) return Response.json({ error: 'acknowledge: <successorId> is required.' }, { status: 400 });
  try {
    const db = await getDb();
    const state = await acknowledge(db, id);
    return Response.json({ ok: true, behind: unacknowledged(state) });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to acknowledge.' }, { status: 500 });
  }
}
