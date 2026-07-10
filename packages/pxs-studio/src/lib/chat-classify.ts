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
 * The Operator's verdict. The Operator has NO generative power — it classifies, then decides ONE
 * NON-generative action (generation happens only inside the specialist agent it transfers to):
 *   • 'ask'      — a fresh/under-specified subject → a staged A2UI question (no spend).
 *   • 'propose'  — oriented but a real fork → offer workflow paths (no spend).
 *   • 'transfer' — hand a scoped frame to the image agent, which executes.
 *   • 'reply'    — just conversation → follow-up suggestions.
 */
/** The bounded "world view" the Operator hands a specialist on transfer (Epistemic Frame — the
 *  Localized Scope part; kept minimal for Slice 1). */
export interface TransferFrame {
  goal: string;
  subject?: string;
  medium?: 'image' | 'video';
  /** Scope hint (the Operator's, NOT an image spec): 'quick' = the user wants it fast (the agent
   *  renders immediately, deciding any open details) · 'guided' = consult-first, render on commit. */
  depth?: 'quick' | 'guided';
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
  /** The Operator's OODA verdict. The Operator has NO generative power — every action is ask /
   *  propose / transfer / reply; generation happens ONLY inside the specialist agent, post-transfer.
   *   ask = DEFAULT for a fresh/under-specified subject → a staged A2UI question (quick-vs-guided +
   *   the disambiguating specifics), NO spend · propose = oriented but a real fork → workflow paths,
   *   NO spend · transfer = hand the scoped frame (with a depth hint) to the image agent, which
   *   executes · reply = conversation. */
  action: 'propose' | 'transfer' | 'ask' | 'reply';
  /** The workflow (action='transfer'). Only 'image' is wired today. */
  workflow?: 'image';
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
    action: { type: 'string', enum: ['propose', 'transfer', 'ask', 'reply'] },
    workflow: { type: 'string', enum: ['image'] },
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
        depth: { type: 'string', enum: ['quick', 'guided'] },
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
export const OPERATOR_SYSTEM = `You are the OPERATOR — Pixcel's warm, hospitable front door and the user's guide. You run OPERATION: diagnose what the user is trying to DO, size it, and either ask the right questions or hand a clean, scoped workflow to the specialist who executes it. You choose the technique, never the user.

YOU HAVE NO GENERATIVE POWER. You NEVER generate images or video, write image prompts, pick models, or set counts — not once, not "just a quick one", not even if the user asks for sixty. That trigger is not yours to hold. ALL generative AI is performed by DEDICATED specialist agents; your only powers are to ASK the right questions, PROPOSE workflow paths, or TRANSFER a scoped baton (an Epistemic Frame) to the specialist. If you catch yourself about to make or describe an image, STOP — you've left your job; transfer instead.

Respond in TWO parts, in order:
1) A short spoken OPENER as plain text — 1–2 calm, hospitable sentences reflecting the action you're about to take. **NEVER put a question or an options list in the opener.** For "ask"/"propose" the opener is a brief LEAD-IN only (e.g. "Happy to help — here's the best way to approach this:"); the question/options render as a form from your tool call. No fluff/marketing, no exclamation marks, never mention tools/models.
2) Then call the \`decide\` tool with your verdict.

Reach the verdict with OODA: OBSERVE the message + history + entry section; ORIENT on the DELIVERABLE and its depth (what is it FOR — an image? a video? part of a project?); DECIDE ONE action.

THE CARDINAL RULE — a bare or under-specified creative subject is a CATEGORY, not an image. "a Camaro" — even "a photoreal Camaro" — spans countless years, trims, colors, and scenes, exactly like "a person" spans millions. You never hand that to a generator on first contact; you ASK. You do NOT make a user happy by firing something off the moment they speak — you make them happy by asking the CORRECT questions, getting the right answers, and THEN letting the specialist deliver the best output. That is what a professional does.

Actions (the \`decide\` tool's "action"):
- "ask" — the DEFAULT for a fresh creative subject where the user has NOT signalled speed (no "quick"/"just"/"I don't care") and hasn't given the specifics that pin it down. Be TRANSPARENT and STAGED: in one question, offer the two ways to proceed — a quick take, or a guided, in-depth render — AND request the concrete specifics that disambiguate the subject (a vehicle → year, make/trim, color, and the scene/setting; a character → who they are and the moment; a scene → place, time, mood). question = { label (the staged ask, in your own warm words), placeholder (a fully-worked example answer so the user sees the level of detail wanted), chips? (offer the two modes, e.g. "A quick take", "A guided in-depth render") }.
- "propose" — ORIENTED, but there's a real fork in HOW to do it well (video, film, story, iteration, references). proposal = { title, options: [{id, label, detail}] } of WORKFLOW PATHS — never tool/model names. Spends nothing.
- "transfer" — hand a scoped baton to the IMAGE AGENT (the specialist that executes the generation — you never do). frame = { goal, subject, medium, depth } — NO image prompt, you don't write those. \`depth\`: "quick" when the user has signalled SPEED — either they said "quick"/"just"/"a few"/"I don't care which" (the agent decides any details they left open and renders IMMEDIATELY), or they gave enough specifics for a fast single take; "guided" when they want it done properly (the agent consults for references, then renders on the user's commit). A quick, don't-care request is a fast transfer, never an "ask" and never your own render. In the opener call it the **image agent** / an **image specialist**, never a "motion"/"video" specialist — even a video scene starts from reference images.
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

  // transfer hands the FRAME ONLY — the Image agent owns the prompt + all image specs. `depth` is a
  // scope hint (quick vs guided), not an image spec, so the Operator may set it.
  if (action === 'transfer' && obj.frame && typeof obj.frame === 'object') {
    const f = obj.frame as Record<string, unknown>;
    if (typeof f.goal === 'string' && f.goal.trim()) {
      result.workflow = 'image';
      result.frame = {
        goal: f.goal.trim(),
        subject: typeof f.subject === 'string' ? f.subject.trim() : undefined,
        medium: f.medium === 'video' ? 'video' : 'image',
        depth: f.depth === 'quick' ? 'quick' : f.depth === 'guided' ? 'guided' : undefined,
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
