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

    // THE MODEL WATCH — "are we behind?" on a timer rather than on app traffic.
    //
    // Its only trigger used to be the image-agent route, so the catalog's freshness depended on
    // someone generating an image. It sat eight days stale while OpenAI shipped two generations.
    // Asking a provider for its model list is an HTTP GET, so this costs essentially nothing and
    // can afford to run daily whether or not anyone is working. Research and doctrine — the parts
    // that actually spend — stay on their bounded, TTL-gated paths.
    const { startModelWatch } = await import('./lib/agents/model-watch');
    const { getDb } = await import('./lib/db');
    startModelWatch(() => getDb());
  } catch {
    /* non-fatal — the status endpoint will lazily warm on first read if this ever no-ops. */
  }
}
