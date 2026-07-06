'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SuggestionsRow — follow-up suggestions as a vertical list of arrow + text rows,
 * ported from photolif's `.followup` (a2ui-chat-message). Each row submits itself
 * as the next turn. Secondary text, hover → primary, arrow glyph in tertiary.
 * Renders nothing when there are no suggestions.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon } from '../ui';

export interface SuggestionsRowProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

const CSS = `
@keyframes pxc-followups-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.pxc-followups {
  display: flex; flex-direction: column; gap: var(--a2ui-space-2);
  margin-top: var(--a2ui-space-3);
  animation: pxc-followups-in 420ms var(--a2ui-ease-entrance) 220ms both;
}
.pxc-followup {
  display: flex; align-items: center; gap: var(--a2ui-space-2);
  background: none; border: none; padding: var(--a2ui-space-1) 0;
  color: var(--a2ui-text-secondary);
  font-size: var(--a2ui-text-sm); font-family: var(--a2ui-font-family);
  cursor: pointer; text-align: left;
  transition: color var(--a2ui-transition-fast);
}
.pxc-followup:hover { color: var(--a2ui-text-primary); }
.pxc-followup > svg { color: var(--a2ui-text-tertiary); }
@media (prefers-reduced-motion: reduce) { .pxc-followups { animation: none; } }
`;

export function SuggestionsRow({ suggestions, onSelect }: SuggestionsRowProps) {
  if (suggestions.length === 0) return null;
  return (
    <div className="pxc-followups">
      <style>{CSS}</style>
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          className="pxc-followup"
          aria-label={`Follow up: ${s}`}
          onClick={() => onSelect(s)}
        >
          <Icon name="arrow-right" size={16} />
          <span>{s}</span>
        </button>
      ))}
    </div>
  );
}

export default SuggestionsRow;
