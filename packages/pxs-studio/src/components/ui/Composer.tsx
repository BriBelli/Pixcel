'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Composer — a clean, reusable prompt input. Matched to the splash `.pxl-promptbar`
 * (LandingPage.tsx): a rounded framed bar with an attach IconButton (left), a
 * growing textarea (default placeholder "Ask me anything…"), and a send button
 * (right, primary). SCOPED DOWN by design: NO model picker, NO quality pill, NO
 * Generate/footer — those are deferred to a later PR.
 *
 * 7 states: default / hover / focus (halo on the frame) / active / disabled /
 * loading (busy → send shows a spinner + submit blocked) / error.
 *   - focus  = frame border → accent + 2px halo (never outline)
 *   - active = frame bg elevates (no scale-pop)
 *   - Enter submits, Shift+Enter newlines.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useLayoutEffect, useRef } from 'react';
import { IconButton } from './IconButton';

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  busy?: boolean;
  disabled?: boolean;
  error?: boolean;
  /** Optional tiny left label slot (e.g. a mode word). No controls. */
  mode?: string;
}

const CSS = `
.a2-composer {
  display: flex; align-items: flex-end; gap: var(--a2ui-space-2); width: 100%;
  padding: var(--a2ui-space-2) var(--a2ui-space-3);
  background: var(--a2ui-bg-input); color: var(--a2ui-text-primary);
  border: 1px solid var(--a2ui-border-default); border-radius: var(--a2ui-radius-lg);
  transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast),
              background var(--a2ui-transition-fast);
}
.a2-composer:hover:not(.a2-composer--disabled):not(:focus-within) { border-color: var(--a2ui-border-strong); }
/* active = pointer down inside frame → subtle bg elevation (no scale-pop) */
.a2-composer:active:not(.a2-composer--disabled) { background: var(--a2ui-bg-input-focus); }
/* focus = frame border → accent + 2px halo (never outline) */
.a2-composer:focus-within { border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle);
  background: var(--a2ui-bg-input-focus); }
.a2-composer--error { border-color: var(--a2ui-error); }
.a2-composer--error:focus-within { border-color: var(--a2ui-error); box-shadow: 0 0 0 2px var(--a2ui-error-bg); }
.a2-composer--disabled { background: var(--a2ui-bg-secondary); border-color: var(--a2ui-border-subtle); cursor: not-allowed; }

.a2-composer__mode { align-self: center; flex-shrink: 0; padding: 0 var(--a2ui-space-1);
  font-family: var(--a2ui-font-mono); font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary);
  text-transform: lowercase; }

.a2-composer__input {
  flex: 1 1 auto; min-width: 0; resize: none; border: none; outline: none; background: transparent;
  color: var(--a2ui-text-primary); font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-lg);
  line-height: var(--a2ui-leading-normal); padding: var(--a2ui-space-2) 0; max-height: 200px; overflow-y: auto;
}
.a2-composer__input::placeholder { color: var(--a2ui-text-tertiary); }
.a2-composer__input:disabled { color: var(--a2ui-text-disabled); cursor: not-allowed; }
.a2-composer__input:disabled::placeholder { color: var(--a2ui-text-disabled); }

.a2-composer__actions { display: flex; align-items: center; gap: var(--a2ui-space-1); flex-shrink: 0; align-self: flex-end; }
`;

export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask me anything…',
  busy = false,
  disabled = false,
  error = false,
  mode,
}: ComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const locked = disabled;
  const canSend = !locked && !busy && value.trim().length > 0;

  // grow the textarea to fit content (capped by max-height in CSS)
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const submit = () => {
    if (!canSend) return;
    onSubmit(value.trim());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const cls = ['a2-composer', error ? 'a2-composer--error' : '', locked ? 'a2-composer--disabled' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{CSS}</style>
      <form
        className={cls}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="a2-composer__actions" style={{ alignSelf: 'flex-end' }}>
          <IconButton icon="paperclip" label="Attach" boxSize={34} size={18} disabled={locked || busy} tabIndex={-1} />
        </div>

        {mode && <span className="a2-composer__mode">{mode}</span>}

        <textarea
          ref={taRef}
          className="a2-composer__input"
          rows={1}
          value={value}
          placeholder={placeholder}
          disabled={locked}
          aria-busy={busy || undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <div className="a2-composer__actions">
          <IconButton
            icon="send"
            variant="primary"
            label="Send"
            type="submit"
            boxSize={34}
            size={16}
            loading={busy}
            disabled={!canSend}
          />
        </div>
      </form>
    </>
  );
}

export default Composer;
