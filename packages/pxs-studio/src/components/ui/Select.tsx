'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Select — the settings dropdown. Photolif-exact:
 *   bg-secondary, border-default → accent on focus/hover, inline chevron glyph,
 *   min-width 130, radius-md, 2px accent-subtle focus halo (box-shadow, never outline).
 * Native <select> for a11y + keyboard; the chevron is a CSS background so the
 * control stays one element. Tokens-only.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Accessible name (aria-label). */
  label: string;
  disabled?: boolean;
  id?: string;
}

// Chevron matches the Icon `chevron-down` path, rendered as an inline data-URI so
// the control is a single native <select> (keeps native keyboard/a11y behavior).
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23909098' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

const CSS = `
.a2-select {
  appearance: none; -webkit-appearance: none; -moz-appearance: none;
  min-width: 130px; padding: 6px 32px 6px 10px;
  background-color: var(--a2ui-bg-secondary);
  border: 1px solid var(--a2ui-border-default); border-radius: var(--a2ui-radius-md);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm); color: var(--a2ui-text-primary);
  cursor: pointer; line-height: 1.4;
  background-image: ${CHEVRON}; background-repeat: no-repeat; background-position: right 8px center;
  transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast);
}
.a2-select:hover:not(:disabled) { border-color: var(--a2ui-accent); }
.a2-select:focus-visible { outline: none; border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.a2-select:disabled { cursor: not-allowed; color: var(--a2ui-text-disabled); }
`;

export function Select({ value, onChange, options, label, disabled, id }: SelectProps) {
  return (
    <>
      <style>{CSS}</style>
      <select
        className="a2-select"
        id={id}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </>
  );
}

export default Select;
