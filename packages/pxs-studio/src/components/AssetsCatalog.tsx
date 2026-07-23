'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * AssetsCatalog — the unified Assets library (Slice 4). The user's first-class GOLD.
 *
 * WordPress-media-library DNA, Pixcel-metadata-centric: a grid of saved assets + kind chips + search
 * by any metadata + a top-right Add (drag-drop upload, no hidden tabs) + a side-rail Details drawer
 * (editable Title/Alt/Caption/Description/Tags, read-only facts, Delete). Design is ours — no Claude
 * Design yet — tokens-only, modern (lazy scroll, clean chrome). Reads GET /api/assets; edits PATCH /
 * DELETE /api/assets/[id]; upload POSTs an in-place upload asset.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './ui';
import { DEV_USER_ID } from '../lib/db/models';
import { toastManager } from './Toast';

interface AssetRow {
  id: string;
  kind: 'image' | 'video' | 'pixel' | 'vector';
  source?: 'generated' | 'upload';
  url: string;
  title?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  model_label?: string;
  prompt?: string;
  thread_id?: string;
  created_at: number;
}

const KINDS: { id: 'all' | AssetRow['kind']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'vector', label: 'Vector' },
  { id: 'pixel', label: 'Pixel' },
];

const CSS = `
/* A large GLASS popover (the full catalog lives inside a glass panel, not a solid full-screen page).
   Overlays the wall, inset so the digital wall shows through the gaps — same glass as the rail. */
.pxa { position: absolute;
  top: var(--pxs-rail-inset); bottom: var(--pxs-rail-inset);
  left: var(--pxs-rail-space); right: var(--pxs-rail-inset);
  z-index: 20; display: flex; flex-direction: column; overflow: hidden;
  border-radius: 16px;
  background: var(--pxc-glass-glow), var(--pxc-bg-glass-20);
  backdrop-filter: var(--pxc-glass-filter); -webkit-backdrop-filter: var(--pxc-glass-filter);
  border: 1px solid var(--pxc-border-subtle);
  color: var(--a2ui-text-primary); font-family: var(--a2ui-font-family); }
.pxa-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--a2ui-space-4);
  padding: var(--a2ui-space-6) var(--a2ui-space-8) var(--a2ui-space-4); }
.pxa-title { margin: 0; font-size: var(--a2ui-text-2xl); font-weight: var(--a2ui-font-semibold); letter-spacing: -0.01em; }
.pxa-sub { margin: 4px 0 0; font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); max-width: 72ch; line-height: 1.5; }
.pxa-add { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 16px; flex-shrink: 0;
  border: none; border-radius: var(--a2ui-radius-md); background: var(--a2ui-accent); color: var(--a2ui-text-inverse);
  font-family: inherit; font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-medium); cursor: pointer;
  transition: filter var(--a2ui-transition-fast); }
.pxa-add:hover { filter: brightness(1.08); }
.pxa-close { position: absolute; top: 16px; right: 16px; width: 30px; height: 30px; display: flex; align-items: center;
  justify-content: center; border: none; background: none; color: var(--a2ui-text-tertiary); cursor: pointer;
  border-radius: var(--a2ui-radius-md); }
.pxa-close:hover { background: var(--a2ui-bg-hover); color: var(--a2ui-text-primary); }

.pxa-bar { display: flex; align-items: center; gap: var(--a2ui-space-3); flex-wrap: wrap;
  padding: 0 var(--a2ui-space-8) var(--a2ui-space-4); }
.pxa-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.pxa-chip { height: 30px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--a2ui-border-subtle); background: none; border-radius: var(--a2ui-radius-full);
  color: var(--a2ui-text-tertiary); font-family: inherit; font-size: var(--a2ui-text-sm); cursor: pointer;
  transition: color var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); }
.pxa-chip:hover { color: var(--a2ui-text-primary); }
.pxa-chip[data-on="true"] { color: var(--pxs-accent-text); border-color: var(--a2ui-accent); background: var(--a2ui-accent-subtle); }
.pxa-chip-n { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); font-variant-numeric: tabular-nums; }
.pxa-search { margin-left: auto; height: 34px; min-width: 240px; padding: 0 12px; border-radius: var(--a2ui-radius-md);
  border: 1px solid var(--a2ui-border-default); background: var(--a2ui-bg-input); color: var(--a2ui-text-primary);
  font-family: inherit; font-size: var(--a2ui-text-sm); }
.pxa-search:focus { outline: none; border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }

.pxa-body { flex: 1; display: flex; min-height: 0; }
.pxa-grid-wrap { flex: 1; overflow-y: auto; padding: 0 var(--a2ui-space-8) var(--a2ui-space-8); }
.pxa-grid { display: grid; gap: var(--a2ui-space-4); grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.pxa-tile { position: relative; display: flex; flex-direction: column; border-radius: var(--a2ui-radius-lg);
  overflow: hidden; background: var(--a2ui-bg-tertiary); box-shadow: 0 0 0 1px var(--pxs-border-subtle);
  cursor: pointer; transition: box-shadow var(--a2ui-transition-fast); }
.pxa-tile[data-on="true"] { box-shadow: 0 0 0 2px var(--a2ui-accent); }
.pxa-tile:hover { box-shadow: 0 0 0 1px var(--a2ui-border-default); }
.pxa-tile[data-on="true"]:hover { box-shadow: 0 0 0 2px var(--a2ui-accent); }
.pxa-tile-media { aspect-ratio: 1 / 1; background: var(--a2ui-bg-secondary); }
.pxa-tile-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pxa-tile-meta { padding: 8px 10px 10px; }
.pxa-tile-name { font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-medium); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.pxa-tile-sub { margin-top: 2px; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.pxa-badge { position: absolute; top: 8px; left: 8px; padding: 2px 7px; border-radius: var(--a2ui-radius-full);
  font-size: 10px; font-weight: var(--a2ui-font-semibold); letter-spacing: 0.04em; text-transform: uppercase;
  background: var(--a2ui-glass-dark); backdrop-filter: blur(8px); border: 1px solid var(--pxs-glass-border);
  color: var(--a2ui-text-secondary); }

.pxa-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--a2ui-space-2); color: var(--a2ui-text-tertiary); text-align: center; padding: var(--a2ui-space-8); }
.pxa-empty-t { font-size: var(--a2ui-text-lg); color: var(--a2ui-text-secondary); font-weight: var(--a2ui-font-medium); }

.pxa-drop { position: absolute; inset: 0; z-index: 5; display: none; align-items: center; justify-content: center;
  background: var(--a2ui-accent-subtle); border: 2px dashed var(--a2ui-accent); border-radius: var(--a2ui-radius-lg);
  color: var(--pxs-accent-text); font-weight: var(--a2ui-font-medium); pointer-events: none; }
.pxa[data-drag="true"] .pxa-drop { display: flex; }

/* ── Details drawer ── */
.pxa-drawer { width: 340px; flex-shrink: 0; border-left: 1px solid var(--a2ui-border-subtle);
  background: var(--a2ui-bg-primary); display: flex; flex-direction: column; }
.pxa-drawer-head { display: flex; align-items: center; justify-content: space-between; gap: var(--a2ui-space-2);
  padding: var(--a2ui-space-4) var(--a2ui-space-5); border-bottom: 1px solid var(--a2ui-border-subtle); }
.pxa-drawer-title { font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-semibold); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.pxa-drawer-body { flex: 1; overflow-y: auto; padding: var(--a2ui-space-5); display: flex; flex-direction: column; gap: var(--a2ui-space-4); }
.pxa-prev { width: 100%; border-radius: var(--a2ui-radius-md); background: var(--a2ui-bg-secondary); aspect-ratio: 1/1; overflow: hidden; }
.pxa-prev img { width: 100%; height: 100%; object-fit: contain; display: block; }
.pxa-field { display: flex; flex-direction: column; gap: 4px; }
.pxa-label { font-size: 11px; font-weight: var(--a2ui-font-semibold); text-transform: uppercase; letter-spacing: 0.06em; color: var(--a2ui-text-tertiary); }
.pxa-input, .pxa-textarea { width: 100%; padding: 8px 10px; border-radius: var(--a2ui-radius-md); border: 1px solid var(--a2ui-border-default);
  background: var(--a2ui-bg-input); color: var(--a2ui-text-primary); font-family: inherit; font-size: var(--a2ui-text-sm); box-sizing: border-box; }
.pxa-input:focus, .pxa-textarea:focus { outline: none; border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.pxa-textarea { resize: vertical; min-height: 60px; }
.pxa-facts { display: flex; flex-direction: column; gap: 4px; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }
.pxa-fact { display: flex; justify-content: space-between; gap: var(--a2ui-space-3); }
.pxa-fact b { color: var(--a2ui-text-secondary); font-weight: var(--a2ui-font-medium); }
.pxa-drawer-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--a2ui-space-2);
  padding: var(--a2ui-space-3) var(--a2ui-space-5); border-top: 1px solid var(--a2ui-border-subtle); }
.pxa-btn { height: 32px; padding: 0 12px; border-radius: var(--a2ui-radius-md); border: 1px solid var(--a2ui-border-default);
  background: none; color: var(--a2ui-text-secondary); font-family: inherit; font-size: var(--a2ui-text-sm); cursor: pointer; }
.pxa-btn:hover { background: var(--a2ui-bg-hover); color: var(--a2ui-text-primary); }
.pxa-btn--danger { color: var(--a2ui-error, #f87171); border-color: transparent; }
.pxa-btn--danger:hover { background: rgba(248,113,113,0.12); color: var(--a2ui-error, #f87171); }
.pxa-btn--save { background: var(--a2ui-accent); color: var(--a2ui-text-inverse); border-color: transparent; }
.pxa-btn--save:hover { filter: brightness(1.08); background: var(--a2ui-accent); }
`;

function fmtDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export function AssetsCatalog({
  onClose,
  onOpenProject,
}: {
  onClose: () => void;
  /** Explicitly open an asset's project (from the Details drawer). */
  onOpenProject?: (threadId: string) => void;
}) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<'all' | AssetRow['kind']>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?user_id=${encodeURIComponent(DEV_USER_ID)}`);
      const data = (await res.json()) as { assets?: AssetRow[] };
      setAssets(Array.isArray(data.assets) ? data.assets : []);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const counts: Record<string, number> = { all: assets.length };
  for (const a of assets) counts[a.kind] = (counts[a.kind] ?? 0) + 1;

  const q = query.trim().toLowerCase();
  const filtered = assets.filter((a) => {
    if (kind !== 'all' && a.kind !== kind) return false;
    if (!q) return true;
    const hay = [a.title, a.caption, a.description, a.model_label, a.prompt, ...(a.tags ?? [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
  const selected = assets.find((a) => a.id === selectedId) ?? null;

  const uploadFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'));
    for (const f of list) {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(f);
      });
      await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: dataUrl, kind: 'image', source: 'upload', title: f.name }),
      }).catch(() => {});
    }
    if (list.length) {
      toastManager.success(`${list.length} asset${list.length === 1 ? '' : 's'} added`);
      load();
    }
  };

  return (
    <div
      className="pxa"
      data-drag={dragging ? 'true' : 'false'}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        uploadFiles(e.dataTransfer.files);
      }}
    >
      <style>{CSS}</style>
      <div className="pxa-drop">Drop to add to your assets</div>

      <button type="button" className="pxa-close" onClick={onClose} aria-label="Close assets">
        <Icon name="x" size={17} />
      </button>
      <div className="pxa-head">
        <div>
          <h1 className="pxa-title">Assets</h1>
          <p className="pxa-sub">
            Everything you&rsquo;ve saved, in one place. Tag with flat labels (e.g. Johnny, Jump-Kick, Low-Angle Shot);
            the workflow picks which assets play which role.
          </p>
        </div>
        <button type="button" className="pxa-add" onClick={() => fileRef.current?.click()}>
          <Icon name="plus" size={15} /> Add assets
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
      </div>

      <div className="pxa-bar">
        <div className="pxa-chips">
          {KINDS.filter((k) => k.id === 'all' || counts[k.id]).map((k) => (
            <button key={k.id} type="button" className="pxa-chip" data-on={kind === k.id ? 'true' : 'false'} onClick={() => setKind(k.id)}>
              {k.label} <span className="pxa-chip-n">{counts[k.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <input className="pxa-search" placeholder="Search title, tags, prompt…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="pxa-body">
        <div className="pxa-grid-wrap">
          {loading ? (
            <div className="pxa-empty">Loading your assets…</div>
          ) : filtered.length === 0 ? (
            <div className="pxa-empty">
              <div className="pxa-empty-t">{assets.length === 0 ? 'No saved assets yet' : 'Nothing matches'}</div>
              <div>{assets.length === 0 ? 'Hover a generated image and “Save to Assets”, or add your own.' : 'Try a different filter or search.'}</div>
            </div>
          ) : (
            <div className="pxa-grid">
              {filtered.map((a) => (
                <div key={a.id} className="pxa-tile" data-on={selectedId === a.id ? 'true' : 'false'} onClick={() => setSelectedId(a.id)}>
                  <span className="pxa-badge">{a.source === 'upload' ? 'Upload' : a.kind}</span>
                  <div className="pxa-tile-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.alt_text || a.title || 'asset'} />
                  </div>
                  <div className="pxa-tile-meta">
                    <div className="pxa-tile-name">{a.title || 'Untitled'}</div>
                    <div className="pxa-tile-sub">{a.model_label || fmtDate(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <AssetDrawer
            key={selected.id}
            asset={selected}
            onClose={() => setSelectedId(null)}
            onSaved={(next) => setAssets((prev) => prev.map((a) => (a.id === next.id ? next : a)))}
            onDeleted={(id) => {
              setAssets((prev) => prev.filter((a) => a.id !== id));
              setSelectedId(null);
            }}
            onOpenProject={onOpenProject}
          />
        )}
      </div>
    </div>
  );
}

/** The side-rail Details drawer — editable editorial metadata + read-only facts + delete. */
function AssetDrawer({
  asset,
  onClose,
  onSaved,
  onDeleted,
  onOpenProject,
}: {
  asset: AssetRow;
  onClose: () => void;
  onSaved: (a: AssetRow) => void;
  onDeleted: (id: string) => void;
  /** Explicitly open the project this asset belongs to. Deliberate + visible — selecting an asset
   *  must NEVER silently swap your project out from under you. */
  onOpenProject?: (threadId: string) => void;
}) {
  const [title, setTitle] = useState(asset.title ?? '');
  const [altText, setAltText] = useState(asset.alt_text ?? '');
  const [caption, setCaption] = useState(asset.caption ?? '');
  const [description, setDescription] = useState(asset.description ?? '');
  const [tags, setTags] = useState((asset.tags ?? []).join(', '));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          alt_text: altText.trim(),
          caption: caption.trim(),
          description: description.trim(),
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = (await res.json()) as { asset?: AssetRow };
      if (data.asset) {
        onSaved(data.asset);
        toastManager.success('Saved');
      }
    } catch {
      toastManager.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      await fetch(`/api/assets/${asset.id}`, { method: 'DELETE' });
      onDeleted(asset.id);
      toastManager.success('Deleted');
    } catch {
      toastManager.error('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="pxa-drawer">
      <div className="pxa-drawer-head">
        <span className="pxa-drawer-title">{asset.title || 'Untitled'}</span>
        <button type="button" className="pxa-btn" onClick={onClose} style={{ height: 28, padding: '0 10px' }}>
          Close
        </button>
      </div>
      <div className="pxa-drawer-body">
        <div className="pxa-prev">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset.url} alt={asset.alt_text || 'asset preview'} />
        </div>
        {/* Explicit route back to the work this asset came from — an intentional act, never a
            side-effect of selecting a thumbnail. */}
        {asset.thread_id && onOpenProject && (
          <button
            type="button"
            className="pxa-btn"
            onClick={() => onOpenProject(asset.thread_id as string)}
            style={{ height: 32, justifyContent: 'center' }}
          >
            Open project
          </button>
        )}
        <div className="pxa-field">
          <label className="pxa-label">Title</label>
          <input className="pxa-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
        </div>
        <div className="pxa-field">
          <label className="pxa-label">Alt text</label>
          <input className="pxa-input" value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe the image…" />
        </div>
        <div className="pxa-field">
          <label className="pxa-label">Caption</label>
          <input className="pxa-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Short caption…" />
        </div>
        <div className="pxa-field">
          <label className="pxa-label">Tags</label>
          <input className="pxa-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Johnny, Jump-Kick, Low-Angle Shot" />
        </div>
        <div className="pxa-field">
          <label className="pxa-label">Description</label>
          <textarea className="pxa-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Long-form notes…" />
        </div>
        <div className="pxa-facts">
          {asset.model_label && <div className="pxa-fact"><span>Model</span> <b>{asset.model_label}</b></div>}
          <div className="pxa-fact"><span>Source</span> <b>{asset.source === 'upload' ? 'Upload' : 'Generated'}</b></div>
          <div className="pxa-fact"><span>Kind</span> <b>{asset.kind}</b></div>
          <div className="pxa-fact"><span>Created</span> <b>{fmtDate(asset.created_at)}</b></div>
          {asset.prompt && <div className="pxa-fact" style={{ display: 'block' }}><span>Prompt</span><div style={{ color: 'var(--a2ui-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>{asset.prompt}</div></div>}
        </div>
      </div>
      <div className="pxa-drawer-foot">
        <button type="button" className="pxa-btn pxa-btn--danger" onClick={del} disabled={busy}>
          Delete
        </button>
        <button type="button" className="pxa-btn pxa-btn--save" onClick={save} disabled={busy}>
          Save changes
        </button>
      </div>
    </aside>
  );
}

export default AssetsCatalog;
