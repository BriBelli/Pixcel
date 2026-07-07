/**
 * Pure, testable helpers for the chat-turn classify pass.
 *
 * Extracted verbatim from `app/api/chat-turn/route.ts` so the tolerant classify-JSON parser (the
 * riskiest logic) can be unit-tested under `node:test`. No React / Next / DOM — pure TS.
 */

/** Fallback quick-picks (used when the classify pass fails or returns nothing). Deliberately
 *  answer-shaped (things a user might tap in reply), never tool names or meta-instructions. */
export const STUB_SUGGESTIONS = [
  'Sleek and modern',
  'Chunky retro',
  'Cute cartoon',
];

/** An agent question rendered as an A2UI affordance (label + text-area + optional chips). */
export interface ClassifyQuestion {
  label: string;
  placeholder?: string;
  chips?: string[];
}

/**
 * The DETECTIVE's verdict. The primary agent classifies, then decides ONE action:
 *   • 'dispatch' — enough to run a workflow now → hand to the image workflow (which generates).
 *   • 'ask'      — genuinely blocked → ask ONE thing via the A2UI question affordance.
 *   • 'reply'    — just conversation → follow-up suggestions.
 */
/** The bounded "world view" the Operator hands a specialist on transfer (Epistemic Frame — the
 *  Localized Scope part; kept minimal for Slice 1). */
export interface TransferFrame {
  goal: string;
  subject?: string;
  medium?: 'image' | 'video';
}

export interface ClassifyResult {
  intent: 'create' | 'chat' | 'other';
  /** The Operator's OODA verdict — SIZED to intent:
   *   dispatch = small/quick (inline image in chat) · transfer = large/heavy (hand to the Image
   *   agent + Image IDE) · ask = A2UI question · reply = conversation. */
  action: 'dispatch' | 'transfer' | 'ask' | 'reply';
  /** The workflow (action='dispatch'|'transfer'). Only 'image' is wired today. */
  workflow?: 'image';
  /** The assembled generation prompt for a quick dispatch (action='dispatch'). */
  generationPrompt?: string;
  /** The Epistemic Frame handed to the specialist (action='transfer'). */
  frame?: TransferFrame;
  /** The A2UI question (action='ask'). */
  question?: ClassifyQuestion;
  /** Follow-up quick-picks (action='reply'). */
  suggestions: string[];
}

/** The classify system prompt. Deliberately SHORT — the model returns structured JSON
 *  (see CLASSIFY_SCHEMA); no regex, no parsing gymnastics. Any capable model handles this. */
export const CLASSIFY_SYSTEM = `You are the Operator behind Pixcel. Read the exchange and decide ONE next action, SIZED to how deep the user wants to go. Act decisively — don't keep interviewing, and don't force a heavy process on a casual request.

- action "dispatch" (SMALL / quick): the user just wants a fast image of a nameable subject — casual, standalone ("photoreal car image", "z28 camaro photoreal", "a cute cat logo"). The DEFAULT for a simple create intent. Set workflow "image" and generationPrompt = a rich, model-ready image prompt built from the conversation.
- action "transfer" (LARGE / heavy): the request signals DEPTH — a project, a film/video scene, iteration, character consistency, "help me nail this", or an image that feeds a video ("a Camaro for a video scene from my childhood"). Hand off to the Image agent. Set workflow "image" and frame = { goal: one-line description of the whole job, subject: the core subject, medium: "image" or "video" }.
- action "ask": ONLY when it's too vague to make anything (just "a car", "make me something"). Give one question: label (the single thing you need), placeholder, and 3-4 short chip answers (omit chips if the answer is two-pronged / open-ended).
- action "reply": conversation/other. Give 2-4 short follow-up suggestions.

Small vs large: a bare subject → dispatch; any signal of a project/scene/iteration/consistency → transfer. When unsure between them, prefer dispatch (fast) — the user can go deeper after. intent is create / chat / other.`;

/** The structured-output JSON schema the classify call is constrained to — so the model
 *  returns clean, valid JSON and we never regex-scrape prose. */
export const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['create', 'chat', 'other'] },
    action: { type: 'string', enum: ['dispatch', 'transfer', 'ask', 'reply'] },
    workflow: { type: 'string', enum: ['image'] },
    generationPrompt: { type: 'string' },
    frame: {
      type: 'object',
      properties: {
        goal: { type: 'string' },
        subject: { type: 'string' },
        medium: { type: 'string', enum: ['image', 'video'] },
      },
      required: ['goal'],
      additionalProperties: false,
    },
    question: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        placeholder: { type: 'string' },
        chips: { type: 'array', items: { type: 'string' } },
      },
      required: ['label'],
      additionalProperties: false,
    },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['intent', 'action'],
  additionalProperties: false,
} as const;

/**
 * Validate the classify output into a {@link ClassifyResult}. The classify call uses a
 * structured-output SCHEMA (CLASSIFY_SCHEMA), so `raw` is already clean JSON — this is a plain
 * `JSON.parse` + defaulting, NO regex. Throws on unparseable input so the caller falls back.
 */
export function parseClassifyResult(raw: string): ClassifyResult {
  const obj = JSON.parse(raw) as Record<string, unknown>;

  const intent =
    obj.intent === 'create' || obj.intent === 'chat' || obj.intent === 'other' ? obj.intent : 'other';
  const action =
    obj.action === 'dispatch' || obj.action === 'transfer' || obj.action === 'ask' || obj.action === 'reply'
      ? obj.action
      : 'reply';

  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()).slice(0, 4)
    : [];

  const result: ClassifyResult = { intent, action, suggestions };

  if (action === 'dispatch') {
    result.workflow = 'image';
    result.generationPrompt = typeof obj.generationPrompt === 'string' ? obj.generationPrompt.trim() : '';
  }

  if (action === 'transfer' && obj.frame && typeof obj.frame === 'object') {
    const f = obj.frame as Record<string, unknown>;
    if (typeof f.goal === 'string' && f.goal.trim()) {
      result.workflow = 'image';
      result.frame = {
        goal: f.goal.trim(),
        subject: typeof f.subject === 'string' ? f.subject.trim() : undefined,
        medium: f.medium === 'video' ? 'video' : 'image',
      };
    }
  }

  if (action === 'ask' && obj.question && typeof obj.question === 'object') {
    const q = obj.question as Record<string, unknown>;
    if (typeof q.label === 'string' && q.label.trim()) {
      result.question = {
        label: q.label.trim(),
        placeholder: typeof q.placeholder === 'string' ? q.placeholder.trim() : undefined,
        chips: Array.isArray(q.chips)
          ? q.chips.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim()).slice(0, 4)
          : undefined,
      };
    }
  }

  return result;
}
