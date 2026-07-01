'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Input — text field. Claude Design handoff §5 + hard rules.
 *   • --a2ui-bg-input background, 1px --a2ui-border-default, 8px radius
 *   • focus → border becomes --a2ui-accent + 2px halo via box-shadow (--a2ui-accent-subtle)
 * 7 states: default / hover / focus / active / disabled / loading / error.
 *   - loading = trailing spinner + read-only busy
 *   - error   = border --a2ui-error + error-toned halo + optional message
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon } from './Icon';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
}

const CSS = `
.a2-field { display: inline-flex; flex-direction: column; gap: var(--a2ui-space-1); width: 100%; }
.a2-input-wrap { position: relative; display: flex; align-items: center; width: 100%; }
.a2-input {
  width: 100%; height: 38px; padding: 0 var(--a2ui-space-3);
  background: var(--a2ui-bg-input); color: var(--a2ui-text-primary);
  border: 1px solid var(--a2ui-border-default); border-radius: var(--a2ui-radius-md);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-md); line-height: 1;
  transition: background var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast),
              box-shadow var(--a2ui-transition-fast);
}
.a2-input::placeholder { color: var(--a2ui-text-tertiary); }
.a2-input:hover:not(:disabled):not(:focus) { border-color: var(--a2ui-border-strong); }
/* active = focused/typing → shift bg elevation slightly (no opacity-only cues) */
.a2-input:active:not(:disabled) { background: var(--a2ui-bg-input-focus); }
/* focus = border → accent + 2px halo (never outline) */
.a2-input:focus { outline: none; background: var(--a2ui-bg-input-focus);
  border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.a2-input:disabled { cursor: not-allowed; color: var(--a2ui-text-disabled);
  background: var(--a2ui-bg-secondary); border-color: var(--a2ui-border-subtle); }
.a2-input:disabled::placeholder { color: var(--a2ui-text-disabled); }

/* error */
.a2-input--error { border-color: var(--a2ui-error); }
.a2-input--error:focus { border-color: var(--a2ui-error); box-shadow: 0 0 0 2px var(--a2ui-error-bg); }

/* loading spinner (trailing) */
.a2-input--loading { padding-right: 34px; }
.a2-input__spin { position: absolute; right: var(--a2ui-space-3); color: var(--a2ui-text-tertiary);
  animation: a2-spin 800ms linear infinite; pointer-events: none; }
@keyframes a2-spin { to { transform: rotate(360deg); } }

.a2-field__err { font-size: var(--a2ui-text-sm); color: var(--a2ui-error); }
`;

export function Input({ loading = false, error = false, errorMessage, disabled, className, ...rest }: InputProps) {
  const inputCls = [
    'a2-input',
    error ? 'a2-input--error' : '',
    loading ? 'a2-input--loading' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{CSS}</style>
      <span className="a2-field">
        <span className="a2-input-wrap">
          <input
            className={inputCls}
            disabled={disabled || loading}
            aria-invalid={error || undefined}
            aria-busy={loading || undefined}
            {...rest}
          />
          {loading && <Icon name="loader" size={16} className="a2-input__spin" />}
        </span>
        {error && errorMessage && <span className="a2-field__err">{errorMessage}</span>}
      </span>
    </>
  );
}

export default Input;
