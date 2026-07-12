'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SplashGreeting — the personalized splash hero (a SWAPPABLE splash element, the
 * alternate to the digital-wall logo). A centered greeting + subtitle + suggestion
 * chips, personalized to the user (name) and their state (continue / curated
 * starters — see splash-suggestions). Tokens-only, calm, Claude-Design gospel.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCurrentUser } from '../lib/use-current-user';
import { useSplashState, type SplashChip } from '../lib/splash-suggestions';
import { GreetingHero } from './GreetingHero';

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
.pxs-greet { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--a2ui-space-2); transform: translateY(-50%); }
/* The title + subtitle lockup is the shared <GreetingHero> (tune the type there — universal). */
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

/** Suggestion chips are HIDDEN for now (hard to read / not useful yet) — the code stays, and the
 *  "suggestions" surface gets refactored later. Flip to re-enable. */
const SHOW_CHIPS = false;

export function SplashGreeting({ onSelect }: SplashGreetingProps) {
  const { chips, hasProjects, loading } = useSplashState();
  const user = useCurrentUser();
  const first = (user?.firstName || user?.name || '').trim().split(/\s+/)[0];

  // State-aware (real, not filler): a RETURNING user (has recent projects) gets a personalized
  // welcome + a resume nudge; a first visit gets the open, orienting greeting. `loading` guards
  // against flashing the "new user" copy before the recent-projects fetch resolves.
  // DEV preview: `?new` forces the first-visit state so the new-user copy can be eyeballed even
  // when the DB has projects (a reviewer is always "returning" otherwise).
  const forceNew =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('new');
  const returning = !forceNew && !loading && hasProjects;
  const title = returning
    ? first
      ? `Welcome back, ${first}.`
      : 'Welcome back.'
    : 'What are we making today?';
  const subtitle = returning
    ? 'Pick up where you left off, or start something new.'
    : "Your studio's ready — lets take your idea to the final cut.";

  return (
    <div className="pxs-greet">
      <style>{CSS}</style>
      <GreetingHero title={title} subtitle={subtitle} />
      {SHOW_CHIPS && chips.length > 0 && (
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
