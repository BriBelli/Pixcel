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

/** One workflow-path option in a `propose` verdict (a PATH, never a tool/model name). */
export interface ProposalOption {
  id: string;
  label: string;
  /** One short line on what this path means / when to pick it. */
  detail?: string;
}

/** The Operator's workflow proposal (action='propose') — paths the user chooses between, NO spend. */
export interface WorkflowProposal {
  title: string;
  options: ProposalOption[];
}

export interface ClassifyResult {
  intent: 'create' | 'chat' | 'other';
  /** The Operator's OODA verdict — SIZED to intent:
   *   dispatch = casual image-only (inline image) · propose = oriented but a real fork → offer
   *   workflow paths (NO spend) · transfer = user chose a heavy path → hand to the specialist ·
   *   ask = A2UI question · reply = conversation. */
  action: 'dispatch' | 'propose' | 'transfer' | 'ask' | 'reply';
  /** The workflow (action='dispatch'|'transfer'). Only 'image' is wired today. */
  workflow?: 'image';
  /** The assembled generation prompt for a quick dispatch (action='dispatch'). */
  generationPrompt?: string;
  /** The workflow paths to choose between (action='propose'). */
  proposal?: WorkflowProposal;
  /** The Epistemic Frame handed to the specialist (action='transfer'). */
  frame?: TransferFrame;
  /** The A2UI question (action='ask'). */
  question?: ClassifyQuestion;
  /** Follow-up quick-picks (action='reply'). */
  suggestions: string[];
}


/** The structured-output JSON schema the classify call is constrained to — so the model
 *  returns clean, valid JSON and we never regex-scrape prose. */
export const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['create', 'chat', 'other'] },
    action: { type: 'string', enum: ['dispatch', 'propose', 'transfer', 'ask', 'reply'] },
    workflow: { type: 'string', enum: ['image'] },
    generationPrompt: { type: 'string' },
    proposal: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              detail: { type: 'string' },
            },
            required: ['id', 'label'],
            additionalProperties: false,
          },
        },
      },
      required: ['title', 'options'],
      additionalProperties: false,
    },
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
 * OPERATOR_SYSTEM — the ONE Operator brain (replaces the split opener + classify).
 * The Operator streams a hospitable OPENER, then calls the `decide` tool with its verdict — so
 * the spoken line reflects the actual decision (it Orients + decides + speaks in one pass).
 */
export const OPERATOR_SYSTEM = `You are the OPERATOR — Pixcel's warm, hospitable front door and the user's guide. You run OPERATION: diagnose what the user is trying to DO, size it, and route them onto the right workflow — or lay out the paths and let them choose. You choose the tools/technique, never the user. You NEVER write image prompts, pick models, set reference counts, or generate images — that craft belongs to the specialists. If you catch yourself describing an image, stop: you've left your job.

Respond in TWO parts, in order:
1) A short spoken OPENER as plain text — 1–2 calm, hospitable sentences reflecting the action you're about to take. **NEVER put a question or an options list in the opener.** For "ask"/"propose" the opener is a brief LEAD-IN only (e.g. "Happy to help — here's the best way to approach this:"); the question/options render as a form from your tool call. No fluff/marketing, no exclamation marks, never mention tools/models.
2) Then call the \`decide\` tool with your verdict.

Reach the verdict with OODA: OBSERVE the message + history + entry section; ORIENT on the DELIVERABLE and its depth (what is it FOR — an image? a video? part of a project?); DECIDE ONE action, sized to depth. When torn between generating and proposing, PROPOSE — proposing is free; generating spends real money and can be the wrong move.

Actions (the \`decide\` tool's "action"):
- "ask" — NOT oriented (deliverable unclear). question = { label (the ONE fundamental thing — what AND what for), placeholder?, chips? }. Usually two-pronged → no chips.
- "propose" — ORIENTED, but there's a real fork in HOW to do it well (video, film, story, iteration, references). proposal = { title, options: [{id, label, detail}] } of WORKFLOW PATHS — never tool/model names. Spends nothing. This is your valve against eager-generating your way into a workflow.
- "transfer" — the user has CHOSEN a heavy path (or a single professional path is unambiguous). frame = { goal, subject, medium } ONLY — no image prompt. In the opener call it the **image agent** / an **image specialist** (it makes the images), never a "motion"/"video" specialist — even a video scene starts from reference images.
- "dispatch" — a casual, standalone, IMAGE-ONLY request for a nameable subject with NO project/video/story/iteration signals. generationPrompt = a rich image prompt. This is the ONLY action that eager-generates — keep it narrow.
- "reply" — conversation/greeting/question. suggestions = 2–4 short follow-ups.

Your detailed craft — how to diagnose, size, and shape proposals (e.g. the reference-first professional path for cinematic video) — is in the skills below. Follow them. ENTRY SECTION sets your prior: "chat" = broad; "image" = assume an image deliverable; "video" = assume video. intent = create / chat / other.`;

/** The single tool the Operator calls to record its verdict (input = the decision shape). */
export const DECIDE_TOOL = {
  name: 'decide',
  description: 'Record your OODA verdict for this turn — the ONE sized action to take, after your spoken opener.',
  input_schema: CLASSIFY_SCHEMA,
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
    obj.action === 'dispatch' ||
    obj.action === 'propose' ||
    obj.action === 'transfer' ||
    obj.action === 'ask' ||
    obj.action === 'reply'
      ? obj.action
      : 'reply';

  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()).slice(0, 4)
    : [];

  const result: ClassifyResult = { intent, action, suggestions };

  // dispatch (small/quick) is the ONLY Operator-owned generation: it carries the image prompt.
  if (action === 'dispatch') {
    result.workflow = 'image';
    result.generationPrompt = typeof obj.generationPrompt === 'string' ? obj.generationPrompt.trim() : '';
  }

  // propose offers WORKFLOW PATHS (no spend) — validate title + at least one {id,label} option.
  if (action === 'propose' && obj.proposal && typeof obj.proposal === 'object') {
    const p = obj.proposal as Record<string, unknown>;
    const rawOpts = Array.isArray(p.options) ? p.options : [];
    const options: ProposalOption[] = rawOpts
      .map((o): ProposalOption | null => {
        if (!o || typeof o !== 'object') return null;
        const oo = o as Record<string, unknown>;
        const id = typeof oo.id === 'string' ? oo.id.trim() : '';
        const label = typeof oo.label === 'string' ? oo.label.trim() : '';
        if (!id || !label) return null;
        return { id, label, detail: typeof oo.detail === 'string' ? oo.detail.trim() : undefined };
      })
      .filter((o): o is ProposalOption => o !== null)
      .slice(0, 4);
    if (typeof p.title === 'string' && p.title.trim() && options.length > 0) {
      result.proposal = { title: p.title.trim(), options };
    }
  }

  // transfer hands the FRAME ONLY — the Image agent owns the prompt + all image specs.
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
