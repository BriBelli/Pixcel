'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * ThinkingIndicator — the pre-text "thinking" loader for a chat turn.
 *
 * A calm, brand-tasteful loading state shown while the assistant is thinking,
 * before text streams. Adapted (NOT copied) from photolif's thinking indicator:
 * we keep the calm, muted register (tertiary/secondary text) and the slot-reel
 * idea for a future multi-step feed, but drop the avatar/spinner/elapsed chrome.
 *
 * TWO treatments, one component:
 *   • SINGLE phase (today) — the route emits ONE status ("Thinking…"). We make
 *     that beautiful with a soft SHIMMER sweep: a moving highlight glides across
 *     the label left→right, giving quiet "alive" motion without a spinner. The
 *     label sits at --a2ui-text-secondary; the sweep lifts a slice to primary.
 *   • MULTI phase (future) — pass `steps` and it renders a slot-machine REEL:
 *     the reel translates so the current step is centered, the current step is
 *     opacity 1, the rest 0.35, each on --a2ui-ease-entrance. Steps fade in from
 *     translateY(4px). This lets an orchestrator feed many rows later with no
 *     component change — same contract shape as PlanRows' `steps[]`.
 *
 * Tokens-only, sentence case, no bounce/scale-pop. Reduced motion → static label
 * (no shimmer, no reel transition). One easing curve throughout:
 * --a2ui-ease-entrance = cubic-bezier(0.22, 1, 0.36, 1).
 * ───────────────────────────────────────────────────────────────────────────── */

export type ThinkingStepState = 'pending' | 'active' | 'done';

export interface ThinkingStep {
  label: string;
  state: ThinkingStepState;
}

export interface ThinkingIndicatorProps {
  /** The current status label for the single-phase case (default "Thinking…"). */
  message?: string;
  /** Optional multi-step feed — renders the slot-machine reel when present. */
  steps?: ThinkingStep[];
}

/** Height of one reel row (px) — the reel translates by this per step. */
const REEL_STEP_H = 24;

const CSS = `
/* Shimmer sweep — a moving highlight glides across the label. The text is
   painted as a gradient (secondary → primary → secondary) clipped to the
   glyphs; animating the background-position slides the bright band across. */
@keyframes pxc-think-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
/* Reel steps fade up on mount (matches photolif's translateY(4px) entrance). */
@keyframes pxc-think-step-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.pxc-think {
  display: flex; align-items: center;
  font-size: var(--a2ui-text-md); line-height: var(--a2ui-leading-normal);
}

/* ── Single-phase shimmer label ─────────────────────────────── */
.pxc-think__label {
  color: var(--a2ui-text-secondary);
  background: linear-gradient(
    100deg,
    var(--a2ui-text-secondary) 0%,
    var(--a2ui-text-secondary) 35%,
    var(--a2ui-text-primary) 50%,
    var(--a2ui-text-secondary) 65%,
    var(--a2ui-text-secondary) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: pxc-think-shimmer 2200ms var(--a2ui-ease-entrance) infinite;
}

/* ── Multi-phase slot-machine reel ──────────────────────────── */
.pxc-think__reel-window {
  height: ${REEL_STEP_H}px; overflow: hidden; position: relative; width: 100%;
}
.pxc-think__reel {
  display: flex; flex-direction: column;
  transition: transform 450ms var(--a2ui-ease-entrance);
}
.pxc-think__step {
  height: ${REEL_STEP_H}px; flex-shrink: 0;
  display: flex; align-items: center; gap: var(--a2ui-space-2);
  color: var(--a2ui-text-tertiary);
  opacity: 0.35;
  transition: opacity 300ms var(--a2ui-ease-entrance), color 300ms var(--a2ui-ease-entrance);
  animation: pxc-think-step-in 300ms var(--a2ui-ease-entrance) both;
}
.pxc-think__step--current { opacity: 1; color: var(--a2ui-text-primary); }
.pxc-think__step--done    { color: var(--a2ui-text-tertiary); }
.pxc-think__step-label {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
  .pxc-think__label {
    animation: none;
    -webkit-text-fill-color: var(--a2ui-text-secondary);
    color: var(--a2ui-text-secondary);
  }
  .pxc-think__reel { transition: none; }
  .pxc-think__step { animation: none; }
}
`;

/** The index of the step the reel should center on — first non-done, else last. */
function currentStepIndex(steps: ThinkingStep[]): number {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].state !== 'done') return i;
  }
  return steps.length - 1;
}

function ReelSteps({ steps }: { steps: ThinkingStep[] }) {
  const active = currentStepIndex(steps);
  const offset = -active * REEL_STEP_H;
  return (
    <div className="pxc-think__reel-window">
      <div className="pxc-think__reel" style={{ transform: `translateY(${offset}px)` }}>
        {steps.map((step, i) => {
          const cls =
            i === active
              ? 'pxc-think__step pxc-think__step--current'
              : step.state === 'done'
                ? 'pxc-think__step pxc-think__step--done'
                : 'pxc-think__step';
          return (
            <div key={i} className={cls}>
              <span className="pxc-think__step-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ThinkingIndicator({ message, steps }: ThinkingIndicatorProps) {
  const label = message?.trim() || 'Thinking…';
  const hasSteps = Array.isArray(steps) && steps.length > 0;

  return (
    <>
      <style>{CSS}</style>
      <div className="pxc-think" role="status" aria-live="polite">
        {hasSteps ? (
          <ReelSteps steps={steps!} />
        ) : (
          <span className="pxc-think__label">{label}</span>
        )}
      </div>
    </>
  );
}

export default ThinkingIndicator;
