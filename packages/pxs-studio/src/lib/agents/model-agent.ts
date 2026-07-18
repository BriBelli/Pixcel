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
import { getModelFormula, getDefaultImageModel, IMAGE_MODELS, type ImageModel, type PromptFormula } from '../engine/model-registry';
import { readyProviders } from '../engine/executor';
import { route, type RoutingRequest, type RoutingDecision } from '../engine/routing';
import { getLiveCatalog } from './live-catalog';
import { getDb } from '../db';

/**
 * The LIVE catalog — seed + persisted freshness + discovered/retired model cards (2d). This is what
 * makes the self-maintaining registry actually FEED routing: a discovered+researched model becomes
 * routable, a retired ghost drops out. Guarded — any failure falls back to the plain seed, so the
 * living layer can never dead-end selection.
 */
async function loadCatalog(): Promise<ImageModel[]> {
  try {
    return await getLiveCatalog(await getDb());
  } catch {
    return IMAGE_MODELS;
  }
}

/**
 * Select the model(s) + fan-out for a request. Restricts to providers that actually have a
 * configured adapter (never routes to a dead provider), then runs the two-gate router. Returns
 * null when no configured provider can satisfy the request.
 */
export async function selectModels(
  req: RoutingRequest,
  opts: { catalog?: ImageModel[] } = {}
): Promise<RoutingDecision | null> {
  const all = opts.catalog ?? (await loadCatalog());
  const ready = new Set(readyProviders());
  const catalog = all.filter((m) => ready.has(m.provider));
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

/** Capability facts for a KNOWN model (synchronous — no routing). */
export function factsForModel(model: ImageModel): ModelCapabilityFacts {
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

export async function describeModelCapabilities(req: RoutingRequest): Promise<ModelCapabilityFacts | null> {
  // Load the live catalog ONCE and both select from it and look the chosen model up in it — so a
  // DISCOVERED model surfaces real facts (getModel reads only the seed, which wouldn't have it).
  const catalog = await loadCatalog();
  const decision = await selectModels(req, { catalog });
  const model = decision ? catalog.find((m) => m.id === decision.primary.modelId) : null;
  if (!model) return null;
  return factsForModel(model);
}

/** Capability facts that NEVER dead-end: the routed model's if selection succeeds, else the default
 *  image model's. Used for the builder's reference facts so the References field is always complete —
 *  a transient router hang must not strip the "attach up to N" support the user relies on. */
export async function describeModelCapabilitiesOrDefault(req: RoutingRequest): Promise<ModelCapabilityFacts> {
  try {
    return (await describeModelCapabilities(req)) ?? factsForModel(getDefaultImageModel());
  } catch {
    return factsForModel(getDefaultImageModel());
  }
}
