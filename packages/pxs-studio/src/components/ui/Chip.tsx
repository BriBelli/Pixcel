'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Chip / Pill — Claude Design handoff §5 + hard rule #12.
 *   • full radius (--a2ui-radius-full), ~12px horizontal padding, 24–28px height
 *   • default + hover + active states; `active` = selected (accent-toned)
 * Rendered as a <button> so it participates in the 7 interactive states.
 *   - focus  = 2px halo (never outline)
 *   - active-press = --a2ui-bg-active (no scale-pop)
 *   - selected = accent-subtle fill + accent text (matches shell TbChip/pill idiom)
 * ───────────────────────────────────────────────────────────────────────────── */

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children?: React.ReactNode;
}

const CSS = `
.a2-chip {
  display: inline-flex; align-items: center; gap: var(--a2ui-space-2);
  height: 28px; padding: 0 var(--a2ui-space-3);
  background: var(--a2ui-bg-secondary); color: var(--a2ui-text-secondary);
  border: 1px solid var(--a2ui-border-default); border-radius: var(--a2ui-radius-full);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-medium);
  line-height: 1; cursor: pointer; white-space: nowrap;
  transition: background var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast),
              color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast);
}
.a2-chip:hover:not(:disabled):not(.a2-chip--active) { border-color: var(--a2ui-border-strong); color: var(--a2ui-text-primary); }
.a2-chip:active:not(:disabled) { background: var(--a2ui-bg-active); }
.a2-chip:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }

.a2-chip--active { background: var(--a2ui-accent-subtle); color: var(--a2ui-accent);
  border-color: transparent; }
.a2-chip--active:hover:not(:disabled) { background: var(--a2ui-accent-subtle); }

.a2-chip:disabled { cursor: not-allowed; color: var(--a2ui-text-disabled);
  background: var(--a2ui-bg-secondary); border-color: var(--a2ui-border-subtle); }
`;

export function Chip({ active = false, className, children, ...rest }: ChipProps) {
  const cls = ['a2-chip', active ? 'a2-chip--active' : '', className || ''].filter(Boolean).join(' ');
  return (
    <>
      <style>{CSS}</style>
      <button className={cls} aria-pressed={active} {...rest}>
        {children}
      </button>
    </>
  );
}

export default Chip;
