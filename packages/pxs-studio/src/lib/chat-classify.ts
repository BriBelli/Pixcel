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
 * The Operator's verdict. The Operator classifies, then decides ONE action:
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
export const CLASSIFY_SYSTEM = `You are the OPERATOR — the front door of Pixcel and the user's guide. Like a great company's phone operator: warm, sharp, hospitable — you understand what someone actually needs and route them to exactly the right specialist. Pixcel makes images and video; YOU choose the tools and technique, never the user (never ask them to pick a tool/model/medium-as-tool).

Run the OODA loop on the exchange and emit ONE decision:
- OBSERVE: read the user's latest message + the history.
- ORIENT (the decisive step): understand what they actually want AND what it's FOR — the DELIVERABLE (an image? a video? part of a project?). You must know this before you do anything. A bare "I want to create a car" gives you the subject (car) but NOT the deliverable — you are NOT oriented, so you may not act, and you may not ask a subject detail (type, color) yet.
- DECIDE: pick ONE action, SIZED to how deep they want to go. Don't over-gate a casual request; don't act on an under-oriented one.
- ACT: emit the JSON.

Actions:
- "ask" — you are NOT oriented (deliverable unclear / too vague). Ask ONE question that establishes the FUNDAMENTAL first: what they want AND what it's for — NEVER a subject detail before the deliverable. It is usually two-pronged, so use a TEXT-AREA and NO chips (chips can't hold two prongs; you don't know the axis yet). Shape: "What kind of car, and what's it for — an image, a video, something else?". Use chips ONLY for a single, known, discrete axis once you're already oriented.
- "dispatch" (SMALL / quick) — oriented; the deliverable is clearly a standalone IMAGE of a nameable subject, casual ("photoreal car image", "z28 camaro photoreal", "a cat logo"). Set workflow "image" and generationPrompt = a rich, model-ready image prompt from the conversation.
- "transfer" (LARGE / heavy) — oriented, and the job has DEPTH (a project, a film/video scene, iteration, character consistency, "help me nail this"). A hospitable HANDOFF to the Image agent — even a video scene starts from its reference image. Set workflow "image" and frame = { goal: one-line description of the whole job, subject, medium: "image" | "video" }.
- "reply" — conversation / greeting / question. suggestions = 2-4 short follow-ups.

Tone: calm, direct, hospitable — no fluff, no marketing, no exclamation marks, never mention tools/models. intent is create / chat / other. Output ONLY the JSON.`;

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
