'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Button — primary / secondary / ghost. Claude Design handoff §5 + hard rules.
 *   • primary   → fill --a2ui-accent, text --a2ui-text-inverse
 *   • secondary → --a2ui-bg-tertiary + --a2ui-text-primary
 *   • ghost     → transparent → --a2ui-bg-hover on hover
 * 8px radius (--a2ui-radius-md), 36–40px height, sentence case.
 * 7 states: default / hover / focus / active / disabled / loading / error.
 *   - focus  = 2px halo via box-shadow (--a2ui-accent-subtle), never outline
 *   - active = --a2ui-bg-active overlay, NO scale-pop
 *   - hover  = bg overlay / accent-hover, never opacity-only
 *   - loading = spinner + disabled (aria-busy)
 *   - error  = optional error-toned variant flag
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  loading?: boolean;
  error?: boolean;
  size?: 'md' | 'sm';
  children?: React.ReactNode;
}

const CSS = `
.a2-btn {
  --a2-btn-h: 38px;
  display: inline-flex; align-items: center; justify-content: center; gap: var(--a2ui-space-2);
  height: var(--a2-btn-h); min-width: var(--a2-btn-h); padding: 0 var(--a2ui-space-4);
  border: 1px solid transparent; border-radius: var(--a2ui-radius-md);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-md); font-weight: var(--a2ui-font-medium);
  line-height: 1; cursor: pointer; user-select: none; white-space: nowrap; position: relative;
  transition: background var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast),
              color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast);
}
.a2-btn.a2-sm { --a2-btn-h: 30px; padding: 0 var(--a2ui-space-3); font-size: var(--a2ui-text-sm); }
.a2-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }

/* primary */
.a2-btn--primary { background: var(--a2ui-accent); color: var(--a2ui-text-inverse); }
.a2-btn--primary:hover:not(:disabled) { background: var(--a2ui-accent-hover); }
.a2-btn--primary:active:not(:disabled) { background: var(--a2ui-accent-active); }
.a2-btn--primary:focus-visible { box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }

/* secondary */
.a2-btn--secondary { background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-primary); }
.a2-btn--secondary:hover:not(:disabled) { background: var(--a2ui-bg-elevated); }
.a2-btn--secondary:active:not(:disabled) { background: var(--a2ui-bg-active); }

/* ghost */
.a2-btn--ghost { background: transparent; color: var(--a2ui-text-secondary); }
.a2-btn--ghost:hover:not(:disabled) { background: var(--a2ui-bg-hover); color: var(--a2ui-text-primary); }
.a2-btn--ghost:active:not(:disabled) { background: var(--a2ui-bg-active); }

/* error variant — de-escalated: error text/border, reserved for destructive intent */
.a2-btn--error { background: var(--a2ui-error-bg); color: var(--a2ui-error); border-color: transparent; }
.a2-btn--error:hover:not(:disabled) { background: var(--a2ui-error-bg); border-color: var(--a2ui-error); }
.a2-btn--error:active:not(:disabled) { background: var(--a2ui-error-bg); }
.a2-btn--error:focus-visible { box-shadow: 0 0 0 2px var(--a2ui-error-bg); }

/* disabled + loading (loading is disabled + busy) */
.a2-btn:disabled { cursor: not-allowed; color: var(--a2ui-text-disabled); }
.a2-btn--primary:disabled { background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-disabled); }
.a2-btn--secondary:disabled { background: var(--a2ui-bg-secondary); color: var(--a2ui-text-disabled); }
.a2-btn--ghost:disabled { background: transparent; color: var(--a2ui-text-disabled); }
.a2-btn[aria-busy="true"] { cursor: progress; }
.a2-btn__spin { animation: a2-spin 800ms linear infinite; }
@keyframes a2-spin { to { transform: rotate(360deg); } }
`;

export function Button({
  variant = 'primary',
  loading = false,
  error = false,
  size = 'md',
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const cls = [
    'a2-btn',
    error ? 'a2-btn--error' : `a2-btn--${variant}`,
    size === 'sm' ? 'a2-sm' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{CSS}</style>
      <button className={cls} disabled={isDisabled} aria-busy={loading || undefined} {...rest}>
        {loading && <Icon name="loader" size={size === 'sm' ? 14 : 16} className="a2-btn__spin" />}
        {children}
      </button>
    </>
  );
}

export default Button;
