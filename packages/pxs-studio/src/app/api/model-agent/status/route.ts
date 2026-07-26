import { warmUp, getWarmupState, retryProvider } from '../../../../lib/agents/model-agent/warmup';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * THE MODEL-AGENT WARM-UP STATUS ENDPOINT — what the "warming up" UX + the readiness gate read.
 *
 * GET  → the current warm-up state (kicks the warm-up if it somehow hasn't started, so a first read is
 *        never empty). The client polls this while `status === 'warming'`, then stops.
 * POST → force a re-warm of ALL providers, or retry ONE (body `{ provider: "<id>" }`) — the per-provider
 *        "retry" for a transient blip vs a true outage.
 */
export async function GET() {
  const state = getWarmupState() ?? (await warmUp());
  return Response.json(state);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { provider?: string };
  if (typeof body.provider === 'string' && body.provider) {
    const health = await retryProvider(body.provider);
    if (!health) return Response.json({ error: `unknown provider: ${body.provider}` }, { status: 404 });
    return Response.json({ provider: health, state: getWarmupState() });
  }
  const state = await warmUp(true);
  return Response.json(state);
}
