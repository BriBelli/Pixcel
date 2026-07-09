'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SplashGreeting — the personalized splash hero (a SWAPPABLE splash element, the
 * alternate to the digital-wall logo). A centered greeting + subtitle + suggestion
 * chips, personalized to the user (name) and their state (continue / curated
 * starters — see splash-suggestions). Tokens-only, calm, Claude-Design gospel.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useSplashState, type SplashChip } from '../lib/splash-suggestions';

export interface SplashGreetingProps {
  /** A chip was chosen — resume a project or start with the chip's prompt. */
  onSelect: (chip: SplashChip) => void;
}

/* Lighter, calmer, graceful — NOT a heavy hero. Medium weight (never bold), restrained size; a
   quiet subtitle; small subtle chips. Tokens/brand only. */
const CSS = `
/* Optical centering: a programmatic center reads as "sinking" to the eye. translateY(-50%)
   nudges the block up by HALF ITS OWN HEIGHT (transform %s resolve against the element's own
   size, unlike margin %s which resolve against the parent's WIDTH) — dynamic, no magic number. */
.pxs-greet { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--a2ui-space-3); transform: translateY(-50%); }
.pxs-greet-title {
  font-size: clamp(1.375rem, 2.6vw, 1.75rem); font-weight: var(--a2ui-font-medium, 500);
  letter-spacing: -0.01em; line-height: var(--a2ui-leading-tight);
  color: var(--a2ui-text-primary); margin: 0;
}
.pxs-greet-sub {
  font-size: clamp(0.875rem, 1.2vw, 1rem); color: var(--a2ui-text-tertiary);
  line-height: var(--a2ui-leading-normal); margin: 0; max-width: 42ch;
}
.pxs-greet-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--a2ui-space-2); margin-top: var(--a2ui-space-2); }
.pxs-greet-chip {
  display: inline-flex; align-items: center; height: 32px; padding: 0 14px;
  background: var(--a2ui-bg-secondary); border: 1px solid var(--a2ui-border-subtle);
  border-radius: var(--a2ui-radius-full); color: var(--a2ui-text-tertiary);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm); cursor: pointer;
  transition: border-color var(--a2ui-transition-fast), color var(--a2ui-transition-fast), background var(--a2ui-transition-fast);
}
.pxs-greet-chip:hover { border-color: var(--a2ui-border-default); color: var(--a2ui-text-primary); background: var(--a2ui-bg-hover); }
`;

export function SplashGreeting({ onSelect }: SplashGreetingProps) {
  const { chips } = useSplashState();

  return (
    <div className="pxs-greet">
      <style>{CSS}</style>
      <h1 className="pxs-greet-title">How can I help you today?</h1>
      <p className="pxs-greet-sub">
        Welcome to Pixcel studio — your team of AI specialists.
      </p>
      {chips.length > 0 && (
        <div className="pxs-greet-chips">
          {chips.map((c) => (
            <button key={c.id} type="button" className="pxs-greet-chip" onClick={() => onSelect(c)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SplashGreeting;
