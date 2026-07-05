'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * AssistantHeader — the assistant identity row for a chat turn.
 *
 * The Pixcel Agent speaks AS its model badge — never as "I" / "Assistant". This
 * row is the badge: the locked Pixcel-X mark + the derived model display name
 * ("Opus 4.8"). Subtle / secondary by design (the message body owns the emphasis).
 *
 * `modelDisplayName(id)` derives the badge from the model id (`claude-opus-4-8`)
 * so the label is never hardcoded in JSX — swap the id, the badge follows.
 * Tokens-only, no raw hex.
 * ───────────────────────────────────────────────────────────────────────────── */

import { PixcelMark } from '../ui';

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

export interface AssistantHeaderProps {
  /** The model id the agent is speaking as. Defaults to the locked best model. */
  modelId?: string;
}

export function AssistantHeader({ modelId = DEFAULT_MODEL_ID }: AssistantHeaderProps) {
  return (
    <div
      className="flex items-center gap-2"
      style={{ marginBottom: 'var(--a2ui-space-2)', color: 'var(--a2ui-text-secondary)' }}
    >
      <PixcelMark size={16} style={{ color: 'var(--a2ui-accent)' }} />
      <span
        style={{
          fontSize: 'var(--a2ui-text-sm)',
          fontWeight: 'var(--a2ui-font-medium)',
          color: 'var(--a2ui-text-secondary)',
        }}
      >
        {modelDisplayName(modelId)}
      </span>
    </div>
  );
}

export default AssistantHeader;
