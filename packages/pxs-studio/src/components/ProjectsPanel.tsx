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
.pxp { position: absolute; top: 0; bottom: 0; z-index: 25; width: 280px;
  display: flex; flex-direction: column; background: var(--a2ui-bg-primary);
  border-right: 1px solid var(--a2ui-border-subtle); box-shadow: var(--a2ui-shadow-lg);
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
.pxp-item { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: var(--a2ui-radius-md);
  border: none; background: none; text-align: left; cursor: pointer; width: 100%;
  transition: background var(--a2ui-transition-fast); }
.pxp-item:hover { background: var(--a2ui-bg-hover); }
.pxp-item[data-on="true"] { background: var(--a2ui-bg-active); }
.pxp-item-title { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-primary); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.pxp-item-time { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }
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
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  left: number;
}

export function ProjectsPanel({ activeId, onClose, onOpenProject, onNewProject, left }: ProjectsPanelProps) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    setProjects((prev) => {
      const hit = prev.find((p) => p.id === id);
      return hit ? [hit, ...prev.filter((p) => p.id !== id)] : prev;
    });
    onOpenProject(id);
  };

  return (
    <div className="pxp" style={{ left }}>
      <style>{CSS}</style>
      <div className="pxp-head">
        <span className="pxp-title">Projects</span>
        <button type="button" className="pxp-x" onClick={onClose} aria-label="Close projects">
          <Icon name="x" size={15} />
        </button>
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
            <button key={p.id} type="button" className="pxp-item" data-on={activeId === p.id ? 'true' : 'false'} onClick={() => open(p.id)}>
              <span className="pxp-item-title">{p.title}</span>
              <span className="pxp-item-time">{relTime(p.updated_at)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default ProjectsPanel;
