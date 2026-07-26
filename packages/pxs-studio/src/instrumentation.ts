/**
 * Next.js instrumentation — runs ONCE on server boot.
 *
 * The Model agent is the backbone, so it WAKES UP the moment the server does: we kick a background
 * warm-up here (ping every keyed provider, prime the health state) so that by the time a user reaches
 * a creative section the agent is already ready. Fire-and-forget — boot is never blocked, and a failed
 * provider is data, not a crash (see `warmUp`). Node runtime only (the Edge runtime has no fs/env).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { warmUp, syncProviderKnowledge } = await import('./lib/agents/model-agent/warmup');
    // Refresh the durable knowledge shards from the roster/registry, then warm the live connections.
    syncProviderKnowledge();
    void warmUp();
  } catch {
    /* non-fatal — the status endpoint will lazily warm on first read if this ever no-ops. */
  }
}
