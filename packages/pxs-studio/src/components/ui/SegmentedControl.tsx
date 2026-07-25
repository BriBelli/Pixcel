'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SegmentedControl — a compact icon segmented switch (the mock's list ⇄ grid toggle).
 * Distinct from Toggle (a boolean on/off switch): this picks ONE of N segments and
 * is the shared control for the Assets/Projects view mode. Tokens-only, no scale-pop:
 * the active segment lifts one elevation with a whisper shadow; others stay flat.
 * ───────────────────────────────────────────────────────────────────────────── */

import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string = string> {
  value: T;
  /** Accessible name + tooltip (icon-only segments are otherwise unlabelled). */
  label: string;
  icon: ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** Group aria-label. */
  label: string;
}

const CSS = `
.a2-seg {
  display: inline-flex; align-items: center; gap: 2px; padding: 2px;
  background: var(--a2ui-bg-secondary); border: 1px solid var(--a2ui-border-default);
  border-radius: var(--a2ui-radius-md);
}
.a2-seg-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 30px; height: 26px; padding: 0 9px; border: none; background: transparent; cursor: pointer;
  color: var(--a2ui-text-tertiary); border-radius: var(--a2ui-radius-sm);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm);
  transition: background var(--a2ui-transition-fast), color var(--a2ui-transition-fast);
}
.a2-seg-btn:hover { color: var(--a2ui-text-primary); background: var(--a2ui-bg-hover); }
.a2-seg-btn[data-active="true"] {
  color: var(--a2ui-text-primary); background: var(--a2ui-bg-elevated); box-shadow: var(--a2ui-shadow-sm);
}
.a2-seg-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
`;

export function SegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div className="a2-seg" role="group" aria-label={label}>
      <style>{CSS}</style>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="a2-seg-btn"
          data-active={o.value === value}
          aria-pressed={o.value === value}
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
