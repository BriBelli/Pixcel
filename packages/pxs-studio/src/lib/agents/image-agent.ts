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
import { describeModelCapabilities, type ModelCapabilityFacts } from './model-agent';
import { imageAgentSkills } from './skills';
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
- count: how many takes (default 2).
- referenceRecommendation: 1–3 SHORT reference TYPES to attach for a precise result, tailored to the brief (e.g. "A character reference to keep the Camaro consistent", "A style reference for the era", "Start & end frames"). The exact reference COUNT the chosen model accepts is a fact supplied to you — never invent it.`;

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
      referenceRecommendation: { type: 'array', items: { type: 'string' } },
    },
    required: ['prompt'],
    additionalProperties: false,
  },
} as const;

/** The grounded reference-recommendation the agent surfaces (mirrors A2UIReferencesBlock). */
export interface ReferencesRecommendation {
  kind: 'references';
  modelLabel: string;
  maxReferences: number;
  supports: string[];
  recommend: string[];
  note?: string;
}

/** Events the Image agent streams (the route forwards / meters these). */
export type ImageAgentEvent =
  | { type: 'agent_start' }
  | { type: 'agent_text'; delta: string }
  | { type: 'agent_usage'; inputTokens: number; outputTokens: number }
  | { type: 'agent_a2ui'; block: ReferencesRecommendation }
  | { type: 'image'; url: string; modelLabel: string; index: number }
  | { type: 'gen_error'; message: string }
  | { type: 'gen_done'; costUsd: number };

/** Build the grounded capability highlights list from the Model agent's facts. */
function capabilityHighlights(f: ModelCapabilityFacts): string[] {
  const out: string[] = [`Holds up to ${f.maxReferenceImages} reference image${f.maxReferenceImages === 1 ? '' : 's'}`];
  if (f.styleTransfer) out.push('Style-transfer variants');
  if (f.multiReference) out.push('Multi-image compositing');
  if (f.supportsEditing) out.push('Editing / inpaint');
  return out;
}

/** A follow-up turn INSIDE the Image workspace (Option A — the workspace talks straight to the
 *  Image agent, no Operator re-diagnosis). Absent on the first leg (the transfer). */
export interface ImageAgentTurn {
  /** The user's workspace instruction (e.g. "make it dusk", "wider shot", "more variations"). */
  userMessage?: string;
  /** Prior workspace turns for coherence. */
  history?: { role: 'user' | 'assistant'; content: string }[];
  /** Reference images (data/https URLs) the user attached this turn — override the frame's. */
  references?: string[];
}

/**
 * Run the Image agent's leg. On the FIRST leg (a transfer) pass just the frame — it renders an
 * anchor + a grounded reference recommendation. On a workspace FOLLOW-UP pass the frame + `turn`
 * (the user's instruction + attached references) and it iterates directly. Never throws — failures
 * surface as gen_error.
 */
export async function* runImageAgent(frame: EpistemicFrame, turn: ImageAgentTurn = {}): AsyncIterable<ImageAgentEvent> {
  assertFrameBudget(frame);
  yield { type: 'agent_start' };

  const followUp = typeof turn.userMessage === 'string' && turn.userMessage.trim().length > 0;

  // 1) The Image agent's brain: brief (+ any follow-up) → render plan (opener text + plan_render
  //    tool call). Its craft (plan-then-generate, reference workflows, prompt formulas) is skills.
  let plan: { prompt?: unknown; needs?: unknown; aspectRatio?: unknown; count?: unknown; referenceRecommendation?: unknown } = {};
  try {
    const client = new Anthropic();
    const userContent = followUp
      ? `BRIEF (verified):\n${JSON.stringify(frame)}\n\nFOLLOW-UP INSTRUCTION FROM THE USER — apply it to the render plan:\n${turn.userMessage!.trim()}`
      : `BRIEF (verified — start at Decide):\n${JSON.stringify(frame)}`;
    const params = {
      model: MODEL,
      max_tokens: 1200,
      thinking: { type: 'adaptive', display: 'summarized' },
      system: IMAGE_AGENT_SYSTEM + imageAgentSkills(),
      tools: [PLAN_TOOL],
      messages: [
        ...(turn.history ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userContent },
      ],
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
    references: turn.references && turn.references.length > 0 ? turn.references : frame.assetRefs,
    budgetUsd: frame.budgetUsd,
  };

  // 2b) Consult the MODEL AGENT for the capability TRUTH of the model that will serve this request
  //     (reference count, style transfer, editing) and surface a grounded reference recommendation.
  //     This is the "attach up to N — and here's support you didn't know about" moment; it never
  //     invents a limit. Best-effort — a lookup miss just skips the recommendation, never blocks gen.
  //     Only on the FIRST leg (the transfer) — don't repeat the recommendation on every follow-up.
  if (!followUp) try {
    const facts = await describeModelCapabilities(req);
    if (facts) {
      const recommend = (Array.isArray(plan.referenceRecommendation)
        ? plan.referenceRecommendation.filter((r): r is string => typeof r === 'string' && r.trim().length > 0).map((r) => r.trim())
        : []
      ).slice(0, Math.max(1, facts.maxReferenceImages));
      if (recommend.length > 0) {
        yield {
          type: 'agent_a2ui',
          block: {
            kind: 'references',
            modelLabel: facts.modelLabel,
            maxReferences: facts.maxReferenceImages,
            supports: capabilityHighlights(facts),
            recommend,
            note: `To make the next pass precise, attach up to ${facts.maxReferenceImages} reference image${facts.maxReferenceImages === 1 ? '' : 's'}.`,
          },
        };
      }
    }
  } catch (err) {
    console.warn('[image-agent] capability lookup failed (skipping recommendation):', err);
  }

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
