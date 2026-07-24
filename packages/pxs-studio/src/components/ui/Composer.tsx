'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Composer — a clean, reusable prompt input. Matched to the splash `.pxl-promptbar`
 * (LandingPage.tsx): a rounded framed bar with an attach IconButton (left), a
 * growing textarea (default placeholder "Consult with me…"), and a send button
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

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconButton } from './IconButton';
import { Icon } from './Icon';
import { DEV_USER_ID } from '../../lib/db/models';

/** One attached reference image (read as a data URL). */
export interface ComposerAttachment {
  id: string;
  name: string;
  dataUrl: string;
  /** When the attachment is an EXISTING saved asset (picked via @-mention), its asset id — so the
   *  generation links its lineage to the real asset instead of re-uploading a copy. */
  assetId?: string;
}

/** A saved asset offered in the @-mention typeahead. */
interface MentionAsset {
  id: string;
  name: string;
  url: string;
  kind?: string;
  tags?: string[];
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
  position: relative;
  display: flex; flex-direction: column; gap: var(--a2ui-space-2); width: 100%;
  padding: var(--a2ui-space-2) var(--a2ui-space-3);
  /* SAME glass material + radius as the rail (one coherent surface language). */
  background: var(--pxc-bg-glass-30); color: var(--a2ui-text-primary);
  backdrop-filter: var(--pxc-glass-filter); -webkit-backdrop-filter: var(--pxc-glass-filter);
  border: 1px solid var(--pxc-border-subtle); border-radius: 16px;
  transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast),
              background var(--a2ui-transition-fast);
}
/* @-mention typeahead — floats above the composer (assets picker). */
.a2-mention { position: absolute; left: 0; bottom: calc(100% + 8px); z-index: 50; width: min(340px, 100%);
  max-height: 280px; overflow-y: auto; padding: 4px;
  background: var(--a2ui-glass-dark, rgba(18,18,22,0.94)); backdrop-filter: blur(20px);
  border: 1px solid var(--pxs-glass-border, rgba(255,255,255,0.08)); border-radius: var(--a2ui-radius-lg);
  box-shadow: var(--a2ui-shadow-lg); }
.a2-mention-head { padding: 6px 10px 4px; font-size: 10px; font-weight: var(--a2ui-font-semibold);
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--a2ui-text-tertiary); }
.a2-mention-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border: none;
  background: none; text-align: left; cursor: pointer; border-radius: var(--a2ui-radius-md); color: var(--a2ui-text-primary); }
.a2-mention-row[data-on="true"] { background: var(--a2ui-bg-active); }
.a2-mention-thumb { width: 26px; height: 26px; border-radius: var(--a2ui-radius-sm); object-fit: cover;
  flex-shrink: 0; background: var(--a2ui-bg-secondary); }
.a2-mention-name { flex: 1; min-width: 0; font-size: var(--a2ui-text-sm); white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; }
.a2-mention-kind { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); text-transform: capitalize; flex-shrink: 0; }
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

/** If the caret sits inside an @-token (@ then word chars, no whitespace), return its query + start. */
function detectMention(value: string, caret: number): { query: string; start: number } | null {
  const upto = value.slice(0, caret);
  const at = upto.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(upto[at - 1])) return null; // must start the token (BOL or after space)
  const query = upto.slice(at + 1);
  if (/\s/.test(query)) return null; // a space ends the token
  return { query, start: at };
}

export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Consult with me…',
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
  // @-mention typeahead against your saved assets (workspace only). Type "@" → live matches.
  const [assetPool, setAssetPool] = useState<MentionAsset[]>([]);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const locked = disabled;
  const canSend = !locked && !busy && (value.trim().length > 0 || attachments.length > 0);

  useEffect(() => {
    if (!attachEnabled) return;
    let live = true;
    fetch(`/api/assets?user_id=${encodeURIComponent(DEV_USER_ID)}`)
      .then((r) => r.json())
      .then((d: { assets?: MentionAsset[] & { title?: string }[] }) => {
        if (!live) return;
        const rows = Array.isArray(d.assets) ? d.assets : [];
        setAssetPool(
          rows.map((a) => ({
            id: String((a as { id?: string }).id ?? ''),
            name: String((a as { title?: string }).title ?? '').trim() || 'Untitled',
            url: String((a as { url?: string }).url ?? ''),
            kind: (a as { kind?: string }).kind,
            tags: (a as { tags?: string[] }).tags,
          }))
        );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [attachEnabled]);

  const matches =
    mention && assetPool.length > 0
      ? assetPool
          .filter((a) => {
            const q = mention.query.toLowerCase();
            return !q || a.name.toLowerCase().includes(q) || (a.tags ?? []).some((t) => t.toLowerCase().includes(q));
          })
          .slice(0, 6)
      : [];

  const pickMention = (asset: MentionAsset) => {
    if (!mention) return;
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + 1 + mention.query.length);
    onChange(`${before}@${asset.name} ${after}`);
    setMention(null);
    // Attach the EXISTING asset (id-linked) so the generation's lineage points at the real asset.
    setAttachments((prev) =>
      prev.some((a) => a.assetId === asset.id)
        ? prev
        : [...prev, { id: `asset-${asset.id}`, name: asset.name, dataUrl: asset.url, assetId: asset.id }].slice(0, maxAttachments)
    );
    requestAnimationFrame(() => taRef.current?.focus());
  };

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
    // When the @-mention list is open, arrows/enter/escape drive it (not the composer).
    if (mention && matches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % matches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => (i - 1 + matches.length) % matches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(matches[activeIdx]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setMention(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const caret = e.target.selectionStart ?? e.target.value.length;
    setMention(detectMention(e.target.value, caret));
    setActiveIdx(0);
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
        {attachEnabled && mention && matches.length > 0 && (
          <div className="a2-mention" role="listbox">
            <div className="a2-mention-head">Assets</div>
            {matches.map((a, i) => (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                className="a2-mention-row"
                data-on={i === activeIdx ? 'true' : 'false'}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => { e.preventDefault(); pickMention(a); }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="a2-mention-thumb" src={a.url} alt="" />
                <span className="a2-mention-name">@{a.name}</span>
                {a.kind && <span className="a2-mention-kind">{a.kind}</span>}
              </button>
            ))}
          </div>
        )}

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
              type="button"
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
            onChange={handleChange}
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
