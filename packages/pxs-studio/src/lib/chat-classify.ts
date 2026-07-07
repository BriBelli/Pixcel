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
export interface ClassifyResult {
  intent: 'create' | 'chat' | 'other';
  action: 'dispatch' | 'ask' | 'reply';
  /** The workflow to dispatch (action='dispatch'). Only 'image' is wired today. */
  workflow?: 'image';
  /** The assembled generation prompt for the workflow (action='dispatch'). */
  generationPrompt?: string;
  /** The A2UI question (action='ask'). */
  question?: ClassifyQuestion;
  /** Follow-up quick-picks (action='reply'). */
  suggestions: string[];
}

/** The classify system prompt. Deliberately SHORT — the model returns structured JSON
 *  (see CLASSIFY_SCHEMA); no regex, no parsing gymnastics. Any capable model handles this. */
export const CLASSIFY_SYSTEM = `You are the detective behind the Pixcel Agent. Read the exchange and decide ONE next action. Act decisively on solid evidence — don't keep interviewing.

- action "dispatch": the user named something makeable (even loosely — "photoreal car image", "z28 camaro photoreal", "a cute cat logo"). This is the DEFAULT for a create intent with a nameable subject. Set workflow "image" and generationPrompt = a rich, model-ready image prompt built from the whole conversation.
- action "ask": ONLY when it's too vague to make anything (just "a car", "make me something"). Give one question: label (the single thing you need), placeholder, and 3-4 short chip answers.
- action "reply": conversation/other. Give 2-4 short follow-up suggestions.

intent is create / chat / other.`;

/** The structured-output JSON schema the classify call is constrained to — so the model
 *  returns clean, valid JSON and we never regex-scrape prose. */
export const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['create', 'chat', 'other'] },
    action: { type: 'string', enum: ['dispatch', 'ask', 'reply'] },
    workflow: { type: 'string', enum: ['image'] },
    generationPrompt: { type: 'string' },
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
    obj.action === 'dispatch' || obj.action === 'ask' || obj.action === 'reply' ? obj.action : 'reply';

  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()).slice(0, 4)
    : [];

  const result: ClassifyResult = { intent, action, suggestions };

  if (action === 'dispatch') {
    result.workflow = 'image';
    result.generationPrompt = typeof obj.generationPrompt === 'string' ? obj.generationPrompt.trim() : '';
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
