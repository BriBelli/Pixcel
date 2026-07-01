'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * IconButton — square, ghost by default. Matches the shell's iconBtn / rail idiom.
 *   • transparent → --a2ui-bg-hover on hover; --a2ui-bg-active on press (no scale-pop)
 *   • focus = 2px halo (never outline)
 * variants: ghost (default) / primary (accent fill) / subtle (bg-tertiary).
 * 7 states: default / hover / focus / active / disabled / loading / error.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon, type IconName } from './Icon';

export type IconButtonVariant = 'ghost' | 'primary' | 'subtle';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  variant?: IconButtonVariant;
  loading?: boolean;
  error?: boolean;
  active?: boolean;
  size?: number; // glyph size
  boxSize?: number; // button square size
  label: string; // required — accessible name (title + aria-label)
}

const CSS = `
.a2-iconbtn {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  background: transparent; color: var(--a2ui-text-secondary);
  border: 1px solid transparent; border-radius: var(--a2ui-radius-md); cursor: pointer; padding: 0;
  transition: background var(--a2ui-transition-fast), color var(--a2ui-transition-fast),
              border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast);
}
.a2-iconbtn:hover:not(:disabled):not(.a2-iconbtn--active) { background: var(--a2ui-bg-hover); color: var(--a2ui-text-primary); }
.a2-iconbtn:active:not(:disabled) { background: var(--a2ui-bg-active); }
.a2-iconbtn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.a2-iconbtn--active { background: var(--a2ui-bg-active); color: var(--a2ui-text-primary); }

.a2-iconbtn--primary { background: var(--a2ui-accent); color: var(--a2ui-text-inverse); }
.a2-iconbtn--primary:hover:not(:disabled) { background: var(--a2ui-accent-hover); }
.a2-iconbtn--primary:active:not(:disabled) { background: var(--a2ui-accent-active); }

.a2-iconbtn--subtle { background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-primary); }
.a2-iconbtn--subtle:hover:not(:disabled) { background: var(--a2ui-bg-elevated); }
.a2-iconbtn--subtle:active:not(:disabled) { background: var(--a2ui-bg-active); }

.a2-iconbtn--error { color: var(--a2ui-error); }
.a2-iconbtn--error:hover:not(:disabled) { background: var(--a2ui-error-bg); color: var(--a2ui-error); }
.a2-iconbtn--error:focus-visible { box-shadow: 0 0 0 2px var(--a2ui-error-bg); }

.a2-iconbtn:disabled { cursor: not-allowed; color: var(--a2ui-text-disabled); background: transparent; }
.a2-iconbtn--primary:disabled { background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-disabled); }
.a2-iconbtn--subtle:disabled { background: var(--a2ui-bg-secondary); color: var(--a2ui-text-disabled); }
.a2-iconbtn[aria-busy="true"] { cursor: progress; }
.a2-iconbtn__spin { animation: a2-spin 800ms linear infinite; }
@keyframes a2-spin { to { transform: rotate(360deg); } }
`;

export function IconButton({
  icon,
  variant = 'ghost',
  loading = false,
  error = false,
  active = false,
  size = 18,
  boxSize = 34,
  label,
  disabled,
  className,
  style,
  ...rest
}: IconButtonProps) {
  const cls = [
    'a2-iconbtn',
    error ? 'a2-iconbtn--error' : variant !== 'ghost' ? `a2-iconbtn--${variant}` : '',
    active ? 'a2-iconbtn--active' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{CSS}</style>
      <button
        className={cls}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-pressed={active || undefined}
        title={label}
        aria-label={label}
        style={{ width: boxSize, height: boxSize, ...style }}
        {...rest}
      >
        <Icon name={loading ? 'loader' : icon} size={size} className={loading ? 'a2-iconbtn__spin' : undefined} />
      </button>
    </>
  );
}

export default IconButton;
