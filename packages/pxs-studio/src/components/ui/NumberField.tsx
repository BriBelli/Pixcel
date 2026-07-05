'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * NumberField — the settings number input. Photolif-exact:
 *   64px wide, centered, native spinners hidden, bg-secondary, border-default →
 *   accent on focus, radius-md, 2px accent-subtle focus halo (box-shadow, never outline).
 * Commits on change/blur and clamps into [min, max]; a non-numeric entry falls back
 * to the current value. Tokens-only.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';

export interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  /** Accessible name (aria-label). */
  label: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
}

const CSS = `
.a2-number {
  width: 64px; text-align: center;
  appearance: none; -moz-appearance: textfield;
  padding: 6px 8px;
  background: var(--a2ui-bg-secondary);
  border: 1px solid var(--a2ui-border-default); border-radius: var(--a2ui-radius-md);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm); color: var(--a2ui-text-primary);
  transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast);
}
.a2-number::-webkit-inner-spin-button, .a2-number::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.a2-number:focus-visible { outline: none; border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.a2-number:disabled { cursor: not-allowed; color: var(--a2ui-text-disabled); }
`;

export function NumberField({
  value,
  onChange,
  label,
  min,
  max,
  step,
  disabled,
  id,
}: NumberFieldProps) {
  // Local draft so mid-typing (empty / partial) doesn't fight the clamped store value.
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setDraft(String(value)); // revert to last valid
      return;
    }
    let clamped = n;
    if (min != null) clamped = Math.max(min, clamped);
    if (max != null) clamped = Math.min(max, clamped);
    onChange(clamped);
    setDraft(String(clamped));
  };

  return (
    <>
      <style>{CSS}</style>
      <input
        type="number"
        className="a2-number"
        id={id}
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
        }}
      />
    </>
  );
}

export default NumberField;
