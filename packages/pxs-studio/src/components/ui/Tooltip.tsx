'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Tooltip — small glass tooltip on hover/focus. Floating chrome rules (handoff §5):
 *   glass = rgba(18,18,22,0.82) + backdrop-filter blur(20px) + 1px rgba(255,255,255,0.08)
 *   + --a2ui-shadow-lg. (Uses the --a2ui-glass-dark / --pxs-glass-border tokens.)
 * Only for non-self-evident triggers (handoff §11 — don't tooltip every icon).
 * Appears on hover AND keyboard focus; sentence case; one short line.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  label: string;
  side?: TooltipSide;
  children: React.ReactNode;
}

const CSS = `
.a2-tt { position: relative; display: inline-flex; }
.a2-tt__pop {
  position: absolute; z-index: var(--a2ui-z-tooltip); pointer-events: none; white-space: nowrap;
  padding: 6px 10px; font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm);
  font-weight: var(--a2ui-font-medium); color: var(--a2ui-text-primary);
  background: var(--a2ui-glass-dark);
  -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
  border: 1px solid var(--pxs-glass-border); border-radius: var(--a2ui-radius-md);
  box-shadow: var(--a2ui-shadow-lg);
  opacity: 0; transform: translateY(2px);
  transition: opacity var(--a2ui-transition-fast), transform var(--a2ui-transition-fast);
}
.a2-tt[data-open="true"] .a2-tt__pop { opacity: 1; transform: translateY(0); }
.a2-tt__pop--top { bottom: calc(100% + 8px); left: 50%; transform: translate(-50%, 2px); }
.a2-tt[data-open="true"] .a2-tt__pop--top { transform: translate(-50%, 0); }
.a2-tt__pop--bottom { top: calc(100% + 8px); left: 50%; transform: translate(-50%, -2px); }
.a2-tt[data-open="true"] .a2-tt__pop--bottom { transform: translate(-50%, 0); }
.a2-tt__pop--left { right: calc(100% + 8px); top: 50%; transform: translate(2px, -50%); }
.a2-tt[data-open="true"] .a2-tt__pop--left { transform: translate(0, -50%); }
.a2-tt__pop--right { left: calc(100% + 8px); top: 50%; transform: translate(-2px, -50%); }
.a2-tt[data-open="true"] .a2-tt__pop--right { transform: translate(0, -50%); }
`;

export function Tooltip({ label, side = 'top', children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <style>{CSS}</style>
      <span
        className="a2-tt"
        data-open={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
        <span role="tooltip" className={`a2-tt__pop a2-tt__pop--${side}`}>
          {label}
        </span>
      </span>
    </>
  );
}

export default Tooltip;
