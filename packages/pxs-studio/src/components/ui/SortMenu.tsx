'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SortMenu — the "Date added ▾" sort control (Assets/Projects). A glass popover of
 * options with a check on the active one (macOS-Finder affordance). Built as a small
 * custom menu (not a native <select>) so it can carry the check + glass styling; it
 * still closes on click-outside / Escape and is listbox-role for a11y. Tokens-only.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface SortMenuOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SortMenuProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SortMenuOption<T>[];
  /** Accessible name for the trigger + menu. */
  label?: string;
}

const CSS = `
.a2-sort { position: relative; display: inline-block; }
.a2-sort-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 10px 0 12px;
  background: var(--a2ui-bg-secondary); border: 1px solid var(--a2ui-border-default);
  border-radius: var(--a2ui-radius-md); color: var(--a2ui-text-secondary);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm); cursor: pointer;
  transition: border-color var(--a2ui-transition-fast), color var(--a2ui-transition-fast);
}
.a2-sort-btn:hover { color: var(--a2ui-text-primary); border-color: var(--a2ui-accent); }
.a2-sort-btn svg { color: var(--a2ui-text-tertiary); }
.a2-sort-menu {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: var(--a2ui-z-dropdown);
  min-width: 168px; padding: 6px; display: flex; flex-direction: column; gap: 2px;
  background: var(--pxc-bg-glass-frost);
  backdrop-filter: var(--pxc-glass-filter); -webkit-backdrop-filter: var(--pxc-glass-filter);
  border: 1px solid var(--pxc-stroke); border-radius: var(--a2ui-radius-lg);
  box-shadow: var(--a2ui-shadow-lg); animation: a2-sort-in 120ms ease;
}
@keyframes a2-sort-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.a2-sort-item {
  display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 10px 0 6px;
  border: none; background: transparent; color: var(--a2ui-text-secondary);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm); text-align: left; cursor: pointer;
  border-radius: var(--a2ui-radius-md);
  transition: background var(--a2ui-transition-fast), color var(--a2ui-transition-fast);
}
.a2-sort-item:hover { background: var(--a2ui-bg-hover); color: var(--a2ui-text-primary); }
.a2-sort-item[data-active="true"] { color: var(--a2ui-text-primary); }
.a2-sort-check { width: 16px; display: inline-flex; align-items: center; justify-content: center; color: var(--a2ui-accent); }
@media (prefers-reduced-motion: reduce) { .a2-sort-menu { animation: none; } }
`;

export function SortMenu<T extends string = string>({
  value,
  onChange,
  options,
  label = 'Sort by',
}: SortMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="a2-sort" ref={ref}>
      <style>{CSS}</style>
      <button
        type="button"
        className="a2-sort-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current?.label}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      {open && (
        <div className="a2-sort-menu" role="listbox" aria-label={label}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className="a2-sort-item"
              data-active={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <span className="a2-sort-check">{o.value === value && <Icon name="check" size={14} />}</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SortMenu;
