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
1) a SHORT opener as plain text — one calm sentence, no fluff, no exclamation. Match it to the leg: on a CONSULTATION hand-off, invite the user to set up the pass (specs + references) and NEVER claim you're rendering; on a GENERATION turn, note what you're rendering.
2) call the \`plan_render\` tool with your render plan.

You OWN the image specs (the Operator handed only the brief):
- prompt: a rich, model-ready image prompt built from the brief (subject, style, scene, lighting, composition).
- needs: capability tags the model MUST have, chosen from: text_in_image, editing, multi_reference, photorealism, vector, high_resolution, fast, cheap. Only include what the brief truly requires (e.g. a photoreal brief → ["photorealism"]).
- aspectRatio: optional (e.g. "16:9" for a video-scene frame).
- count: how many takes (default 2).
- referenceRecommendation: 1–3 SHORT reference TYPES to attach for a precise result, tailored to the brief (e.g. "A character reference to keep the Camaro consistent", "A style reference for the era", "Start & end frames"). The exact reference COUNT the chosen model accepts is a fact supplied to you — never invent it.
- parts: on a CONSULTATION (guided) leg, break the brief into the image FORMULA — Subject, Action, Context, Composition, Style. For each part give: id (lowercase), label, a one-line guidance (what the part is for), a value pre-filled from the brief (empty if nothing to infer yet), and 3–5 SUGGESTED anchor chips tailored to THIS subject (e.g. for a Camaro's Style: "golden hour", "overcast", "kodachrome", "grainy 35mm"). The chips are suggestions the user taps or ignores — never a fixed menu. This is what the user shapes in the Prompt Builder before rendering.`;

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
      // The prompt FORMULA broken into parts — the structured consult the center Prompt Builder
      // renders. On a GUIDED consult, fill these: pre-fill each value from the brief, add one-line
      // guidance + 3–5 SUGGESTED anchor chips per part (the user taps or free-types more).
      parts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' }, // subject | action | context | composition | style
            label: { type: 'string' },
            guidance: { type: 'string' },
            value: { type: 'string' },
            chips: { type: 'array', items: { type: 'string' } },
          },
          required: ['id', 'label', 'value'],
          additionalProperties: false,
        },
      },
    },
    required: ['prompt'],
    additionalProperties: false,
  },
} as const;

/** The grounded reference-recommendation the agent surfaces (mirrors A2UIReferencesBlock). */
export interface ReferencesRecommendation {
  kind: 'references';
  /** Routes to the workspace Prompt Guide panel (slots-not-screens), not the chat scroll. */
  surface?: 'chat' | 'controls';
  modelLabel: string;
  maxReferences: number;
  supports: string[];
  recommend: string[];
  note?: string;
}

/** One formula part in the builder block (mirrors the store's BuilderPart). */
export interface ImageBuilderPart {
  id: string;
  label: string;
  guidance: string;
  value: string;
  chips: string[];
}

/** The STRUCTURED CONSULT the guided leg surfaces (mirrors A2UIBuilderBlock, PR-10a) — the center
 *  Prompt Builder. Replaces the prose consult + the standalone references card: the agent breaks the
 *  brief into the formula and folds in the model's reference facts; the user shapes it and hits Render. */
export interface ImageBuilderBlock {
  kind: 'builder';
  surface?: 'canvas';
  title: string;
  media: 'image' | 'video' | 'pixel' | 'anim';
  parts: ImageBuilderPart[];
  model?: { label: string; maxReferences: number; supports: string[] };
}

/** Events the Image agent streams (the route forwards / meters these). */
export type ImageAgentEvent =
  | { type: 'agent_start' }
  | { type: 'agent_text'; delta: string }
  | { type: 'agent_usage'; inputTokens: number; outputTokens: number }
  | { type: 'agent_a2ui'; block: ReferencesRecommendation | ImageBuilderBlock }
  | { type: 'gen_start' }
  | { type: 'image'; url: string; modelLabel: string; index: number }
  | { type: 'gen_error'; message: string }
  /** A gentle non-blocking heads-up (best-effort shortfall) — forwarded from the coordinator. */
  | { type: 'gen_notice'; message: string }
  | { type: 'gen_done'; costUsd: number };

/** Build the grounded capability highlights list from the Model agent's facts. Typed per-role
 *  limits (Gemini-3-style) render as "up to 6 object · 5 character · 3 style"; otherwise the flat pool. */
function capabilityHighlights(f: ModelCapabilityFacts): string[] {
  const rl = f.referenceLimits;
  const refLine = rl
    ? `Up to ${rl.object} object${rl.character ? ` · ${rl.character} character` : ''}${rl.style ? ` · ${rl.style} style` : ''} references`
    : `Holds up to ${f.maxReferenceImages} reference image${f.maxReferenceImages === 1 ? '' : 's'}`;
  const out: string[] = [refLine];
  if (f.styleTransfer) out.push('Style-transfer variants');
  if (f.multiReference) out.push('Multi-image compositing');
  if (f.supportsEditing) out.push('Editing / inpaint');
  return out;
}

/** The default image formula skeleton — the SAFETY NET when the model underfills `parts`. Structural
 *  (the formula, not creative content); values/chips stay minimal so the agent/user fills them. Agent-
 *  emitted parts always win. Per-media parts (video/pixel/anim) land in PR-10f. */
function defaultImageParts(frame: EpistemicFrame): ImageBuilderPart[] {
  const subject = (frame.subject || frame.goal || '').trim();
  return [
    { id: 'subject', label: 'Subject', guidance: 'The main focal point — be specific about materials and texture.', value: subject, chips: [] },
    { id: 'action', label: 'Action', guidance: 'What the subject is doing — pose, stance, expression.', value: '', chips: [] },
    { id: 'context', label: 'Context', guidance: 'The environment and framing — say what you want, not what you don\'t.', value: '', chips: [] },
    { id: 'composition', label: 'Composition', guidance: 'Shot type, angle, lens, and depth of field.', value: '', chips: [] },
    { id: 'style', label: 'Style', guidance: 'Lighting, palette, mood, and medium.', value: '', chips: [] },
  ];
}

/** Validate agent-emitted formula parts; fall back to the default skeleton when empty/malformed. */
function normalizeBuilderParts(raw: unknown, frame: EpistemicFrame): ImageBuilderPart[] {
  const parts = Array.isArray(raw)
    ? raw
        .map((p): ImageBuilderPart | null => {
          if (!p || typeof p !== 'object') return null;
          const o = p as Record<string, unknown>;
          const id = typeof o.id === 'string' ? o.id.trim() : '';
          const label = typeof o.label === 'string' ? o.label.trim() : '';
          if (!id || !label) return null;
          return {
            id,
            label,
            guidance: typeof o.guidance === 'string' ? o.guidance.trim() : '',
            value: typeof o.value === 'string' ? o.value.trim() : '',
            chips: Array.isArray(o.chips)
              ? o.chips.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim()).slice(0, 6)
              : [],
          };
        })
        .filter((p): p is ImageBuilderPart => p !== null)
    : [];
  return parts.length > 0 ? parts : defaultImageParts(frame);
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

  const instruction = typeof turn.userMessage === 'string' ? turn.userMessage.trim() : '';
  const refCount = turn.references?.length ?? 0;
  // A workspace follow-up is an instruction OR attached references (either means "iterate", not
  // "first anchor") — so skip re-emitting the reference recommendation.
  const followUp = instruction.length > 0 || refCount > 0;

  // 1) The Image agent's brain: brief (+ any follow-up) → render plan (opener text + plan_render
  //    tool call). Its craft (plan-then-generate, reference workflows, prompt formulas) is skills.
  let plan: { prompt?: unknown; needs?: unknown; aspectRatio?: unknown; count?: unknown; referenceRecommendation?: unknown; parts?: unknown } = {};
  try {
    const client = new Anthropic();
    let userContent: string;
    if (!followUp) {
      userContent =
        `BRIEF (verified — start at Decide):\n${JSON.stringify(frame)}\n\n` +
        `This is the CONSULTATION (guided) leg: do NOT render — no images are generated now. Your opener is ONE ` +
        `calm sentence (e.g. "Let's shape this — I've laid out the parts; tune them and hit Render"), never ` +
        `claiming you're rendering and NOT a long list of specs (the parts ARE the specs). In plan_render, fill ` +
        `\`parts\` (the image FORMULA — Subject/Action/Context/Composition/Style, each with guidance + a value ` +
        `pre-filled from the brief + 3–5 suggested chips) plus prompt + needs so the reference facts are grounded. ` +
        `The user shapes the parts in the Prompt Builder and commits later.`;
    } else {
      const parts = [
        `BRIEF (verified):\n${JSON.stringify(frame)}`,
        `This is a RENDER turn — you ARE generating now. Your opener is ONE short sentence noting what you're rendering (e.g. "Rendering your Camaro now."). Do NOT ask the user to "set up the pass", "shape the parts", or attach references — that already happened; just render.`,
      ];
      if (instruction) parts.push(`The user shaped this in the Prompt Builder — render EXACTLY this, it is the final prompt:\n${instruction}`);
      if (refCount > 0)
        parts.push(
          `The user attached ${refCount} reference image${refCount === 1 ? '' : 's'} — plan to USE them (compose/edit from them; keep the subject consistent). Include "multi_reference" in needs.`
        );
      userContent = parts.join('\n\n');
    }
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
  // Attached references only matter if we route to a model that can consume them → force the
  // capability so Gate 1 picks a ref-capable model (e.g. nano-banana), never a single-image one.
  if (refCount > 0 && !needs.includes('multi_reference')) needs.push('multi_reference');
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
    // The STRUCTURED CONSULT (PR-10a): break the brief into the formula parts + fold in the model's
    // reference facts → the center Prompt Builder. DETERMINISTIC — if the model underfills `parts`,
    // fall back to a default image skeleton so the builder is never broken (same guard as the
    // Operator's staged question). The agent owns the content; this is only a safety net.
    const parts = normalizeBuilderParts(plan.parts, frame);
    const subject = (frame.subject || frame.goal || 'the subject').trim();
    yield {
      type: 'agent_a2ui',
      block: {
        kind: 'builder',
        surface: 'canvas',
        title: `Shaping · ${subject}`,
        media: frame.medium === 'video' ? 'video' : 'image',
        parts,
        model: facts
          ? { label: facts.modelLabel, maxReferences: facts.maxReferenceImages, supports: capabilityHighlights(facts) }
          : undefined,
      },
    };
  } catch (err) {
    console.warn('[image-agent] capability lookup failed (skipping recommendation):', err);
  }

  // REFERENCE-FIRST: a GUIDED hand-off's first leg is a CONSULTATION — never spend on a render. The
  // user commits later (attaches refs / says generate) in the workspace, which routes to
  // /api/image-agent as a follow-up (followUp === true) and generates then. A 'quick' transfer skips
  // this by arriving WITH an instruction (followUp === true from the start), so it renders now.
  if (!followUp) {
    yield { type: 'gen_done', costUsd: 0 };
    return;
  }

  // 3) Generate — coordinateImage consults the Model agent for selection, then dispatches. Only
  //    NOW does the "Generating…" state turn on (gen_start) — the consult leg above never reaches here.
  yield { type: 'gen_start' };
  let cost = 0;
  for await (const ev of coordinateImage(req, { maxCostUsd: frame.budgetUsd })) {
    if (ev.type === 'tile') {
      yield { type: 'image', url: ev.tile.image.url, modelLabel: ev.tile.modelLabel, index: ev.totalSoFar - 1 };
    } else if (ev.type === 'done') {
      cost = ev.costUsd;
    } else if (ev.type === 'notice') {
      yield { type: 'gen_notice', message: ev.message };
    } else if (ev.type === 'error' || ev.type === 'model_error') {
      yield { type: 'gen_error', message: 'message' in ev ? ev.message : `model error: ${ev.reason}` };
    }
  }
  yield { type: 'gen_done', costUsd: cost };
}
