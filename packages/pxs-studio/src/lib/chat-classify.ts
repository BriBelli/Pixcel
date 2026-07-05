/**
 * Pure, testable helpers for the chat-turn classify pass.
 *
 * Extracted verbatim from `app/api/chat-turn/route.ts` so the tolerant classify-JSON parser (the
 * riskiest logic) can be unit-tested under `node:test`. No React / Next / DOM — pure TS.
 */

/** The four REAL medium options. Ids/labels are stable so the client + stored a2ui snapshot
 *  stay compatible; only the block `title` is contextualized per turn by the classify pass. */
const MEDIUM_OPTIONS = [
  { id: 'pixcel', label: 'Use Pixcel Studio' },
  { id: 'image', label: 'Use Image Model' },
  { id: 'both', label: 'Both' },
  { id: 'guidance', label: 'More guidance' },
] as const;

/** Build the options A2UI block with a (contextual) title, reusing the stable option set. */
export function buildA2UI(title: string) {
  return { kind: 'options', title, options: MEDIUM_OPTIONS.map((o) => ({ ...o })) };
}

/** Fallback A2UI block — fixed options for "how do you want to make it?" (used when classify fails). */
export const STUB_A2UI = buildA2UI('How do you want to make it?');

/** Fallback generic follow-up suggestions (used when the classify pass fails or returns nothing). */
export const STUB_SUGGESTIONS = [
  'Show me a few style directions',
  'What size and shape works best?',
  'Make a simple version first',
];

/** The structured result the classify pass produces. */
export interface ClassifyResult {
  /** Is the user trying to MAKE something (art/image/logo/etc.)? */
  intent: 'create' | 'chat' | 'other';
  /** Surface the medium options? (true only for a create intent). */
  showOptions: boolean;
  /** Contextual options title, e.g. "How do you want to make your dragon?" (used iff showOptions). */
  optionsTitle: string;
  /** 2–4 SHORT contextual follow-ups derived from THIS conversation. */
  suggestions: string[];
}

/** The classify system prompt — asks for ONLY JSON matching {@link ClassifyResult}. */
export const CLASSIFY_SYSTEM = `You are the routing brain behind the Pixcel Agent. You are given the user's latest message, the assistant's reply, and brief prior history. Classify the exchange and produce follow-up UI.

Reply with ONLY a JSON object (no prose, no markdown, no code fences) with EXACTLY these keys:
{
  "intent": "create" | "chat" | "other",
  "showOptions": boolean,
  "optionsTitle": string,
  "suggestions": string[]
}

Rules:
- "intent" is "create" if the user is trying to MAKE something (pixel art, an image, a logo, an icon, a sprite, a design, etc.). Use "chat" for general conversation/questions, and "other" for anything that fits neither.
- "showOptions" is true ONLY when intent is "create" (they're about to pick how to make it). Otherwise false — general chat must NOT force the medium picker.
- "optionsTitle" is a short, warm, subject-specific question, e.g. "How do you want to make your dragon?". Only matters when showOptions is true; still provide a reasonable string otherwise.
- "suggestions" is an array of 2 to 4 SHORT (a few words each) follow-up prompts a user might tap next, derived from THIS specific conversation — not generic filler.

Output the JSON object and nothing else.`;

/**
 * Extract a {@link ClassifyResult} from raw model text. Tolerates stray prose / code fences by
 * grabbing the first balanced-looking JSON object. Throws on anything unparseable or invalid so
 * the caller can fall back to the stubs.
 */
export function parseClassifyResult(raw: string): ClassifyResult {
  let text = raw.trim();
  // Strip a leading/trailing ```json ... ``` fence if the model added one.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) text = fence[1].trim();
  // Otherwise, isolate the first {...} span.
  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw new Error('no JSON object in classify output');
    text = text.slice(start, end + 1);
  }
  const obj = JSON.parse(text) as Record<string, unknown>;

  const intent = obj.intent === 'create' || obj.intent === 'chat' || obj.intent === 'other' ? obj.intent : 'other';
  const showOptions = obj.showOptions === true && intent === 'create';
  const optionsTitle =
    typeof obj.optionsTitle === 'string' && obj.optionsTitle.trim().length > 0
      ? obj.optionsTitle.trim()
      : STUB_A2UI.title;

  // Clamp to ≤4 non-empty strings.
  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 4)
    : [];

  return { intent, showOptions, optionsTitle, suggestions };
}
