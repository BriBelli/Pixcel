'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SuggestionsRow — the follow-up suggestions as clickable Chip primitives.
 * Clicking a chip submits it as the next turn. Sentence case, tokens-only.
 * Renders nothing when there are no suggestions.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Chip } from '../ui';

export interface SuggestionsRowProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function SuggestionsRow({ suggestions, onSelect }: SuggestionsRowProps) {
  if (suggestions.length === 0) return null;
  return (
    <div
      className="flex flex-wrap"
      style={{ gap: 'var(--a2ui-space-2)', marginTop: 'var(--a2ui-space-3)' }}
    >
      {suggestions.map((s, i) => (
        <Chip key={i} type="button" onClick={() => onSelect(s)}>
          {s}
        </Chip>
      ))}
    </div>
  );
}

export default SuggestionsRow;
