'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SaveTemplateDialog — the Save-as-template micro-workflow (Brian's design).
 *
 * Clicking "Save as template" on a project opens THIS: a review/edit dialog that proposes the project's
 * recipe text, explains that [BRACKETS] mark a SLOT (a variable you fill each time), and lets you edit
 * the string + name and confirm. Manual slotting only for now — the "Auto-slot with AI" button is a
 * deliberate future hook (the Model agent proposing slots comes later). Plain-text editing, tokens-only.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { Icon } from './ui';
import { toastManager } from './Toast';
import { DEV_USER_ID } from '../lib/db/models';

const SLOT_RE = /\[([^\]\n]{1,60})\]/g;
function detectSlots(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(SLOT_RE)) out.add(m[1].trim());
  return [...out];
}

export interface SaveTemplateDialogProps {
  threadId: string;
  onClose: () => void;
  onSaved?: () => void;
}

const CSS = `
.pxt-overlay { position: fixed; inset: 0; z-index: var(--a2ui-z-modal, 300); display: flex; align-items: center;
  justify-content: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); padding: 24px; animation: pxt-fade 0.15s ease; }
@keyframes pxt-fade { from { opacity: 0; } to { opacity: 1; } }
.pxt { width: min(620px, 100%); max-height: 86vh; display: flex; flex-direction: column;
  background: var(--pxc-bg-glass-frost); backdrop-filter: var(--pxc-glass-filter-heavy); -webkit-backdrop-filter: var(--pxc-glass-filter-heavy);
  border: 1px solid var(--pxc-stroke); border-radius: 16px; box-shadow: var(--a2ui-shadow-xl);
  font-family: var(--a2ui-font-family); animation: pxt-rise 0.2s cubic-bezier(0.22,1,0.36,1); }
@keyframes pxt-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.pxt-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 20px 12px; }
.pxt-title { font-size: var(--a2ui-text-lg); font-weight: var(--a2ui-font-semibold); color: var(--a2ui-text-primary); }
.pxt-sub { margin-top: 3px; font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); }
.pxt-x { width: 28px; height: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: none;
  background: none; color: var(--a2ui-text-tertiary); cursor: pointer; border-radius: var(--a2ui-radius-md); }
.pxt-x:hover { background: var(--a2ui-bg-hover); color: var(--a2ui-text-primary); }
.pxt-body { flex: 1; overflow-y: auto; padding: 0 20px 4px; display: flex; flex-direction: column; }
.pxt-loading { padding: 32px; text-align: center; color: var(--a2ui-text-tertiary); font-size: var(--a2ui-text-sm); }
.pxt-label { font-size: 11px; font-weight: var(--a2ui-font-semibold); text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--a2ui-text-tertiary); margin: 10px 0 6px; }
.pxt-name { height: 38px; padding: 0 12px; border-radius: var(--a2ui-radius-md); border: 1px solid var(--a2ui-border-default);
  background: var(--a2ui-bg-input); color: var(--a2ui-text-primary); font-family: inherit; font-size: var(--a2ui-text-md); box-sizing: border-box; }
.pxt-name:focus { outline: none; border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.pxt-text { min-height: 200px; resize: vertical; padding: 12px; border-radius: var(--a2ui-radius-md); box-sizing: border-box;
  border: 1px solid var(--a2ui-border-default); background: var(--a2ui-bg-input); color: var(--a2ui-text-primary);
  font-family: var(--a2ui-font-mono); font-size: var(--a2ui-text-sm); line-height: 1.55; }
.pxt-text:focus { outline: none; border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.pxt-hint { display: flex; align-items: flex-start; gap: 6px; margin-top: 10px; font-size: var(--a2ui-text-sm);
  color: var(--a2ui-text-tertiary); line-height: 1.5; }
.pxt-hint code { font-family: var(--a2ui-font-mono); font-size: 12px; padding: 1px 5px; border-radius: 4px;
  background: var(--a2ui-bg-active); color: var(--a2ui-text-secondary); }
.pxt-hint svg { flex-shrink: 0; margin-top: 2px; color: var(--pxs-accent-text); }
.pxt-slots { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 12px 0 4px; }
.pxt-slots-label { font-size: 11px; font-weight: var(--a2ui-font-semibold); text-transform: uppercase; letter-spacing: 0.05em; color: var(--a2ui-text-tertiary); }
.pxt-slots-empty { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); }
.pxt-slot { height: 22px; padding: 0 9px; display: inline-flex; align-items: center; border-radius: var(--a2ui-radius-full);
  font-family: var(--a2ui-font-mono); font-size: 11px; color: var(--pxs-accent-text); background: var(--a2ui-accent-subtle); border: 1px solid var(--a2ui-accent); }
.pxt-foot { display: flex; align-items: center; gap: 8px; padding: 14px 20px 18px; border-top: 1px solid var(--a2ui-border-subtle); }
.pxt-ai { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: var(--a2ui-radius-md);
  border: 1px dashed var(--a2ui-border-default); background: none; color: var(--a2ui-text-disabled); font-family: inherit; font-size: var(--a2ui-text-sm); cursor: not-allowed; }
.pxt-btn { height: 36px; padding: 0 16px; border-radius: var(--a2ui-radius-md); border: 1px solid var(--a2ui-border-default);
  background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-primary); font-family: inherit; font-size: var(--a2ui-text-sm);
  font-weight: var(--a2ui-font-medium); cursor: pointer; transition: background var(--a2ui-transition-fast); }
.pxt-btn:hover { background: var(--a2ui-bg-hover); }
.pxt-btn--save { background: var(--a2ui-accent); color: var(--a2ui-text-inverse); border-color: transparent; }
.pxt-btn--save:hover { filter: brightness(1.08); background: var(--a2ui-accent); }
.pxt-btn:disabled { opacity: 0.5; cursor: default; }
@media (prefers-reduced-motion: reduce) { .pxt, .pxt-overlay { animation: none; } }
`;

export function SaveTemplateDialog({ threadId, onClose, onSaved }: SaveTemplateDialogProps) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/threads/${threadId}/template?user_id=${encodeURIComponent(DEV_USER_ID)}`);
        const data = res.ok ? ((await res.json()) as { text?: string; name?: string }) : null;
        if (alive && data) {
          setName(data.name ?? '');
          setText(data.text ?? '');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [threadId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const slots = detectSlots(text);

  const save = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    const res = await fetch(`/api/threads/${threadId}/template?user_id=${encodeURIComponent(DEV_USER_ID)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, name }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) {
      toastManager.success('Saved as template');
      onSaved?.();
      onClose();
    } else {
      toastManager.error('Could not save the template');
    }
  };

  return (
    <div className="pxt-overlay" onClick={onClose}>
      <style>{CSS}</style>
      <div className="pxt" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Save as template">
        <div className="pxt-head">
          <div>
            <div className="pxt-title">Save as template</div>
            <div className="pxt-sub">Review the recipe, then wrap any part in [brackets] to make it a slot.</div>
          </div>
          <button type="button" className="pxt-x" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>

        {loading ? (
          <div className="pxt-body">
            <div className="pxt-loading">Reading the project&rsquo;s recipe…</div>
          </div>
        ) : (
          <div className="pxt-body">
            <label className="pxt-label">Name</label>
            <input className="pxt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name" />

            <label className="pxt-label">Recipe</label>
            <textarea
              className="pxt-text"
              value={text}
              spellCheck={false}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the reusable method…"
            />

            <div className="pxt-hint">
              <Icon name="info" size={13} />
              <span>
                Wrap a value in <code>[SQUARE BRACKETS]</code> to make it a <b>slot</b> — a variable you fill in each time you use the recipe.
              </span>
            </div>

            <div className="pxt-slots">
              <span className="pxt-slots-label">Slots</span>
              {slots.length === 0 ? (
                <span className="pxt-slots-empty">none yet — add [brackets] above</span>
              ) : (
                slots.map((s) => (
                  <span key={s} className="pxt-slot">
                    {s}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        <div className="pxt-foot">
          {/* Future hook (Brian): the Model agent proposes the slots for you. Disabled until built. */}
          <button type="button" className="pxt-ai" disabled title="Coming soon — the agent proposes slots for you">
            <Icon name="sparkles" size={14} /> Auto-slot with AI · soon
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="pxt-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="pxt-btn pxt-btn--save" onClick={() => void save()} disabled={saving || !text.trim()}>
            {saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveTemplateDialog;
