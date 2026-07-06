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

/** The structured result the classify pass produces. */
export interface ClassifyResult {
  /** Is the user trying to MAKE something (art/image/logo/etc.)? Drives internal routing later. */
  intent: 'create' | 'chat' | 'other';
  /** 2–4 SHORT quick-pick suggestions — possible ANSWERS to the agent's question, tappable. */
  suggestions: string[];
}

/** The classify system prompt — asks for ONLY JSON matching {@link ClassifyResult}. */
export const CLASSIFY_SYSTEM = `You are the routing brain behind the Pixcel Agent. You are given the user's latest message, the assistant's reply, and brief prior history. Classify the exchange and produce tappable quick-pick suggestions.

Reply with ONLY a JSON object (no prose, no markdown, no code fences) with EXACTLY these keys:
{
  "intent": "create" | "chat" | "other",
  "suggestions": string[]
}

Rules:
- "intent" is "create" if the user is trying to MAKE something (pixel art, an image, a logo, an icon, a sprite, a design, etc.). Use "chat" for general conversation/questions, and "other" for anything else.
- "suggestions" is an array of 2 to 4 SHORT quick-picks the user could TAP AS AN ANSWER to what the assistant just asked — concrete directions grounded in THIS conversation (e.g. if the assistant asked what kind of car: "Sleek sports car", "Boxy retro", "Chunky pickup", "Cute cartoon").
- Suggestions are ANSWERS, never tools or mediums. NEVER output tool/technique choices like "Use Pixcel Studio", "Use an image model", "pixel vs vector", or meta-instructions like "Show me styles". The user describes what they want; the agent picks the tools.

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

  // Clamp to ≤4 non-empty strings.
  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 4)
    : [];

  return { intent, suggestions };
}
