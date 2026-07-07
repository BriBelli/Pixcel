/**
 * The IMAGE AGENT — the image-workflow specialist.
 *
 * The Operator TRANSFERS an Epistemic Frame here (state-injection: verified brief → start at
 * DECIDE, don't re-Orient). The Image agent OWNS all image specs: it crafts the model-ready prompt
 * and derives the RoutingRequest (needs / aspectRatio / count / references), then invokes the
 * coordinator (which consults the Model agent for selection) and streams the render.
 *
 * The Operator hands the FRAME ONLY — no prompt, no routing specs. Dispatch (the small/quick path)
 * does NOT come here; it stays Operator-inline.
 */

import Anthropic from '@anthropic-ai/sdk';
import { coordinateImage } from '../engine/coordinator';
import type { Capability } from '../engine/model-registry';
import type { RoutingRequest } from '../engine/routing';
import { assertFrameBudget, type EpistemicFrame } from './epistemic-frame';

const MODEL = 'claude-opus-4-8';

/** The capability tags Gate 1 understands (filter the agent's `needs` to these). */
const VALID_CAPS: readonly Capability[] = [
  'text_in_image', 'editing', 'multi_reference', 'photorealism', 'vector', 'high_resolution', 'fast', 'cheap',
];

const IMAGE_AGENT_SYSTEM = `You are the IMAGE AGENT — a specialist that turns a handed-off creative brief into a concrete image render plan. You have ALREADY been oriented: the brief is VERIFIED, do not re-question it — start at DECIDE.

Respond in TWO parts, in order:
1) a SHORT opener as plain text — one calm sentence noting what you're rendering (no fluff, no exclamation).
2) call the \`plan_render\` tool with your render plan.

You OWN the image specs (the Operator handed only the brief):
- prompt: a rich, model-ready image prompt built from the brief (subject, style, scene, lighting, composition).
- needs: capability tags the model MUST have, chosen from: text_in_image, editing, multi_reference, photorealism, vector, high_resolution, fast, cheap. Only include what the brief truly requires (e.g. a photoreal brief → ["photorealism"]).
- aspectRatio: optional (e.g. "16:9" for a video-scene frame).
- count: how many takes (default 2).`;

const PLAN_TOOL = {
  name: 'plan_render',
  description: 'The concrete render plan derived from the brief.',
  input_schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      needs: { type: 'array', items: { type: 'string' } },
      aspectRatio: { type: 'string' },
      count: { type: 'number' },
    },
    required: ['prompt'],
    additionalProperties: false,
  },
} as const;

/** Events the Image agent streams (the route forwards / meters these). */
export type ImageAgentEvent =
  | { type: 'agent_start' }
  | { type: 'agent_text'; delta: string }
  | { type: 'agent_usage'; inputTokens: number; outputTokens: number }
  | { type: 'image'; url: string; modelLabel: string; index: number }
  | { type: 'gen_error'; message: string }
  | { type: 'gen_done'; costUsd: number };

/**
 * Run the Image agent's leg for a transferred Epistemic Frame. Yields its opener, then the
 * generated tiles. Never throws — failures surface as gen_error.
 */
export async function* runImageAgent(frame: EpistemicFrame): AsyncIterable<ImageAgentEvent> {
  assertFrameBudget(frame);
  yield { type: 'agent_start' };

  // 1) The Image agent's brain: brief → render plan (opener text + plan_render tool call).
  let plan: { prompt?: unknown; needs?: unknown; aspectRatio?: unknown; count?: unknown } = {};
  try {
    const client = new Anthropic();
    const params = {
      model: MODEL,
      max_tokens: 1200,
      thinking: { type: 'adaptive', display: 'summarized' },
      system: IMAGE_AGENT_SYSTEM,
      tools: [PLAN_TOOL],
      messages: [{ role: 'user' as const, content: `BRIEF (verified — start at Decide):\n${JSON.stringify(frame)}` }],
    };
    const stream = client.messages.stream(params as any);
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta' && event.delta.text) {
        yield { type: 'agent_text', delta: event.delta.text };
      }
    }
    const final = await stream.finalMessage();
    yield {
      type: 'agent_usage',
      inputTokens: (final as { usage?: { input_tokens?: number } })?.usage?.input_tokens ?? 0,
      outputTokens: (final as { usage?: { output_tokens?: number } })?.usage?.output_tokens ?? 0,
    };
    const tool = ((final?.content ?? []) as Array<{ type: string; name?: string; input?: unknown }>)
      .find((b) => b.type === 'tool_use' && b.name === 'plan_render');
    plan = (tool?.input as typeof plan) ?? {};
  } catch (err) {
    yield { type: 'gen_error', message: err instanceof Error ? err.message : 'Image agent failed to plan' };
    yield { type: 'gen_done', costUsd: 0 };
    return;
  }

  // 2) Derive the RoutingRequest — the Image agent OWNS these specs; Gate 1 activates from them.
  const needs = Array.isArray(plan.needs)
    ? (plan.needs.filter((n): n is Capability => typeof n === 'string' && (VALID_CAPS as readonly string[]).includes(n)))
    : [];
  const req: RoutingRequest = {
    intent: typeof plan.prompt === 'string' && plan.prompt.trim() ? plan.prompt.trim() : frame.goal,
    needs,
    aspectRatio: typeof plan.aspectRatio === 'string' ? plan.aspectRatio : undefined,
    count: typeof plan.count === 'number' && plan.count > 0 ? Math.min(8, Math.floor(plan.count)) : frame.count,
    references: frame.assetRefs,
    budgetUsd: frame.budgetUsd,
  };

  // 3) Generate — coordinateImage consults the Model agent for selection, then dispatches.
  let cost = 0;
  for await (const ev of coordinateImage(req, { maxCostUsd: frame.budgetUsd })) {
    if (ev.type === 'tile') {
      yield { type: 'image', url: ev.tile.image.url, modelLabel: ev.tile.modelLabel, index: ev.totalSoFar - 1 };
    } else if (ev.type === 'done') {
      cost = ev.costUsd;
    } else if (ev.type === 'error' || ev.type === 'model_error') {
      yield { type: 'gen_error', message: 'message' in ev ? ev.message : `model error: ${ev.reason}` };
    }
  }
  yield { type: 'gen_done', costUsd: cost };
}
