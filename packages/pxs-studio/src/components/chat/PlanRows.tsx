'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * PlanRows — the pre-text "thinking" plan: step rows in three visual states.
 *   • pending → hollow circle
 *   • active  → spinner (Icon name="loader", spun like Button's a2-btn__spin)
 *   • done    → check
 *
 * For PR-4a this renders the single `status` phase as ONE row (pending → active
 * → done as the turn progresses). It takes a `steps[]` array so the orchestrator
 * can feed many rows later without changing the component. Shown pre-text only;
 * the caller collapses it once text begins to stream. Tokens-only.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon } from '../ui';

export type PlanStepState = 'pending' | 'active' | 'done';

export interface PlanStep {
  label: string;
  state: PlanStepState;
}

export interface PlanRowsProps {
  steps: PlanStep[];
}

const CSS = `
@keyframes pxc-plan-spin { to { transform: rotate(360deg); } }
.pxc-plan { display: flex; flex-direction: column; gap: var(--a2ui-space-2); }
.pxc-plan__row { display: flex; align-items: center; gap: var(--a2ui-space-2);
  font-size: var(--a2ui-text-md); line-height: var(--a2ui-leading-normal); }
.pxc-plan__glyph { display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; flex-shrink: 0; }
.pxc-plan__dot { width: 10px; height: 10px; border-radius: var(--a2ui-radius-full);
  border: 1.5px solid var(--a2ui-text-tertiary); box-sizing: border-box; }
.pxc-plan__spin { animation: pxc-plan-spin 800ms linear infinite; color: var(--a2ui-accent); }
.pxc-plan__check { color: var(--a2ui-success); }
.pxc-plan__label--pending { color: var(--a2ui-text-tertiary); }
.pxc-plan__label--active  { color: var(--a2ui-text-primary); }
.pxc-plan__label--done    { color: var(--a2ui-text-secondary); }
`;

function StepGlyph({ state }: { state: PlanStepState }) {
  if (state === 'active') {
    return (
      <span className="pxc-plan__glyph">
        <Icon name="loader" size={14} className="pxc-plan__spin" />
      </span>
    );
  }
  if (state === 'done') {
    return (
      <span className="pxc-plan__glyph">
        <Icon name="check" size={14} className="pxc-plan__check" />
      </span>
    );
  }
  return (
    <span className="pxc-plan__glyph">
      <span className="pxc-plan__dot" />
    </span>
  );
}

export function PlanRows({ steps }: PlanRowsProps) {
  if (steps.length === 0) return null;
  return (
    <>
      <style>{CSS}</style>
      <div className="pxc-plan" role="status" aria-live="polite">
        {steps.map((step, i) => (
          <div key={i} className="pxc-plan__row">
            <StepGlyph state={step.state} />
            <span className={`pxc-plan__label--${step.state}`}>{step.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default PlanRows;
