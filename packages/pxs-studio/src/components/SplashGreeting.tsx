'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SplashGreeting — the personalized splash hero (a SWAPPABLE splash element, the
 * alternate to the digital-wall logo). A centered greeting + subtitle + suggestion
 * chips, personalized to the user (name) and their state (continue / curated
 * starters — see splash-suggestions). Tokens-only, calm, Claude-Design gospel.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCurrentUser } from '../lib/use-current-user';
import { useSplashSuggestions, type SplashChip } from '../lib/splash-suggestions';

export interface SplashGreetingProps {
  /** A chip was chosen — resume the last conversation or start with the chip's prompt. */
  onSelect: (chip: SplashChip) => void;
}

const CSS = `
.pxs-greet { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--a2ui-space-4); }
.pxs-greet-title {
  font-size: clamp(2rem, 4.5vw, 3rem); font-weight: 600; letter-spacing: -0.02em;
  line-height: var(--a2ui-leading-tight); color: var(--a2ui-text-primary); margin: 0;
}
.pxs-greet-sub {
  font-size: clamp(1rem, 1.6vw, 1.25rem); color: var(--a2ui-text-tertiary);
  line-height: var(--a2ui-leading-normal); margin: 0; max-width: 40ch;
}
.pxs-greet-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--a2ui-space-2); margin-top: var(--a2ui-space-2); }
.pxs-greet-chip {
  display: inline-flex; align-items: center; height: 40px; padding: 0 18px;
  background: var(--a2ui-bg-secondary); border: 1px solid var(--a2ui-border-default);
  border-radius: var(--a2ui-radius-full); color: var(--a2ui-text-secondary);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-md); cursor: pointer;
  transition: border-color var(--a2ui-transition-fast), color var(--a2ui-transition-fast), background var(--a2ui-transition-fast);
}
.pxs-greet-chip:hover { border-color: var(--a2ui-border-strong); color: var(--a2ui-text-primary); background: var(--a2ui-bg-hover); }
`;

export function SplashGreeting({ onSelect }: SplashGreetingProps) {
  const user = useCurrentUser();
  const first = (user?.firstName || user?.name || '').trim().split(/\s+/)[0];
  const chips = useSplashSuggestions();

  const title = first ? `Welcome back, ${first}.` : 'How can I help you today?';

  return (
    <div className="pxs-greet">
      <style>{CSS}</style>
      <h1 className="pxs-greet-title">{title}</h1>
      <p className="pxs-greet-sub">
        Create images and video, design logos and art — or pick up where you left off.
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
