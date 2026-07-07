'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * QuestionBlock — the ONLY way an agent asks for more (A2UI, never prose).
 *
 * A formatted question affordance so the user knows exactly what's being asked and
 * where to answer — distinct from the main composer, which is the USER's own prompt
 * line. Renders: the question label + a freeform text-area field + optional tappable
 * quick-pick chips + a Send. Answering (typing + Send, ⌘/Ctrl+Enter, or a chip)
 * continues the turn. Tokens-only, gospel-styled.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { Button, Icon } from '../ui';
import type { A2UIQuestionBlock } from '../../store/chat-turns-store';

export interface QuestionBlockProps {
  block: A2UIQuestionBlock;
  /** Submit the answer as the next turn. */
  onSubmit: (text: string) => void;
}

const CSS = `
.pxc-q {
  border: 1px solid var(--pxs-border-subtle);
  border-radius: var(--a2ui-radius-lg);
  background: var(--a2ui-bg-secondary);
  padding: var(--a2ui-space-4);
  display: flex; flex-direction: column; gap: var(--a2ui-space-3);
}
.pxc-q-head { display: flex; align-items: center; gap: var(--a2ui-space-2); }
.pxc-q-head > svg { color: var(--pxs-accent-text); margin-top: 1px; }
.pxc-q-label {
  font-size: var(--a2ui-text-md); font-weight: var(--a2ui-font-semibold);
  color: var(--a2ui-text-primary); line-height: var(--a2ui-leading-snug);
}
.pxc-q-chips { display: flex; flex-wrap: wrap; gap: var(--a2ui-space-2); }
.pxc-q-chip {
  display: inline-flex; align-items: center; height: 28px; padding: 0 12px;
  background: var(--a2ui-bg-tertiary); border: 1px solid var(--pxs-border-subtle);
  border-radius: var(--a2ui-radius-full);
  font-size: var(--a2ui-text-sm); font-family: var(--a2ui-font-family);
  color: var(--a2ui-text-secondary); cursor: pointer;
  transition: background var(--a2ui-transition-fast), color var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast);
}
.pxc-q-chip:hover { background: var(--a2ui-bg-elevated); color: var(--a2ui-text-primary); border-color: var(--a2ui-border-default); }
.pxc-q-field {
  display: flex; align-items: center; gap: var(--a2ui-space-2);
  background: var(--a2ui-bg-input); border: 1px solid var(--a2ui-border-default);
  border-radius: var(--a2ui-radius-md); padding: var(--a2ui-space-2) var(--a2ui-space-2) var(--a2ui-space-2) var(--a2ui-space-3);
  transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast);
}
.pxc-q-field:focus-within { border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.pxc-q-textarea {
  flex: 1; min-height: 22px; max-height: 140px; resize: none; border: none; outline: none;
  background: transparent; color: var(--a2ui-text-primary);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-md);
  line-height: var(--a2ui-leading-normal);
}
.pxc-q-textarea::placeholder { color: var(--a2ui-text-tertiary); }
`;

export function QuestionBlock({ block, onSubmit }: QuestionBlockProps) {
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  function send() {
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <div className="pxc-q">
      <style>{CSS}</style>

      <div className="pxc-q-head">
        <Icon name="message-square" size={16} />
        <div className="pxc-q-label">{block.label}</div>
      </div>

      {block.chips && block.chips.length > 0 && (
        <div className="pxc-q-chips">
          {block.chips.map((c, i) => (
            <button key={i} type="button" className="pxc-q-chip" onClick={() => onSubmit(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="pxc-q-field">
        <textarea
          className="pxc-q-textarea"
          rows={1}
          value={value}
          placeholder={block.placeholder || 'Type your answer…'}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button variant="primary" size="sm" type="button" disabled={!trimmed} onClick={send}>
          Send
        </Button>
      </div>
    </div>
  );
}

export default QuestionBlock;
