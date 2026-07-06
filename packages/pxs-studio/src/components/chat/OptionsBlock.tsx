'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * OptionsBlock — the A2UI "options" surface, rendered as a STACKED choice group.
 *
 *   • select: 'single'   → radio rows. Clicking a row selects + submits it.
 *   • select: 'multiple' → checkbox rows + a "Continue" button that submits the
 *                          combined selection.
 *
 * Tokens-only, sentence case, no scale-pop. The indicator is a token-drawn
 * radio circle / checkbox square that fills with the accent when chosen.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { Button, Card, Icon } from '../ui';
import type { A2UIOptionsBlock } from '../../store/chat-turns-store';

export interface OptionsBlockProps {
  block: A2UIOptionsBlock;
  /** Submit the choice as the next turn. For multi-select, id/label are comma-joined. */
  onSubmit: (id: string, label: string) => void;
}

const CSS = `
.pxc-opts-title {
  font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-semibold);
  color: var(--a2ui-text-secondary); margin-bottom: var(--a2ui-space-3);
}
.pxc-opts-list { display: flex; flex-direction: column; gap: var(--a2ui-space-1); }

.pxc-opt {
  display: flex; align-items: center; gap: var(--a2ui-space-3);
  width: 100%; text-align: left; cursor: pointer;
  padding: var(--a2ui-space-2) var(--a2ui-space-3);
  border: none; background: transparent;
  border-radius: var(--a2ui-radius-md);
  color: var(--a2ui-text-primary);
  font-size: var(--a2ui-text-md); font-family: var(--a2ui-font-family);
  transition: background var(--a2ui-transition-fast);
}
.pxc-opt:hover { background: var(--a2ui-bg-hover); }
.pxc-opt.selected { background: var(--a2ui-accent-subtle); }
.pxc-opt:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }

/* Indicator — a token-drawn radio circle / checkbox square. */
.pxc-opt-ind {
  flex-shrink: 0; width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid var(--a2ui-border-strong);
  transition: border-color var(--a2ui-transition-fast), background var(--a2ui-transition-fast);
}
.pxc-opt-ind.radio { border-radius: var(--a2ui-radius-full); }
.pxc-opt-ind.checkbox { border-radius: var(--a2ui-radius-sm); }
.pxc-opt.selected .pxc-opt-ind { border-color: var(--a2ui-accent); }
.pxc-opt.selected .pxc-opt-ind.checkbox { background: var(--a2ui-accent); }
.pxc-opt-dot {
  width: 9px; height: 9px; border-radius: var(--a2ui-radius-full);
  background: var(--a2ui-accent);
}
.pxc-opt-ind .pxc-opt-check { color: var(--a2ui-text-inverse); }

.pxc-opts-footer { margin-top: var(--a2ui-space-3); display: flex; }
`;

export function OptionsBlock({ block, onSubmit }: OptionsBlockProps) {
  const multiple = block.select === 'multiple';
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Single-select: a transient highlight on the row you clicked before the turn advances.
  const [picked, setPicked] = useState<string | null>(null);

  function handleRow(id: string, label: string) {
    if (multiple) {
      setChecked((cur) => {
        const next = new Set(cur);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setPicked(id);
      onSubmit(id, label);
    }
  }

  function handleContinue() {
    const chosen = block.options.filter((o) => checked.has(o.id));
    if (chosen.length === 0) return;
    onSubmit(chosen.map((o) => o.id).join(','), chosen.map((o) => o.label).join(', '));
  }

  return (
    <Card>
      <style>{CSS}</style>
      <div className="pxc-opts-title">{block.title}</div>

      <div className="pxc-opts-list" role={multiple ? 'group' : 'radiogroup'}>
        {block.options.map((o) => {
          const isSelected = multiple ? checked.has(o.id) : picked === o.id;
          return (
            <button
              key={o.id}
              type="button"
              className={`pxc-opt${isSelected ? ' selected' : ''}`}
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              onClick={() => handleRow(o.id, o.label)}
            >
              <span className={`pxc-opt-ind ${multiple ? 'checkbox' : 'radio'}`}>
                {isSelected &&
                  (multiple ? (
                    <Icon name="check" size={12} className="pxc-opt-check" />
                  ) : (
                    <span className="pxc-opt-dot" />
                  ))}
              </span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>

      {multiple && (
        <div className="pxc-opts-footer">
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={checked.size === 0}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      )}
    </Card>
  );
}

export default OptionsBlock;
