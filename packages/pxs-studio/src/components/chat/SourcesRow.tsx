'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SourcesRow — the citations / attribution layer under an assistant turn.
 *
 * The Claude Design gospel has NO dedicated citations component, so per its own
 * rule ("when the system can't answer, don't invent — adapt the nearest approved
 * analog") this reuses the canonical ContextChip: a wrapping row of pill chips at
 * the BOTTOM of the assistant turn — the same place a user turn puts its context
 * chips. Each chip is a source the agent grounded on.
 *
 *   • web sources (a `url`)   → a `globe` glyph, chip is a clickable link
 *   • model / data sources    → a `sparkles` / `info` glyph, static chip
 *
 * Renders nothing when there are no sources — it stays the ready scaffold until the
 * coordinator (P4) populates `turn.sources`. Tokens-only, radius-full, 8% border,
 * no gradients / scale-pop.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon } from '../ui';
import type { IconName } from '../ui';

export interface Source {
  /** The human label shown on the chip (site name, model name, dataset). */
  title: string;
  /** When present, the chip becomes a link that opens in a new tab. */
  url?: string;
  /** What kind of source this is — drives the leading glyph. Defaults to 'web'. */
  kind?: 'web' | 'model' | 'data';
}

export interface SourcesRowProps {
  sources?: Source[];
}

/* Sources reveal — fades in ONCE when sources arrive (returns null while empty, so
 * the CSS animation fires on mount and never replays on streaming re-renders). */
const CSS = `
@keyframes pxc-sources-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.pxc-sources {
  animation: pxc-sources-in 360ms var(--a2ui-ease-entrance) 260ms both;
}
.pxc-source-chip {
  display: inline-flex; align-items: center; gap: 5px;
  height: 24px; padding: 0 9px 0 8px;
  background: var(--a2ui-bg-tertiary);
  border: 1px solid var(--pxs-border-subtle);
  border-radius: var(--a2ui-radius-full);
  font-size: var(--a2ui-text-xs);
  color: var(--a2ui-text-secondary);
  text-decoration: none;
  transition: background var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast);
}
a.pxc-source-chip:hover {
  background: var(--a2ui-bg-secondary);
  border-color: var(--a2ui-border-default);
}
.pxc-source-chip > svg { color: var(--a2ui-text-tertiary); }
@media (prefers-reduced-motion: reduce) {
  .pxc-sources { animation: none; }
}
`;

/** The leading glyph for a source, by kind. */
function glyphFor(kind: Source['kind']): IconName {
  if (kind === 'model') return 'sparkles';
  if (kind === 'data') return 'info';
  return 'globe';
}

export function SourcesRow({ sources }: SourcesRowProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div
      className="pxc-sources flex flex-wrap"
      style={{ gap: 'var(--a2ui-space-2)', marginTop: 'var(--a2ui-space-3)' }}
    >
      <style>{CSS}</style>
      {sources.map((src, i) => {
        const glyph = glyphFor(src.kind);
        const inner = (
          <>
            <Icon name={glyph} size={13} />
            <span>{src.title}</span>
          </>
        );
        return src.url ? (
          <a
            key={i}
            className="pxc-source-chip"
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {inner}
          </a>
        ) : (
          <span key={i} className="pxc-source-chip">
            {inner}
          </span>
        );
      })}
    </div>
  );
}

export default SourcesRow;
