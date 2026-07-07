'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Model-identity helpers — shared by the turn footer (MessageActions).
 *
 * The Operator's identity is the LEFT avatar (the Pixcel-X mark) + the footer
 * model badge, exactly like photolif's `a2ui-chat-message` — there is no separate
 * top "AsstHead" line. These helpers derive the badge name + provider icon from
 * the model id so nothing is hardcoded in JSX. The model is LOCKED to the best
 * (not user-selectable) — the badge shows who is speaking, it is not a picker.
 * ───────────────────────────────────────────────────────────────────────────── */

/** The default model the agent speaks as (locked to the best — not user-selectable). */
export const DEFAULT_MODEL_ID = 'claude-opus-4-8';

/**
 * Derive a human display name from a Claude model id.
 *   claude-opus-4-8   → "Opus 4.8"
 *   claude-sonnet-4-5 → "Sonnet 4.5"
 *   claude-3-5-haiku  → "Haiku 3.5"
 * Falls back to a title-cased id when the shape is unfamiliar.
 */
export function modelDisplayName(id: string = DEFAULT_MODEL_ID): string {
  const tier = ['opus', 'sonnet', 'haiku'].find((t) => id.includes(t));
  if (tier) {
    // Collect the version number groups (e.g. ["4", "8"] → "4.8").
    const nums = id.split('-').filter((p) => /^\d+$/.test(p));
    const version = nums.join('.');
    const label = tier.charAt(0).toUpperCase() + tier.slice(1);
    return version ? `${label} ${version}` : label;
  }
  return id
    .split('-')
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ')
    .trim();
}

/** Map a model id → its provider brand icon (public/brand/provider-icons/*). */
export function providerIconSrc(modelId: string = DEFAULT_MODEL_ID): string {
  const id = modelId.toLowerCase();
  if (/(gpt|openai|\bo[13]\b)/.test(id)) return '/brand/provider-icons/gpt.ico';
  if (/gemini/.test(id)) return '/brand/provider-icons/gemini.ico';
  if (/(grok|xai)/.test(id)) return '/brand/provider-icons/xai.ico';
  // claude / opus / sonnet / haiku / anthropic → Anthropic (also the default).
  return '/brand/provider-icons/anthropic.ico';
}
