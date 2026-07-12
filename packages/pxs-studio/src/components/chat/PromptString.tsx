'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * PromptString — the CURRENT image prompt, color-coded by formula part (PR-10b).
 *
 * A calm floating card over the canvas showing the prompt the user is building — each part's clause
 * in its part color, comma-joined in the model's order. It's a live VIEW of the Build panel (edit a
 * part on the right → this re-strings instantly), and clicking a colored clause focuses that part in
 * the Build panel (the other half of the two-way binding — "chips edit in Build"). Standardized A2UI:
 * one renderer, colors mapped by the standard formula ids, agent-defined ids fall back to neutral.
 * ───────────────────────────────────────────────────────────────────────────── */

import type { BuilderPart } from '../../store/chat-turns-store';
import type { BuilderScore } from '../../lib/prompt-score';

/** Standard formula-part colors (matches the Build panel legend). Non-standard ids → neutral. */
const PART_COLORS: Record<string, string> = {
  subject: 'var(--a2ui-accent)',
  action: '#3fb950',
  context: '#f87171',
  composition: '#e3b341',
  style: '#bc8cff',
};
const colorFor = (id: string): string => PART_COLORS[id] ?? 'var(--a2ui-text-secondary)';

export interface PromptStringProps {
  parts: BuilderPart[];
  /** The controlled part values (shared with the Build panel). */
  values: Record<string, string>;
  score: BuilderScore;
  /** Click a colored clause → focus that part in the Build panel (two-way binding). */
  onEditPart: (id: string) => void;
}

const CSS = `
.pxc-ps {
  text-align: left;
  background: var(--a2ui-glass-dark, rgba(20,22,28,0.82)); backdrop-filter: blur(14px);
  border: 1px solid var(--pxs-border-subtle); border-radius: var(--a2ui-radius-xl);
  padding: var(--a2ui-space-4); box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; gap: var(--a2ui-space-3);
}
.pxc-ps-line { text-align: left; font-size: var(--a2ui-text-md); line-height: var(--a2ui-leading-relaxed); color: var(--a2ui-text-primary); }
.pxc-ps-clause { background: none; border: none; padding: 0; margin: 0; font-family: var(--a2ui-font-family);
  font-size: inherit; line-height: inherit; font-weight: var(--a2ui-font-medium); cursor: pointer; }
.pxc-ps-clause:hover { text-decoration: underline; text-underline-offset: 2px; }
.pxc-ps-sep { color: var(--a2ui-text-tertiary); }
.pxc-ps-empty { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); }
.pxc-ps-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--a2ui-space-3);
  flex-wrap: wrap; padding-top: var(--a2ui-space-2); border-top: 1px solid var(--a2ui-border-subtle); }
.pxc-ps-legend { display: flex; flex-wrap: wrap; gap: var(--a2ui-space-3); }
.pxc-ps-leg { display: inline-flex; align-items: center; gap: 5px; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }
.pxc-ps-dot { width: 8px; height: 8px; border-radius: var(--a2ui-radius-full); display: inline-block; flex-shrink: 0; }
.pxc-ps-meta { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); white-space: nowrap; }
`;

export function PromptString({ parts, values, score, onEditPart }: PromptStringProps) {
  const filled = parts.map((p) => ({ p, v: (values[p.id] ?? '').trim() })).filter((x) => x.v.length > 0);
  const words = filled.reduce((n, x) => n + x.v.split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="pxc-ps">
      <style>{CSS}</style>
      {filled.length === 0 ? (
        <div className="pxc-ps-empty">Your prompt builds here as you shape the parts on the right.</div>
      ) : (
        <div className="pxc-ps-line">
          {filled.map((x, i) => (
            <span key={x.p.id}>
              <button
                type="button"
                className="pxc-ps-clause"
                style={{ color: colorFor(x.p.id) }}
                onClick={() => onEditPart(x.p.id)}
                title={`Edit ${x.p.label} in the panel`}
              >
                {x.v}
              </button>
              {i < filled.length - 1 && <span className="pxc-ps-sep">, </span>}
            </span>
          ))}
        </div>
      )}
      <div className="pxc-ps-foot">
        <div className="pxc-ps-legend">
          {parts.map((p) => (
            <span key={p.id} className="pxc-ps-leg">
              <span className="pxc-ps-dot" style={{ background: colorFor(p.id) }} /> {p.label}
            </span>
          ))}
        </div>
        <div className="pxc-ps-meta">
          {words} words · {score.overall}% · click a clause to edit
        </div>
      </div>
    </div>
  );
}

export default PromptString;
