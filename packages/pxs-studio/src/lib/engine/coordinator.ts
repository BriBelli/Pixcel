/**
 * The coordinator — orchestrates a full image generation: route → dispatch → stream.
 *
 * This is the thin conductor that ties the brain (routing.ts) to the executors
 * (adapters). It does NOT generate; it decides the fan-out, dispatches each routed
 * model through its provider adapter, and emits a single unified event stream the
 * chat layer renders as an A2UI gallery. Cost is accumulated and hard-capped.
 *
 * Importing this module also registers all provider adapters (via ./adapters).
 */

import './adapters';
import { getModel } from './model-registry';
import { getExecutor } from './executor';
import { selectModels } from '../agents/model-agent';
import { type RoutingRequest, type RoutingDecision } from './routing';
import type { GenImage } from './executor';

/** A tile in the coordinated gallery — one image + which model made it. */
export interface GalleryTile {
  modelId: string;
  modelLabel: string;
  image: GenImage;
}

/** Events the coordinator streams while curating + running the workflow. */
export type CoordEvent =
  | { type: 'routed'; decision: RoutingDecision }
  | { type: 'model_start'; modelId: string; modelLabel: string; n: number }
  | { type: 'tile'; tile: GalleryTile; totalSoFar: number }
  | { type: 'model_error'; modelId: string; reason: string }
  /** A gentle, non-blocking heads-up (best-effort specialist): we delivered less than the ask
   *  (a model capped the batch, one failed, budget trimmed). Never an error — the run still succeeds. */
  | { type: 'notice'; message: string }
  | { type: 'done'; tiles: GalleryTile[]; costUsd: number }
  | { type: 'error'; message: string };

/** A hard ceiling so a runaway fan-out can never overspend on one request. */
const DEFAULT_MAX_COST_USD = 2.0;

export interface CoordinateOptions {
  maxCostUsd?: number;
}

/**
 * Run a full image generation for a routing request, yielding events as the
 * workflow unfolds. Never throws — failures surface as `model_error` / `error`.
 */
export async function* coordinateImage(
  req: RoutingRequest,
  opts: CoordinateOptions = {}
): AsyncIterable<CoordEvent> {
  const maxCost = opts.maxCostUsd ?? DEFAULT_MAX_COST_USD;

  // Ask the MODEL AGENT for the model(s) + fan-out (it restricts to configured providers + ranks).
  let decision: RoutingDecision | null;
  try {
    decision = await selectModels(req);
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : 'Model selection failed' };
    return;
  }
  if (!decision) {
    yield { type: 'error', message: 'No configured image provider can satisfy this request.' };
    return;
  }
  yield { type: 'routed', decision };

  // Guard the whole fan-out against the ceiling up front — on the WORST-CASE (high) estimate,
  // so a fan-out whose max could blow the cap never starts.
  if (decision.estCostUsd[1] > maxCost) {
    yield { type: 'error', message: `Estimated cost up to $${decision.estCostUsd[1]} exceeds the $${maxCost.toFixed(2)} remaining budget.` };
    return;
  }

  const tiles: GalleryTile[] = [];
  let costUsd = 0;

  // Dispatch routed models sequentially (each model streams its own tiles in parallel).
  for (const routed of decision.fanout) {
    const model = getModel(routed.modelId);
    if (!model) continue;
    const executor = getExecutor(model.provider);
    if (!executor || !executor.isConfigured()) {
      yield { type: 'model_error', modelId: routed.modelId, reason: 'no_key' };
      continue;
    }

    yield { type: 'model_start', modelId: model.id, modelLabel: model.label, n: routed.n };

    try {
      for await (const ev of executor.generate({ modelId: model.id, prompt: req.intent, n: routed.n, aspectRatio: req.aspectRatio, references: req.references })) {
        if (ev.type === 'tile') {
          const tile: GalleryTile = { modelId: model.id, modelLabel: model.label, image: ev.image };
          tiles.push(tile);
          yield { type: 'tile', tile, totalSoFar: tiles.length };
        } else if (ev.type === 'done') {
          costUsd = Number((costUsd + ev.costUsd).toFixed(3));
          if (costUsd > maxCost) {
            yield { type: 'done', tiles, costUsd };
            return;
          }
        } else if (ev.type === 'error') {
          yield { type: 'model_error', modelId: model.id, reason: ev.reason };
        }
      }
    } catch (err) {
      yield { type: 'model_error', modelId: model.id, reason: err instanceof Error ? err.message : 'adapter crashed' };
    }
  }

  if (tiles.length === 0) {
    yield { type: 'error', message: 'No images were produced.' };
    return;
  }
  // Graceful specialist: if we delivered fewer than the ask (a model capped its batch, one failed,
  // or the cost ceiling trimmed the run), surface ONE gentle notice — never an error, the run stands.
  const want = Math.max(1, req.count);
  if (tiles.length < want) {
    yield { type: 'notice', message: `Rendered ${tiles.length} of ${want} — best effort (a model capped this batch or came up short).` };
  }
  yield { type: 'done', tiles, costUsd };
}
