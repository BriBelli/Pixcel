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
import { getModel, getModelFormula, IMAGE_MODELS, type PromptFormula } from '../engine/model-registry';
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

/**
 * The capability TRUTH for the model that would serve `req` — read straight from the registry, the
 * source of truth (never guessed). The Image agent consults this before it recommends references, so
 * "attach up to N" is a fact (e.g. nano-banana = 3, not the user's assumed 5), and it can surface
 * support the user didn't ask for (style transfer, editing, multi-reference). See the
 * capability-lookup skill.
 */
export interface ModelCapabilityFacts {
  modelId: string;
  modelLabel: string;
  /** How many reference images the model actually accepts (the fact that validates "attach N"). */
  maxReferenceImages: number;
  supportsEditing: boolean;
  multiReference: boolean;
  /** Style-transfer / variant "blast" styles — strong style range or multi-reference compositing. */
  styleTransfer: boolean;
  /** Typed per-ROLE reference caps (object/character/style), when the model has separate pools
   *  (Gemini-3-style). Absent → the model uses one flat pool of `maxReferenceImages`. */
  referenceLimits?: { object: number; character: number; style: number };
  costPerImageUsd: [number, number];
  /** The model's documented PROMPT FORMULA (ordered, weighted parts) — what drives the builder's
   *  parts + the honest weighted score. The model's own if curated, else the generic default. */
  formula: PromptFormula;
}

export async function describeModelCapabilities(req: RoutingRequest): Promise<ModelCapabilityFacts | null> {
  const decision = await selectModels(req);
  const model = decision ? getModel(decision.primary.modelId) : null;
  if (!model) return null;
  return {
    modelId: model.id,
    modelLabel: model.label,
    maxReferenceImages: model.maxReferenceImages,
    supportsEditing: model.supportsEditing,
    multiReference: model.capabilities.includes('multi_reference'),
    styleTransfer: model.strengths.style_versatility >= 4 || model.capabilities.includes('multi_reference'),
    referenceLimits: model.referenceLimits,
    costPerImageUsd: model.costPerImageUsd,
    formula: getModelFormula(model.id),
  };
}
