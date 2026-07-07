'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Composer — a clean, reusable prompt input. Matched to the splash `.pxl-promptbar`
 * (LandingPage.tsx): a rounded framed bar with an attach IconButton (left), a
 * growing textarea (default placeholder "Ask me anything…"), and a send button
 * (right, primary). SCOPED DOWN by design: NO model picker, NO quality pill, NO
 * Generate/footer — those are deferred to a later PR.
 *
 * Attachments (opt-in via `attachEnabled`): the paperclip opens a file picker; picked
 * images become reference thumbnails shown above the input, and ride along on submit
 * as data URLs. Used by the Image workspace so you can attach references the agent
 * renders WITH; off by default (the chat front door doesn't consume references yet).
 *
 * 7 states: default / hover / focus (halo on the frame) / active / disabled /
 * loading (busy → send shows a spinner + submit blocked) / error.
 *   - focus  = frame border → accent + 2px halo (never outline)
 *   - active = frame bg elevates (no scale-pop)
 *   - Enter submits, Shift+Enter newlines.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useLayoutEffect, useRef, useState } from 'react';
import { IconButton } from './IconButton';
import { Icon } from './Icon';

/** One attached reference image (read as a data URL). */
export interface ComposerAttachment {
  id: string;
  name: string;
  dataUrl: string;
}

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, attachments?: ComposerAttachment[]) => void;
  placeholder?: string;
  busy?: boolean;
  disabled?: boolean;
  error?: boolean;
  /** Optional tiny left label slot (e.g. a mode word). No controls. */
  mode?: string;
  /** Enable the paperclip → image reference attachments (workspace). Default off. */
  attachEnabled?: boolean;
  /** Max reference images to attach at once (default 5). */
  maxAttachments?: number;
}

const CSS = `
.a2-composer {
  display: flex; flex-direction: column; gap: var(--a2ui-space-2); width: 100%;
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

.a2-composer__row { display: flex; align-items: center; gap: var(--a2ui-space-2); width: 100%; }

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

.a2-composer__actions { display: flex; align-items: center; gap: var(--a2ui-space-1); flex-shrink: 0; align-self: center; }

/* Reference thumbnails — above the input row, inside the frame. */
.a2-composer__refs { display: flex; flex-wrap: wrap; gap: var(--a2ui-space-2); padding-top: var(--a2ui-space-1); }
.a2-composer__ref {
  position: relative; width: 48px; height: 48px; border-radius: var(--a2ui-radius-md); overflow: hidden;
  background: var(--a2ui-bg-tertiary); box-shadow: 0 0 0 1px var(--pxs-border-subtle);
}
.a2-composer__ref img { width: 100%; height: 100%; object-fit: cover; display: block; }
.a2-composer__ref-x {
  position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; border-radius: var(--a2ui-radius-full);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  background: var(--a2ui-glass-dark); backdrop-filter: blur(6px); border: 1px solid var(--pxs-glass-border);
  color: var(--a2ui-text-primary);
}
`;

/** Read a File as a data URL (resolves '' on failure). */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
    r.onerror = () => resolve('');
    r.readAsDataURL(file);
  });
}

export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask me anything…',
  busy = false,
  disabled = false,
  error = false,
  mode,
  attachEnabled = false,
  maxAttachments = 5,
}: ComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const locked = disabled;
  const canSend = !locked && !busy && (value.trim().length > 0 || attachments.length > 0);

  // grow the textarea to fit content (capped by max-height in CSS)
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const submit = () => {
    if (!canSend) return;
    onSubmit(value.trim(), attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    e.target.value = ''; // allow re-picking the same file
    if (files.length === 0) return;
    const room = Math.max(0, maxAttachments - attachments.length);
    const picked = await Promise.all(
      files.slice(0, room).map(async (f) => ({
        id: `${f.name}-${f.size}-${f.lastModified}`,
        name: f.name,
        dataUrl: await readAsDataUrl(f),
      }))
    );
    setAttachments((prev) => [...prev, ...picked.filter((p) => p.dataUrl)].slice(0, maxAttachments));
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
        {attachEnabled && attachments.length > 0 && (
          <div className="a2-composer__refs">
            {attachments.map((a) => (
              <div key={a.id} className="a2-composer__ref">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.dataUrl} alt={a.name} />
                <span
                  className="a2-composer__ref-x"
                  role="button"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => setAttachments((prev) => prev.filter((p) => p.id !== a.id))}
                >
                  <Icon name="x" size={10} />
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="a2-composer__row">
          <div className="a2-composer__actions">
            <IconButton
              icon="paperclip"
              label={attachEnabled ? 'Attach reference images' : 'Attach'}
              boxSize={34}
              size={18}
              disabled={locked || busy || !attachEnabled || attachments.length >= maxAttachments}
              tabIndex={attachEnabled ? 0 : -1}
              onClick={attachEnabled ? () => fileRef.current?.click() : undefined}
            />
            {attachEnabled && (
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFiles}
              />
            )}
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
        </div>
      </form>
    </>
  );
}

export default Composer;
