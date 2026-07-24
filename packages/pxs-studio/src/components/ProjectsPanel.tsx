'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * ProjectsPanel — the projects list (Slice 5). THE THREAD IS THE PROJECT.
 *
 * A left-docked slide-out (next to the persistent NavRail) listing the user's projects — the saved
 * chat threads — sorted by LAST-UPDATED (a project rises when you work on it or open it, the
 * Cursor/Claude-Code history pattern). Click a project → it loads and nothing is lost (the 360°
 * loop). "New project" starts a fresh thread. Additive — does not touch the nav or the workspace.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useState } from 'react';
import { Icon } from './ui';
import { DEV_USER_ID } from '../lib/db/models';

interface ProjectRow {
  id: string;
  title: string;
  updated_at: number;
}

const CSS = `
/* A floating GLASS popover that OVERLAYS the canvas (does not push/box it) — a bubble connected to
   the rail's Projects control. Same .pxc-glass pattern: glass fill + subtle border + blur, no shadow,
   rounded, floating clear of the top/bottom edges. The left offset (inline) clears the rail. */
.pxp[data-full="true"] { right: var(--pxs-rail-inset); width: auto; }
.pxp[data-full="true"] .pxp-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; align-content: start; }
.pxp-full { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border: 1px solid var(--pxc-border-subtle);
  border-radius: var(--a2ui-radius-md); background: none; color: var(--a2ui-text-tertiary); font-family: inherit;
  font-size: var(--a2ui-text-xs); cursor: pointer; transition: color var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast); }
.pxp-full:hover { color: var(--a2ui-text-primary); border-color: var(--a2ui-border-default); }
.pxp { position: absolute; top: 16px; bottom: 16px; z-index: 25; width: 300px;
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--pxc-glass-glow), var(--pxc-bg-glass-20);
  backdrop-filter: var(--pxc-glass-filter); -webkit-backdrop-filter: var(--pxc-glass-filter);
  border: 1px solid var(--pxc-border-subtle); border-radius: 16px; box-shadow: none;
  font-family: var(--a2ui-font-family); animation: pxp-in 0.22s cubic-bezier(0.22,1,0.36,1); }
@keyframes pxp-in { from { transform: translateX(-8px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.pxp-head { display: flex; align-items: center; justify-content: space-between; gap: var(--a2ui-space-2);
  padding: var(--a2ui-space-4) var(--a2ui-space-4) var(--a2ui-space-3); }
.pxp-title { font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-semibold); color: var(--a2ui-text-secondary);
  text-transform: uppercase; letter-spacing: 0.06em; }
.pxp-x { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: none;
  background: none; color: var(--a2ui-text-tertiary); cursor: pointer; border-radius: var(--a2ui-radius-md); }
.pxp-x:hover { background: var(--a2ui-bg-hover); color: var(--a2ui-text-primary); }
.pxp-new { display: flex; align-items: center; gap: 8px; margin: 0 var(--a2ui-space-3) var(--a2ui-space-3);
  height: 38px; padding: 0 12px; border: 1px dashed var(--a2ui-border-default); border-radius: var(--a2ui-radius-md);
  background: none; color: var(--a2ui-text-secondary); font-family: inherit; font-size: var(--a2ui-text-sm);
  font-weight: var(--a2ui-font-medium); cursor: pointer; transition: color var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast); }
.pxp-new:hover { color: var(--a2ui-text-primary); border-color: var(--a2ui-accent); }
.pxp-list { flex: 1; overflow-y: auto; padding: 0 var(--a2ui-space-2) var(--a2ui-space-3);
  display: flex; flex-direction: column; gap: 1px; }
.pxp-item { position: relative; display: flex; align-items: center; border-radius: var(--a2ui-radius-md);
  transition: background var(--a2ui-transition-fast); }
.pxp-item:hover { background: var(--a2ui-bg-hover); }
.pxp-item[data-on="true"] { background: var(--a2ui-bg-active); }
.pxp-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 8px 10px;
  border: none; background: none; text-align: left; cursor: pointer; }
.pxp-item-title { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-primary); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.pxp-item-time { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }
.pxp-acts { display: flex; gap: 1px; padding-right: 6px; opacity: 0; transition: opacity var(--a2ui-transition-fast); }
.pxp-item:hover .pxp-acts { opacity: 1; }
.pxp-mini { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border: none;
  background: none; color: var(--a2ui-text-tertiary); cursor: pointer; border-radius: var(--a2ui-radius-sm); }
.pxp-mini:hover { background: var(--a2ui-bg-active); color: var(--a2ui-text-primary); }
.pxp-mini--danger:hover { color: var(--a2ui-error, #f87171); }
.pxp-edit { flex: 1; min-width: 0; margin: 5px 8px; padding: 6px 8px; border-radius: var(--a2ui-radius-sm);
  border: 1px solid var(--a2ui-accent); background: var(--a2ui-bg-input); color: var(--a2ui-text-primary);
  font-family: inherit; font-size: var(--a2ui-text-sm); }
.pxp-edit:focus { outline: none; box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.pxp-confirm { display: flex; align-items: center; gap: 6px; padding: 7px 8px 7px 10px; width: 100%; }
.pxp-confirm-txt { flex: 1; min-width: 0; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-secondary); }
.pxp-cbtn { height: 24px; padding: 0 9px; border-radius: var(--a2ui-radius-sm); border: none; font-family: inherit;
  font-size: var(--a2ui-text-xs); font-weight: var(--a2ui-font-medium); cursor: pointer; }
.pxp-cyes { background: var(--a2ui-error, #f87171); color: #fff; }
.pxp-cno { background: var(--a2ui-bg-active); color: var(--a2ui-text-secondary); }
.pxp-empty { padding: var(--a2ui-space-4); font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); text-align: center; }
`;

function relTime(ms: number): string {
  const d = Date.now() - ms;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  try {
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export interface ProjectsPanelProps {
  /** The active project (thread) id — highlighted in the list. */
  activeId?: string | null;
  onClose: () => void;
  onOpenProject: (id: string, title: string) => void;
  onNewProject: () => void;
  /** Distance from the left edge — clears the floating rail (number px or a CSS length). */
  left: number | string;
}

export function ProjectsPanel({ activeId, onClose, onOpenProject, onNewProject, left }: ProjectsPanelProps) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [full, setFull] = useState(false); // quick (narrow) vs full (wide), same glass panel
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/threads?user_id=${encodeURIComponent(DEV_USER_ID)}&limit=50`);
      const data = (await res.json()) as { threads?: ProjectRow[] };
      setProjects(Array.isArray(data.threads) ? data.threads : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const open = (id: string) => {
    // Optimistic "shoots to top" — move the clicked project to the front locally; the server bump
    // (on the next interaction) persists it. Then load the project.
    let title = '';
    setProjects((prev) => {
      const hit = prev.find((p) => p.id === id);
      if (hit) title = hit.title;
      return hit ? [hit, ...prev.filter((p) => p.id !== id)] : prev;
    });
    // Hand the TITLE up too, so the shell can show which project you're now in.
    onOpenProject(id, title);
  };

  const startEdit = (p: ProjectRow) => {
    setConfirmId(null);
    setEditingId(p.id);
    setEditValue(p.title);
  };
  const saveEdit = async () => {
    const id = editingId;
    const title = editValue.trim();
    setEditingId(null);
    if (!id || !title) return;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, title } : p)));
    await fetch(`/api/threads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(() => {});
  };
  const del = async (id: string) => {
    setConfirmId(null);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/threads/${id}?user_id=${encodeURIComponent(DEV_USER_ID)}`, { method: 'DELETE' }).catch(() => {});
  };

  return (
    <div className="pxp" data-full={full ? 'true' : 'false'} style={{ left }}>
      <style>{CSS}</style>
      <div className="pxp-head">
        <span className="pxp-title">Projects</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="pxp-full" onClick={() => setFull((f) => !f)}>{full ? 'Compact' : 'Open full view'}</button>
          <button type="button" className="pxp-x" onClick={onClose} aria-label="Close projects">
            <Icon name="x" size={15} />
          </button>
        </div>
      </div>
      <button type="button" className="pxp-new" onClick={onNewProject}>
        <Icon name="plus" size={15} /> New project
      </button>
      <div className="pxp-list">
        {loading ? (
          <div className="pxp-empty">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="pxp-empty">No projects yet. Start creating and they land here.</div>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="pxp-item" data-on={activeId === p.id ? 'true' : 'false'}>
              {editingId === p.id ? (
                <input
                  className="pxp-edit"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveEdit();
                    else if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => void saveEdit()}
                />
              ) : confirmId === p.id ? (
                <div className="pxp-confirm">
                  <span className="pxp-confirm-txt">Delete project + its assets?</span>
                  <button type="button" className="pxp-cbtn pxp-cno" onClick={() => setConfirmId(null)}>Keep</button>
                  <button type="button" className="pxp-cbtn pxp-cyes" onClick={() => void del(p.id)}>Delete</button>
                </div>
              ) : (
                <>
                  <button type="button" className="pxp-item-main" onClick={() => open(p.id)}>
                    <span className="pxp-item-title">{p.title}</span>
                    <span className="pxp-item-time">{relTime(p.updated_at)}</span>
                  </button>
                  <div className="pxp-acts">
                    <button type="button" className="pxp-mini" title="Rename" onClick={() => startEdit(p)}>
                      <Icon name="pencil" size={13} />
                    </button>
                    <button type="button" className="pxp-mini pxp-mini--danger" title="Delete" onClick={() => setConfirmId(p.id)}>
                      <Icon name="trash-2" size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ProjectsPanel;
