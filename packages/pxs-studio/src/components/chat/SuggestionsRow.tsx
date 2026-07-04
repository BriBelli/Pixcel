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

/* Suggestions reveal — fades in ONCE, ~80ms after the a2ui block begins its
 * reveal, on the same easing. This root mounts once when suggestions arrive
 * (it returns null while empty), so the CSS animation fires on mount and never
 * replays as the parent re-renders on streaming deltas. Reduced-motion → none. */
const CSS = `
@keyframes pxc-suggestions-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.pxc-suggestions {
  animation: pxc-suggestions-in 420ms var(--a2ui-ease-entrance) 220ms both;
}
@media (prefers-reduced-motion: reduce) {
  .pxc-suggestions { animation: none; }
}
`;

export function SuggestionsRow({ suggestions, onSelect }: SuggestionsRowProps) {
  if (suggestions.length === 0) return null;
  return (
    <div
      className="pxc-suggestions flex flex-wrap"
      style={{ gap: 'var(--a2ui-space-2)', marginTop: 'var(--a2ui-space-3)' }}
    >
      <style>{CSS}</style>
      {suggestions.map((s, i) => (
        <Chip key={i} type="button" onClick={() => onSelect(s)}>
          {s}
        </Chip>
      ))}
    </div>
  );
}

export default SuggestionsRow;
