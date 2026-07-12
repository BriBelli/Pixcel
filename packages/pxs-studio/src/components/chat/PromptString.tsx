'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * PromptString — the CANONICAL image prompt: ONE native text surface, color-aware.
 *
 * The feel we're after (Brian's spec): a customer who's never seen an IDE should read this as a single
 * text-area they can click into and type — it just happens to be color-coded, like a span-styled string.
 * The colors are STYLING on the parts; the separators are DIM COMMAS (a disabled-color state), so the
 * eye reads coloured phrase → quiet comma → coloured phrase as one flowing sentence. Click anywhere,
 * the caret lands; type, and that part changes. On input we map each coloured run back to its part and
 * call setPartValue → the Build panel + the (local, instant) score update live. Two-way bound.
 *
 * WHY a hand-managed contentEditable and not React-rendered spans: a single caret surface must let the
 * caret flow ACROSS parts, and React re-rendering the innards on every keystroke fights the caret. So
 * React owns only the container; the coloured runs + non-editable dim commas are built and read
 * imperatively. We rebuild the DOM only when the surface is NOT focused (so an incoming agent/store
 * edit shows up) — never mid-type. Part identity lives in the DOM (data-pid), so we never reparse text.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Edit a part inline → write back to the store (drives Build panel + local score). */
  onValueChange: (id: string, value: string) => void;
  /** Optional: jump focus to a part's field in the Build panel (kept for compatibility). */
  onEditPart?: (id: string) => void;
}

const CSS = `
.pxc-ps {
  text-align: left;
  background: var(--a2ui-glass-dark, rgba(20,22,28,0.82)); backdrop-filter: blur(14px);
  border: 1px solid var(--pxs-border-subtle); border-radius: var(--a2ui-radius-xl);
  padding: var(--a2ui-space-4); box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; gap: var(--a2ui-space-3);
}
/* the one text surface — click anywhere, the caret lands; type, the part changes */
.pxc-ps-line { text-align: left; font-size: var(--a2ui-text-md); line-height: var(--a2ui-leading-relaxed);
  color: var(--a2ui-text-primary); max-height: 156px; overflow-y: auto; cursor: text; outline: none;
  border-radius: var(--a2ui-radius-md); }
.pxc-ps-line:focus { box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.pxc-ps-line[data-plain="true"] .pxc-seg { color: var(--a2ui-text-primary) !important; }
.pxc-seg { font-weight: var(--a2ui-font-medium); white-space: pre-wrap; border-radius: 3px; }
.pxc-seg[data-empty="true"]::before { content: attr(data-ph); color: var(--a2ui-text-disabled); font-style: italic; }
.pxc-ps-comma, .pxc-ps-stop { color: var(--a2ui-text-disabled); }
.pxc-ps-empty { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); }
.pxc-ps-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--a2ui-space-3);
  flex-wrap: wrap; padding-top: var(--a2ui-space-2); border-top: 1px solid var(--a2ui-border-subtle); }
.pxc-ps-legend { display: flex; flex-wrap: wrap; gap: var(--a2ui-space-3); align-items: center; }
.pxc-ps-leg { display: inline-flex; align-items: center; gap: 5px; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }
.pxc-ps-swatch { width: 8px; height: 8px; border-radius: 2px; display: inline-block; flex-shrink: 0; }
.pxc-ps-right { display: inline-flex; align-items: center; gap: var(--a2ui-space-3); }
.pxc-ps-meta { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); white-space: nowrap; }
.pxc-ps-info { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px;
  border: none; background: none; color: var(--a2ui-text-tertiary); cursor: pointer; border-radius: var(--a2ui-radius-md);
  font-size: var(--a2ui-text-xs); font-weight: var(--a2ui-font-semibold); font-family: var(--a2ui-font-family); font-style: italic; }
.pxc-ps-info[data-on="true"], .pxc-ps-info:hover { background: var(--a2ui-bg-hover); color: var(--pxs-accent-text); }
`;

export function PromptString({ parts, values, score, onValueChange }: PromptStringProps) {
  const [plain, setPlain] = useState(false);
  const lineRef = useRef<HTMLDivElement>(null);
  // Live refs so the imperative input/blur handlers never read stale props.
  const partsRef = useRef(parts);
  const valuesRef = useRef(values);
  const onChangeRef = useRef(onValueChange);
  partsRef.current = parts;
  valuesRef.current = values;
  onChangeRef.current = onValueChange;

  const words = parts.reduce((n, p) => n + (values[p.id] ?? '').split(/\s+/).filter(Boolean).length, 0);
  const anyFilled = parts.some((p) => (values[p.id] ?? '').trim().length > 0);

  /** Build the coloured runs + dim commas imperatively. Only called when the surface isn't focused. */
  const paint = useCallback(() => {
    const el = lineRef.current;
    if (!el || document.activeElement === el) return; // never stomp the caret mid-type
    const ps = partsRef.current;
    const vals = valuesRef.current;
    el.textContent = '';
    ps.forEach((p, i) => {
      if (i > 0) {
        const comma = document.createElement('span');
        comma.className = 'pxc-ps-comma';
        comma.contentEditable = 'false';
        comma.textContent = ', ';
        el.appendChild(comma);
      }
      const seg = document.createElement('span');
      seg.className = 'pxc-seg';
      seg.dataset.pid = p.id;
      seg.style.color = colorFor(p.id);
      const v = vals[p.id] ?? '';
      seg.textContent = v;
      if (!v.trim()) {
        seg.dataset.empty = 'true';
        seg.dataset.ph = p.label.toLowerCase();
      }
      el.appendChild(seg);
    });
    const stop = document.createElement('span');
    stop.className = 'pxc-ps-stop';
    stop.contentEditable = 'false';
    stop.textContent = '.';
    el.appendChild(stop);
  }, []);

  // Repaint whenever parts/values change from OUTSIDE (agent/store) — skipped while focused.
  useEffect(() => {
    paint();
  }, [paint, parts, values]);

  /** Read the coloured runs back → push each changed part to the store (live, local re-score). */
  const handleInput = useCallback(() => {
    const el = lineRef.current;
    if (!el) return;
    const vals = valuesRef.current;
    el.querySelectorAll<HTMLSpanElement>('[data-pid]').forEach((seg) => {
      const id = seg.dataset.pid;
      if (!id) return;
      const v = seg.textContent ?? '';
      // keep the empty-placeholder state in sync as you type
      if (v.trim()) delete seg.dataset.empty;
      else seg.dataset.empty = 'true';
      if (v !== (vals[id] ?? '')) onChangeRef.current(id, v);
    });
  }, []);

  /** On blur, normalise whitespace + repaint (applies any agent edit queued during the edit). */
  const handleBlur = useCallback(() => {
    const el = lineRef.current;
    if (!el) return;
    el.querySelectorAll<HTMLSpanElement>('[data-pid]').forEach((seg) => {
      const id = seg.dataset.pid;
      if (!id) return;
      const cleaned = (seg.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (cleaned !== (valuesRef.current[id] ?? '')) onChangeRef.current(id, cleaned);
    });
    // let the next tick repaint from the (now-updated) store
    requestAnimationFrame(paint);
  }, [paint]);

  return (
    <div className="pxc-ps">
      <style>{CSS}</style>
      {!anyFilled ? (
        <div className="pxc-ps-empty">Describe what to create, or fill the parts in Build — they assemble here.</div>
      ) : (
        <div
          ref={lineRef}
          className="pxc-ps-line"
          data-plain={plain ? 'true' : 'false'}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          role="textbox"
          aria-multiline="true"
          aria-label="Prompt"
          onInput={handleInput}
          onBlur={handleBlur}
        />
      )}
      <div className="pxc-ps-foot">
        <div className="pxc-ps-legend">
          {!plain &&
            parts.map((p) => (
              <span key={p.id} className="pxc-ps-leg">
                <span className="pxc-ps-swatch" style={{ background: colorFor(p.id) }} /> {p.label}
              </span>
            ))}
          {plain && <span className="pxc-ps-meta">Reading mode</span>}
        </div>
        <div className="pxc-ps-right">
          <span className="pxc-ps-meta">
            {words} words · {score.overall}%
          </span>
          <button
            type="button"
            className="pxc-ps-info"
            data-on={plain ? 'true' : 'false'}
            onClick={() => setPlain((v) => !v)}
            title={plain ? 'Show color legend' : 'Read as plain text'}
          >
            i
          </button>
        </div>
      </div>
    </div>
  );
}

export default PromptString;
