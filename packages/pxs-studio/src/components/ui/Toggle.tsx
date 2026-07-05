'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Toggle — the settings switch. Photolif-exact geometry:
 *   40×22 track, 16×16 thumb, --a2ui-bg-tertiary → --a2ui-accent when on,
 *   thumb translateX(18px), 2px accent-subtle focus halo (box-shadow, never outline).
 * Tokens-only, no scale-pop. The hidden checkbox owns focus + a11y.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name (aria-label) — required so the bare switch is labelled. */
  label: string;
  disabled?: boolean;
  id?: string;
}

const CSS = `
.a2-toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; display: inline-block; }
.a2-toggle input { position: absolute; opacity: 0; width: 0; height: 0; margin: 0; }
.a2-toggle-track {
  position: absolute; inset: 0; cursor: pointer;
  background: var(--a2ui-bg-tertiary); border: 1px solid var(--a2ui-border-default);
  border-radius: 11px; transition: background var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast);
}
.a2-toggle-track::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  background: var(--a2ui-text-secondary); border-radius: 50%;
  transition: transform var(--a2ui-transition-fast), background var(--a2ui-transition-fast);
}
.a2-toggle input:checked + .a2-toggle-track { background: var(--a2ui-accent); border-color: var(--a2ui-accent); }
.a2-toggle input:checked + .a2-toggle-track::after { transform: translateX(18px); background: var(--a2ui-text-inverse); }
.a2-toggle input:focus-visible + .a2-toggle-track { box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.a2-toggle input:disabled + .a2-toggle-track { cursor: not-allowed; opacity: 0.5; }
`;

export function Toggle({ checked, onChange, label, disabled, id }: ToggleProps) {
  return (
    <label className="a2-toggle">
      <style>{CSS}</style>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="a2-toggle-track" aria-hidden="true" />
    </label>
  );
}

export default Toggle;
