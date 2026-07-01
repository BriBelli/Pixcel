'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Card — Claude Design handoff §5 + hard rule #7.
 *   • --a2ui-bg-tertiary, 12px radius (--a2ui-radius-lg), 20px padding
 *   • NO border / NO shadow by default — earns --a2ui-border-default +
 *     --a2ui-shadow-sm ONLY on hover (when interactive).
 * `interactive` opts a card into the hover treatment + focus halo (for clickable
 * cards). Non-interactive cards are static surfaces.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children?: React.ReactNode;
}

const CSS = `
.a2-card {
  background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-primary);
  border: 1px solid transparent; border-radius: var(--a2ui-radius-lg);
  padding: var(--a2ui-space-5);
  transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast),
              background var(--a2ui-transition-fast);
}
.a2-card--interactive { cursor: pointer; }
/* hover — card earns a border + soft shadow (never opacity-only) */
.a2-card--interactive:hover { border-color: var(--a2ui-border-default); box-shadow: var(--a2ui-shadow-sm); }
/* active — no scale-pop; use bg-active overlay via elevation */
.a2-card--interactive:active { border-color: var(--a2ui-border-default); box-shadow: var(--a2ui-shadow-sm);
  background: var(--a2ui-bg-elevated); }
/* focus — 2px halo, never outline */
.a2-card--interactive:focus-visible { outline: none; border-color: var(--a2ui-border-default);
  box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
`;

export function Card({ interactive = false, className, children, tabIndex, ...rest }: CardProps) {
  const cls = ['a2-card', interactive ? 'a2-card--interactive' : '', className || ''].filter(Boolean).join(' ');
  return (
    <>
      <style>{CSS}</style>
      <div className={cls} tabIndex={interactive ? (tabIndex ?? 0) : tabIndex} {...rest}>
        {children}
      </div>
    </>
  );
}

export default Card;
