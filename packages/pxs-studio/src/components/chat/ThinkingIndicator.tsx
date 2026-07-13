'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * ThinkingIndicator — the pre-text "thinking" loader for a chat turn.
 *
 * TWO axes, both user settings (constructive-not-destructive — cover every persona, mix freely):
 *   • Loading DETAIL (how much) — basic · moderate · thought   (settings-store.loadingDetail)
 *   • Loading STYLE  (how it animates) — basic · focus · stack  (settings-store.loadingStyle)
 *
 * Concepts ported from photolif's proven a2ui-thinking-indicator (months of real users), rebuilt as
 * our tokens-only React version. Photolif's 4 detail tiers collapse to 3 here (moderate⇄comprehensive
 * blurred — its only extra was per-step detail text, folded into 'thought').
 *
 *   DETAIL   basic    → no steps; the chauffeured "working" shimmer (agency motion, errors only)
 *            moderate → the named workflow milestones, clean labels
 *            thought  → milestones + per-step detail + a collapsible chain-of-thought panel
 *
 *   STYLE    basic    → minimal: just the current line, cross-fading (most non-engineering, mobile)
 *            focus    → slot machine: one active step in a single-line window, the reel rolls as
 *                       steps advance; a soft top/bottom mask dissolves a step as it rolls out (our
 *                       polish over photolif's hard clip — Brian's "fading into the top of the y-index")
 *            stack    → steps append as a scrollable stack, newest at the bottom
 *
 * Tokens-only, calm register (no avatar/heavy spinner), sentence case, one easing curve
 * (--a2ui-ease-entrance). Reduced motion → static. The component reads the settings itself, so every
 * call site just passes `steps` (+ optional `message`); pass `detail`/`style` only to override.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { useSettings, type LoadingDetail, type LoadingStyle } from '../../store/settings-store';

export type ThinkingStepState = 'pending' | 'active' | 'done';

export interface ThinkingStep {
  /** Backend step id (e.g. 'reading', 'choosing') — used to match start/done events. */
  id?: string;
  label: string;
  state: ThinkingStepState;
  /** Optional sub-text (a tool target / short note) — shown only in 'thought' detail. */
  detail?: string;
  /** Optional chain-of-thought prose — feeds the 'thought' reasoning panel. */
  reasoning?: string;
}

export interface ThinkingIndicatorProps {
  /** The status label for the no-steps case (default "Thinking…"). */
  message?: string;
  /** The multi-step feed. Filtered + animated per the settings. */
  steps?: ThinkingStep[];
  /** Override the loading detail (defaults to the user setting). */
  detail?: LoadingDetail;
  /** Override the loading style (defaults to the user setting). */
  style?: LoadingStyle;
}

/** Height of one reel row (px) — the focus reel translates by this per step. */
const REEL_STEP_H = 24;

const CSS = `
@keyframes pxc-think-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes pxc-think-step-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pxc-think-fade { from { opacity: 0; } to { opacity: 1; } }

.pxc-think { display: flex; flex-direction: column; gap: var(--a2ui-space-2);
  font-size: var(--a2ui-text-md); line-height: var(--a2ui-leading-normal); min-width: 0; }
.pxc-think__head { display: flex; align-items: baseline; gap: var(--a2ui-space-2); }

/* ── Shimmer label (basic detail, or basic style current-line) ─────────────── */
.pxc-think__label {
  color: var(--a2ui-text-secondary);
  background: linear-gradient(100deg,
    var(--a2ui-text-secondary) 0%, var(--a2ui-text-secondary) 35%,
    var(--a2ui-text-primary) 50%,
    var(--a2ui-text-secondary) 65%, var(--a2ui-text-secondary) 100%);
  background-size: 200% 100%; -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: pxc-think-shimmer 2200ms var(--a2ui-ease-entrance) infinite;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pxc-think__elapsed { color: var(--a2ui-text-tertiary); font-size: var(--a2ui-text-xs);
  font-variant-numeric: tabular-nums; flex-shrink: 0; }

/* ── Shared step ───────────────────────────────────────────────────────────── */
.pxc-think__step { display: flex; align-items: flex-start; gap: var(--a2ui-space-2);
  color: var(--a2ui-text-tertiary); min-width: 0; }
.pxc-think__step-check { flex-shrink: 0; width: 12px; height: 12px; margin-top: 4px; color: var(--a2ui-success); }
.pxc-think__step-spin { flex-shrink: 0; width: 10px; height: 10px; margin-top: 5px;
  border: 1.5px solid var(--a2ui-border-default); border-top-color: var(--a2ui-text-tertiary);
  border-radius: 50%; animation: pxc-think-spin 0.8s linear infinite; }
@keyframes pxc-think-spin { to { transform: rotate(360deg); } }
.pxc-think__step-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pxc-think__step-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pxc-think__step-detail { color: var(--a2ui-accent); font-size: 10px; font-style: italic; opacity: 0.85;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Style: focus (slot machine) ───────────────────────────────────────────── */
.pxc-think__reel-window {
  height: ${REEL_STEP_H}px; overflow: hidden; position: relative; width: 100%;
  /* Our polish: dissolve a step as it rolls out the top / in from the bottom. */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
}
.pxc-think__reel { display: flex; flex-direction: column; transition: transform 450ms var(--a2ui-ease-entrance); }
.pxc-think__reel .pxc-think__step { height: ${REEL_STEP_H}px; flex-shrink: 0; align-items: center;
  opacity: 0.35; transition: opacity 300ms var(--a2ui-ease-entrance), color 300ms var(--a2ui-ease-entrance); }
.pxc-think__reel .pxc-think__step--current { opacity: 1; color: var(--a2ui-text-primary); }

/* ── Style: stack ──────────────────────────────────────────────────────────── */
.pxc-think__stack { display: flex; flex-direction: column; gap: 3px; max-height: 148px; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: var(--a2ui-border-default) transparent; }
.pxc-think__stack::-webkit-scrollbar { width: 4px; }
.pxc-think__stack::-webkit-scrollbar-thumb { background: var(--a2ui-border-default); border-radius: 2px; }
.pxc-think__stack .pxc-think__step { animation: pxc-think-step-in 300ms var(--a2ui-ease-entrance) both; }
.pxc-think__stack .pxc-think__step--current { color: var(--a2ui-text-primary); }
.pxc-think__stack .pxc-think__step--done { opacity: 0.5; }

/* ── Thought panel (chain-of-thought) ──────────────────────────────────────── */
.pxc-think__thought { border-left: 2px solid var(--a2ui-border-subtle); padding-left: var(--a2ui-space-3); }
.pxc-think__thought-toggle { display: flex; align-items: center; gap: var(--a2ui-space-1);
  background: none; border: none; padding: var(--a2ui-space-1) 0; color: var(--a2ui-text-tertiary);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-xs); font-weight: var(--a2ui-font-medium); cursor: pointer; }
.pxc-think__thought-toggle:hover { color: var(--a2ui-text-secondary); }
.pxc-think__chev { width: 10px; height: 10px; transition: transform 0.2s ease; }
.pxc-think__chev--open { transform: rotate(90deg); }
.pxc-think__thought-body { max-height: 180px; overflow-y: auto; padding: var(--a2ui-space-1) 0;
  scrollbar-width: thin; scrollbar-color: var(--a2ui-border-default) transparent;
  animation: pxc-think-fade 0.2s ease forwards; }
.pxc-think__thought-body::-webkit-scrollbar { width: 4px; }
.pxc-think__thought-body::-webkit-scrollbar-thumb { background: var(--a2ui-border-default); border-radius: 2px; }
.pxc-think__thought-entry { font-size: 11px; line-height: 1.5; color: var(--a2ui-text-tertiary);
  padding: 2px 0; border-bottom: 1px solid var(--a2ui-border-subtle); }
.pxc-think__thought-entry:last-child { border-bottom: none; }
.pxc-think__thought-entry-label { color: var(--a2ui-text-secondary); font-weight: var(--a2ui-font-medium); margin-right: var(--a2ui-space-1); }

@media (prefers-reduced-motion: reduce) {
  .pxc-think__label { animation: none; -webkit-text-fill-color: var(--a2ui-text-secondary); color: var(--a2ui-text-secondary); }
  .pxc-think__reel { transition: none; }
  .pxc-think__stack .pxc-think__step { animation: none; }
  .pxc-think__step-spin { animation: none; }
}
`;

/** The index of the step to center on — first non-done, else the last. */
function currentStepIndex(steps: ThinkingStep[]): number {
  for (let i = 0; i < steps.length; i++) if (steps[i].state !== 'done') return i;
  return steps.length - 1;
}

function Check() {
  return (
    <svg className="pxc-think__step-check" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.5 L5 9 L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One step row (shared by focus + stack). `showDetail` reveals the sub-text (thought detail). */
function StepRow({ step, current, showDetail }: { step: ThinkingStep; current: boolean; showDetail: boolean }) {
  const cls = `pxc-think__step${current ? ' pxc-think__step--current' : ''}${step.state === 'done' ? ' pxc-think__step--done' : ''}`;
  return (
    <div className={cls}>
      {step.state === 'done' ? <Check /> : <span className="pxc-think__step-spin" />}
      <span className="pxc-think__step-text">
        <span className="pxc-think__step-label">{step.label}</span>
        {showDetail && step.detail && <span className="pxc-think__step-detail">{step.detail}</span>}
      </span>
    </div>
  );
}

/** Focus: the slot-machine reel — one active step in a masked single-line window. */
function FocusReel({ steps, showDetail }: { steps: ThinkingStep[]; showDetail: boolean }) {
  const active = currentStepIndex(steps);
  return (
    <div className="pxc-think__reel-window">
      <div className="pxc-think__reel" style={{ transform: `translateY(${-active * REEL_STEP_H}px)` }}>
        {steps.map((s, i) => (
          <StepRow key={s.id ?? i} step={s} current={i === active} showDetail={showDetail} />
        ))}
      </div>
    </div>
  );
}

/** Stack: every step, scrollable, newest at the bottom (auto-scrolled). */
function Stack({ steps, showDetail }: { steps: ThinkingStep[]; showDetail: boolean }) {
  const active = currentStepIndex(steps);
  const ref = (el: HTMLDivElement | null) => {
    if (el) el.scrollTop = el.scrollHeight;
  };
  return (
    <div className="pxc-think__stack" ref={ref}>
      {steps.map((s, i) => (
        <StepRow key={s.id ?? i} step={s} current={i === active} showDetail={showDetail} />
      ))}
    </div>
  );
}

/** The collapsible chain-of-thought panel (thought detail only). */
function ThoughtPanel({ steps }: { steps: ThinkingStep[] }) {
  const [open, setOpen] = useState(true);
  const entries = steps.filter((s) => s.reasoning?.trim());
  if (entries.length === 0) return null;
  return (
    <div className="pxc-think__thought">
      <button type="button" className="pxc-think__thought-toggle" onClick={() => setOpen((v) => !v)}>
        <svg className={`pxc-think__chev${open ? ' pxc-think__chev--open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Reasoning ({entries.length})
      </button>
      {open && (
        <div className="pxc-think__thought-body">
          {entries.map((e, i) => (
            <div key={e.id ?? i} className="pxc-think__thought-entry">
              <span className="pxc-think__thought-entry-label">{e.label}:</span>
              {e.reasoning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A live elapsed-seconds counter (shown ≥2s, for the stepped detail tiers). */
function useElapsed(active: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    setN(0);
    const t = window.setInterval(() => setN((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  return n;
}

export function ThinkingIndicator({ message, steps, detail, style }: ThinkingIndicatorProps) {
  const settingDetail = useSettings((s) => s.loadingDetail);
  const settingStyle = useSettings((s) => s.loadingStyle);
  const d = detail ?? settingDetail;
  const st = style ?? settingStyle;

  const all = Array.isArray(steps) ? steps : [];
  // DETAIL gates WHAT shows: basic → no steps; moderate/thought → the steps (thought adds sub-text + reasoning).
  const visible = d === 'basic' ? [] : all;
  const showDetailText = d === 'thought';
  const hasSteps = visible.length > 0;
  const elapsed = useElapsed(hasSteps);
  const label = message?.trim() || 'Thinking…';

  // No steps to show (basic detail, or none fed yet) → the chauffeured shimmer line.
  if (!hasSteps) {
    return (
      <>
        <style>{CSS}</style>
        <div className="pxc-think" role="status" aria-live="polite">
          <span className="pxc-think__label">{label}</span>
        </div>
      </>
    );
  }

  const current = visible[currentStepIndex(visible)];

  return (
    <>
      <style>{CSS}</style>
      <div className="pxc-think" role="status" aria-live="polite">
        {/* STYLE gates HOW it animates. basic → just the current line (shimmer). */}
        {st === 'basic' ? (
          <div className="pxc-think__head">
            <span className="pxc-think__label">{current.label}</span>
            {elapsed >= 2 && <span className="pxc-think__elapsed">{elapsed}s</span>}
          </div>
        ) : (
          <>
            {elapsed >= 2 && (
              <div className="pxc-think__head">
                <span className="pxc-think__elapsed">{elapsed}s</span>
              </div>
            )}
            {st === 'focus' ? (
              <FocusReel steps={visible} showDetail={showDetailText} />
            ) : (
              <Stack steps={visible} showDetail={showDetailText} />
            )}
          </>
        )}
        {d === 'thought' && <ThoughtPanel steps={all} />}
      </div>
    </>
  );
}

export default ThinkingIndicator;
