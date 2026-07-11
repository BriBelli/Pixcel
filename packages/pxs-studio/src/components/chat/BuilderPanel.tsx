'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * BuilderPanel — the STRUCTURED CONSULT, rendered in the center stage (PR-10a).
 *
 * The specialist's consult is no longer prose in the chat — it's this: the prompt FORMULA broken
 * into parts (Subject / Action / Context / Composition / Style, agent-defined), each with guidance,
 * an editable value, and agent-SUGGESTED anchor chips. The user shapes it — tap suggestions, free-type
 * their own ("never a cage": every part has a free-type escape) — then hits Render, which assembles
 * the parts into the prompt and hands off to the image agent to generate.
 *
 * This is a DUMB renderer: every part, chip, and value is agent-emitted (see A2UIBuilderBlock). No
 * code decides content. Scoring, color-coded assembly, and the standalone Prompt Guide are later
 * phases (PR-10b/c/d); this is the structure working.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { Button, Icon } from '../ui';
import type { A2UIBuilderBlock } from '../../store/chat-turns-store';

export interface BuilderPanelProps {
  block: A2UIBuilderBlock;
  /** Assemble → generate: hands the composed prompt + attached references to the image agent. */
  onRender: (prompt: string, references: string[]) => void;
  /** Disable Render while a generation is already in flight. */
  busy?: boolean;
}

const CSS = `
.pxc-build { flex: 1; min-width: 0; min-height: 0; overflow-y: auto; padding: var(--a2ui-space-6); background: var(--a2ui-bg-app); }
.pxc-build-inner { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--a2ui-space-3); }
.pxc-build-title { font-size: var(--a2ui-text-lg); font-weight: var(--a2ui-font-semibold); color: var(--a2ui-text-primary); letter-spacing: -0.01em; margin-bottom: var(--a2ui-space-1); }
.pxc-build-title span { color: var(--a2ui-text-tertiary); font-weight: var(--a2ui-font-normal); }

/* Each part is a CARD — grouped, tight, scannable (no big gaps between loose form elements). */
.pxc-part { display: flex; flex-direction: column; gap: var(--a2ui-space-2);
  background: var(--a2ui-bg-secondary); border: 1px solid var(--pxs-border-subtle);
  border-radius: var(--a2ui-radius-lg); padding: var(--a2ui-space-3) var(--a2ui-space-4); }
.pxc-part-label { font-size: var(--a2ui-text-xs); text-transform: uppercase; letter-spacing: 0.05em; font-weight: var(--a2ui-font-semibold); color: var(--a2ui-text-secondary); }
.pxc-part-guide { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); line-height: var(--a2ui-leading-tight); margin-top: -2px; }
.pxc-part-field { width: 100%; min-height: 36px; resize: vertical; border-radius: var(--a2ui-radius-md);
  background: var(--a2ui-bg-input); border: 1px solid var(--a2ui-border-default);
  padding: var(--a2ui-space-2) var(--a2ui-space-3); color: var(--a2ui-text-primary);
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-md); line-height: var(--a2ui-leading-normal); outline: none;
  transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast); }
.pxc-part-field:focus { border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }

.pxc-chips { display: flex; flex-wrap: wrap; gap: var(--a2ui-space-2); align-items: center; }
/* Active anchor (selected/added) — accent-tinted, removable. */
.pxc-anchor { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 6px 0 11px;
  border-radius: var(--a2ui-radius-full); font-size: var(--a2ui-text-sm); font-family: var(--a2ui-font-family);
  background: var(--a2ui-accent-subtle); color: var(--a2ui-text-primary); border: 1px solid var(--a2ui-accent); }
.pxc-anchor button { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px;
  border: none; background: none; color: var(--a2ui-text-tertiary); cursor: pointer; border-radius: var(--a2ui-radius-full); }
.pxc-anchor button:hover { color: var(--a2ui-text-primary); background: var(--a2ui-bg-hover); }
/* Suggested chip (not yet added) — quiet, tap to add. */
.pxc-suggest { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 11px;
  border-radius: var(--a2ui-radius-full); font-size: var(--a2ui-text-sm); font-family: var(--a2ui-font-family);
  background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-secondary); border: 1px solid var(--pxs-border-subtle);
  cursor: pointer; transition: background var(--a2ui-transition-fast), color var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast); }
.pxc-suggest:hover { background: var(--a2ui-bg-elevated); color: var(--a2ui-text-primary); border-color: var(--a2ui-border-default); }
.pxc-suggest > svg { color: var(--a2ui-text-tertiary); }
/* Free-type escape — never a cage. */
.pxc-add { height: 28px; min-width: 120px; flex: 1; max-width: 220px; border-radius: var(--a2ui-radius-full);
  background: transparent; border: 1px dashed var(--pxs-border-subtle); padding: 0 12px;
  color: var(--a2ui-text-primary); font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm); outline: none; }
.pxc-add::placeholder { color: var(--a2ui-text-tertiary); }
.pxc-add:focus { border-style: solid; border-color: var(--a2ui-accent); }

.pxc-build-refs { display: flex; flex-direction: column; gap: var(--a2ui-space-2);
  background: var(--a2ui-bg-secondary); border: 1px solid var(--pxs-border-subtle);
  border-radius: var(--a2ui-radius-lg); padding: var(--a2ui-space-3) var(--a2ui-space-4); }
.pxc-build-refs-head { display: flex; align-items: baseline; gap: var(--a2ui-space-2); }
.pxc-build-refs-model { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); }
.pxc-build-drop { display: flex; align-items: center; gap: var(--a2ui-space-2); height: 44px; padding: 0 var(--a2ui-space-3);
  border-radius: var(--a2ui-radius-md); border: 1px dashed var(--a2ui-border-default); background: var(--a2ui-bg-secondary);
  color: var(--a2ui-text-secondary); font-size: var(--a2ui-text-sm); font-family: var(--a2ui-font-family); cursor: pointer;
  transition: border-color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); }
.pxc-build-drop:hover { border-color: var(--a2ui-accent); background: var(--a2ui-bg-hover); }
.pxc-build-supports { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }
.pxc-build-thumbs { display: flex; flex-wrap: wrap; gap: var(--a2ui-space-2); }
.pxc-build-thumb { position: relative; width: 52px; height: 52px; border-radius: var(--a2ui-radius-md); overflow: hidden;
  box-shadow: 0 0 0 1px var(--pxs-border-subtle); }
.pxc-build-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pxc-build-thumb button { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border: none; border-radius: var(--a2ui-radius-full);
  background: var(--a2ui-glass-dark); backdrop-filter: blur(6px); color: var(--a2ui-text-primary); cursor: pointer;
  display: flex; align-items: center; justify-content: center; }

.pxc-build-foot { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: var(--a2ui-space-3);
  padding-top: var(--a2ui-space-3); }
`;

export function BuilderPanel({ block, onRender, busy }: BuilderPanelProps) {
  // Local shaping state, seeded from the agent's block. Values = free text; anchors = added chips
  // (from tapped suggestions or free-typed). The block object is stable per turn (keyed in ChatView),
  // so seeding once is correct.
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(block.parts.map((p) => [p.id, p.value]))
  );
  const [anchors, setAnchors] = useState<Record<string, string[]>>(
    () => Object.fromEntries(block.parts.map((p) => [p.id, [] as string[]]))
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [refs, setRefs] = useState<string[]>([]);

  const addAnchor = (id: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    setAnchors((a) => (a[id]?.includes(t) ? a : { ...a, [id]: [...(a[id] || []), t] }));
  };
  const removeAnchor = (id: string, text: string) =>
    setAnchors((a) => ({ ...a, [id]: (a[id] || []).filter((x) => x !== text) }));

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = typeof reader.result === 'string' ? reader.result : '';
        if (url) setRefs((r) => [...r, url]);
      };
      reader.readAsDataURL(file);
    });
  };

  /** Compose the parts into the prompt: each part = value + its anchors, comma-joined; parts joined
   *  in order. (Color-coded, formula-aware assembly is PR-10b; this is the plain join.) */
  const assemble = () =>
    block.parts
      .map((p) => [values[p.id]?.trim(), ...(anchors[p.id] || [])].filter(Boolean).join(', '))
      .filter(Boolean)
      .join(', ');

  const maxRefs = block.model?.maxReferences ?? 0;
  const canRender = !busy && assemble().length > 0;

  return (
    <div className="pxc-build relative flex-1 min-w-0">
      <style>{CSS}</style>
      <div className="pxc-build-inner">
        <div className="pxc-build-title">
          {block.title.includes('·') ? (
            <>
              {block.title.split('·')[0]}<span>·{block.title.split('·').slice(1).join('·')}</span>
            </>
          ) : (
            block.title
          )}
        </div>

        {block.parts.map((part) => {
          const active = anchors[part.id] || [];
          const suggestions = part.chips.filter((c) => !active.includes(c));
          return (
            <div key={part.id} className="pxc-part">
              <div className="pxc-part-label">{part.label}</div>
              {part.guidance && <div className="pxc-part-guide">{part.guidance}</div>}
              <textarea
                className="pxc-part-field"
                rows={2}
                value={values[part.id] ?? ''}
                placeholder={`Describe the ${part.label.toLowerCase()}…`}
                onChange={(e) => setValues((v) => ({ ...v, [part.id]: e.target.value }))}
              />
              <div className="pxc-chips">
                {active.map((a) => (
                  <span key={a} className="pxc-anchor">
                    {a}
                    <button type="button" aria-label={`Remove ${a}`} onClick={() => removeAnchor(part.id, a)}>
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
                {suggestions.map((c) => (
                  <button key={c} type="button" className="pxc-suggest" onClick={() => addAnchor(part.id, c)}>
                    <Icon name="plus" size={12} /> {c}
                  </button>
                ))}
                <input
                  className="pxc-add"
                  value={drafts[part.id] ?? ''}
                  placeholder="Add your own…"
                  onChange={(e) => setDrafts((d) => ({ ...d, [part.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAnchor(part.id, drafts[part.id] ?? '');
                      setDrafts((d) => ({ ...d, [part.id]: '' }));
                    }
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* References — always offered (attaching is always valid); the chosen model's facts enrich
            it when present (label · up to N · supports). The standalone Prompt Guide panel is PR-10d. */}
        <div className="pxc-build-refs">
          <div className="pxc-build-refs-head">
            <div className="pxc-part-label">References</div>
            {block.model && <div className="pxc-build-refs-model">{block.model.label}</div>}
          </div>
          <label className="pxc-build-drop">
            <Icon name="paperclip" size={15} />
            {maxRefs > 0 ? `Attach — up to ${maxRefs}` : 'Attach references'}
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {refs.length > 0 && (
            <div className="pxc-build-thumbs">
              {refs.map((src, i) => (
                <span key={i} className="pxc-build-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="reference" />
                  <button type="button" aria-label="Remove" onClick={() => setRefs((r) => r.filter((_, j) => j !== i))}>
                    <Icon name="x" size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {block.model && block.model.supports.length > 0 && (
            <div className="pxc-build-supports">Supports: {block.model.supports.join(' · ')}</div>
          )}
        </div>

        <div className="pxc-build-foot">
          <Button variant="primary" size="md" type="button" disabled={!canRender} onClick={() => onRender(assemble(), refs)}>
            <Icon name="sparkles" size={15} /> Render
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BuilderPanel;
