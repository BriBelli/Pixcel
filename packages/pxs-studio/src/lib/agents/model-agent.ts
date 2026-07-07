/**
 * The MODEL AGENT — the cross-cutting "everything models" specialist.
 *
 * Owns model SELECTION + config + fan-out. Invoked BY a specialist (the Image agent), never by the
 * route handler. Today it's an in-process function wrapping the two-gate router + the registry;
 * the interface is written AS IF remote (async, request→decision) so the A2A messaging seam can
 * slot in later without changing callers. Later it also drives the Prompt Guide's model-aware
 * part scoring.
 */

import './../engine/adapters'; // register provider adapters (readyProviders reflects them)
import { IMAGE_MODELS } from '../engine/model-registry';
import { readyProviders } from '../engine/executor';
import { route, type RoutingRequest, type RoutingDecision } from '../engine/routing';

/**
 * Select the model(s) + fan-out for a request. Restricts to providers that actually have a
 * configured adapter (never routes to a dead provider), then runs the two-gate router. Returns
 * null when no configured provider can satisfy the request.
 */
export async function selectModels(req: RoutingRequest): Promise<RoutingDecision | null> {
  const ready = new Set(readyProviders());
  const catalog = IMAGE_MODELS.filter((m) => ready.has(m.provider));
  if (catalog.length === 0) return null;

  let decision = await route(req, { catalog });
  if (!decision && req.needs.length > 0) {
    // Strict needs left NO survivor — with today's small catalog that's usually an under-advertised
    // capability, not a real "impossible" request. Retry best-effort without the hard needs (Gate 1
    // still applies for aspect/edit/key/budget), and log it. Grows out of relevance as the catalog fills.
    console.warn('[model-agent] no model matched needs', req.needs, '— retrying best-effort');
    decision = await route({ ...req, needs: [] }, { catalog });
  }
  return decision;
}
