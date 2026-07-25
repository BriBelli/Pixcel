'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * VideoWorkspace — the Video section's IDE lens (the mock's three-panel video screen).
 *
 * Left = STORYBOARD (stacked 16/9 shot frames + ↓ connectors + dashed "Add shot").
 * Center = SCENE BUILDER (Scene textarea, Camera & motion chips, Duration mono + gradient bar)
 *          with a floating "Render clip" button.
 * Right = AGENT (the same conversation + composer as Image — passed in as `renderConversation`).
 *
 * SCOPE (per the handoff): this is the VISUAL scaffold only. Real clip generation, the two-way
 * A2UI binding, and the Storyboard→Film timeline are roadmap — deliberately not wired here. It reuses
 * ChatView's injected panel chrome (.pxs-agent-head / .pxs-resize), so it must render inside ChatView.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { Icon } from '../ui';
import { toastManager } from '../Toast';

interface Shot {
  id: string;
  label: string;
}

const CAMERA_MOVES = ['rear tracking', 'handheld', 'slow push-in', 'drone pull-back', 'whip pan'];

const CSS = `
.pxv { position: relative; flex: 1; display: flex; min-width: 0; }

/* ── STORYBOARD (left) ── */
.pxv-board { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--a2ui-bg-app); }
.pxv-board-head { display: flex; align-items: center; padding: var(--a2ui-space-5) var(--a2ui-space-6) var(--a2ui-space-2); }
.pxv-label { font-size: var(--a2ui-text-xs); font-weight: var(--a2ui-font-semibold); text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--a2ui-text-tertiary); }
.pxv-board-scroll { flex: 1; overflow-y: auto; padding: var(--a2ui-space-3) var(--a2ui-space-6) var(--a2ui-space-8); }
.pxv-shot { position: relative; border-radius: var(--a2ui-radius-lg); aspect-ratio: 16 / 9; overflow: hidden;
  box-shadow: 0 0 0 1px var(--pxs-border-subtle); display: flex; align-items: flex-end; padding: var(--a2ui-space-3); }
.pxv-shot[data-wash="a"] { background: radial-gradient(120% 130% at 26% 20%, var(--px-tint-coral), var(--a2ui-bg-tertiary) 68%); }
.pxv-shot[data-wash="b"] { background: radial-gradient(120% 130% at 74% 24%, var(--px-tint-violet), var(--a2ui-bg-tertiary) 68%); }
.pxv-shot-label { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-secondary); }
.pxv-connect { display: flex; align-items: center; justify-content: center; height: 30px; color: var(--a2ui-text-tertiary); }
.pxv-add { width: 100%; border: 1px dashed var(--a2ui-border-default); border-radius: var(--a2ui-radius-lg);
  aspect-ratio: 16 / 4; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
  background: none; color: var(--a2ui-text-tertiary); font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm);
  transition: color var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast); }
.pxv-add:hover { color: var(--a2ui-text-primary); border-color: var(--a2ui-accent); }

/* ── SCENE BUILDER (center) ── */
.pxv-builder { position: relative; width: 460px; flex-shrink: 0; display: flex; flex-direction: column; min-height: 0;
  border-left: 1px solid var(--a2ui-border-subtle); background: var(--a2ui-bg-app); }
.pxv-builder-scroll { flex: 1; overflow-y: auto; padding: var(--a2ui-space-5); display: flex; flex-direction: column; gap: var(--a2ui-space-4); }
.pxv-card { border: 1px solid var(--pxc-border-subtle); border-radius: var(--a2ui-radius-lg);
  background: var(--pxc-bg-glass-frost); padding: var(--a2ui-space-4); }
.pxv-card-label { font-size: var(--a2ui-text-xs); font-weight: var(--a2ui-font-semibold); text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--a2ui-text-tertiary); margin-bottom: var(--a2ui-space-3); }
.pxv-textarea { width: 100%; box-sizing: border-box; min-height: 78px; resize: vertical; padding: 10px 12px;
  border-radius: var(--a2ui-radius-md); border: 1px solid var(--a2ui-border-default); background: var(--a2ui-bg-input);
  color: var(--a2ui-text-primary); font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-md); line-height: 1.5; }
.pxv-textarea:focus { outline: none; border-color: var(--a2ui-accent); box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
.pxv-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.pxv-chip { height: 34px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--a2ui-border-default); border-radius: var(--a2ui-radius-full); background: none;
  color: var(--a2ui-text-secondary); font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm); cursor: pointer;
  transition: color var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); }
.pxv-chip:hover { color: var(--a2ui-text-primary); border-color: var(--a2ui-border-strong); }
.pxv-chip[data-on="true"] { color: var(--pxs-accent-text); border-color: var(--a2ui-accent); background: var(--a2ui-accent-subtle); }
.pxv-dur { display: flex; align-items: center; gap: var(--a2ui-space-4); }
.pxv-dur-val { font-family: var(--a2ui-font-mono); font-size: var(--a2ui-text-2xl); color: var(--a2ui-text-primary);
  min-width: 52px; font-variant-numeric: tabular-nums; }
.pxv-dur-bar { flex: 1; height: 6px; border-radius: var(--a2ui-radius-full); background: var(--a2ui-bg-tertiary); overflow: hidden; }
.pxv-dur-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--pxs-brand-primary), var(--pxs-brand-secondary)); }
.pxv-dur-range { width: 100%; margin-top: var(--a2ui-space-3); accent-color: var(--pxs-brand-primary); }
.pxv-render { position: absolute; right: var(--a2ui-space-5); bottom: var(--a2ui-space-5);
  display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 20px; border: none;
  border-radius: var(--a2ui-radius-lg); background: linear-gradient(135deg, var(--pxs-brand-primary), var(--pxs-brand-secondary));
  color: #fff; font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-md); font-weight: var(--a2ui-font-semibold);
  cursor: pointer; box-shadow: var(--px-btn-glow); transition: filter var(--a2ui-transition-fast); }
.pxv-render:hover { filter: brightness(1.06); }
`;

export function VideoWorkspace({ renderConversation }: { renderConversation: () => React.ReactNode }) {
  const [shots, setShots] = useState<Shot[]>([
    { id: 's1', label: 'Shot 1 · establishing' },
    { id: 's2', label: 'Shot 2 · tracking' },
  ]);
  const [scene, setScene] = useState('');
  const [moves, setMoves] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(6);

  const addShot = () =>
    setShots((prev) => [...prev, { id: `s${prev.length + 1}-${prev.length}`, label: `Shot ${prev.length + 1}` }]);
  const toggleMove = (m: string) =>
    setMoves((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });

  return (
    <div className="pxv">
      <style>{CSS}</style>

      {/* STORYBOARD */}
      <div className="pxv-board">
        <div className="pxv-board-head"><span className="pxv-label">Storyboard</span></div>
        <div className="pxv-board-scroll">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {shots.map((s, i) => (
              <div key={s.id}>
                <div className="pxv-shot" data-wash={i % 2 === 0 ? 'a' : 'b'}>
                  <span className="pxv-shot-label">{s.label}</span>
                </div>
                <div className="pxv-connect"><Icon name="chevron-down" size={16} /></div>
              </div>
            ))}
            <button type="button" className="pxv-add" onClick={addShot}>
              <Icon name="plus" size={15} /> Add shot
            </button>
          </div>
        </div>
      </div>

      {/* SCENE BUILDER */}
      <div className="pxv-builder">
        <div className="pxs-agent-head">
          <span className="pxs-agent-title"><Icon name="sparkles" size={15} /> Scene builder</span>
        </div>
        <div className="pxv-builder-scroll">
          <div className="pxv-card">
            <div className="pxv-card-label">Scene</div>
            <textarea
              className="pxv-textarea"
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="Two explorers cross a foreign plain, chased from behind."
            />
          </div>

          <div className="pxv-card">
            <div className="pxv-card-label">Camera &amp; motion</div>
            <div className="pxv-chips">
              {CAMERA_MOVES.map((m) => (
                <button key={m} type="button" className="pxv-chip" data-on={moves.has(m) ? 'true' : 'false'} onClick={() => toggleMove(m)}>
                  <Icon name={moves.has(m) ? 'check' : 'plus'} size={13} /> {m}
                </button>
              ))}
            </div>
          </div>

          <div className="pxv-card">
            <div className="pxv-card-label">Duration</div>
            <div className="pxv-dur">
              <span className="pxv-dur-val">{duration}s</span>
              <div className="pxv-dur-bar">
                <div className="pxv-dur-fill" style={{ width: `${((duration - 2) / (15 - 2)) * 100}%` }} />
              </div>
            </div>
            <input
              className="pxv-dur-range"
              type="range"
              min={2}
              max={15}
              value={duration}
              aria-label="Clip duration in seconds"
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
        </div>

        <button
          type="button"
          className="pxv-render"
          onClick={() => toastManager.success('Clip rendering is on the Video roadmap — the scene is captured.')}
        >
          <Icon name="sparkles" size={16} /> Render clip
        </button>
      </div>

      {/* AGENT — the same conversation + composer as Image. */}
      <div role="separator" aria-orientation="vertical" className="pxs-resize shrink-0" />
      <aside
        className="shrink-0 flex flex-col min-h-0"
        style={{ width: 360, borderLeft: '1px solid var(--a2ui-border-subtle)', background: 'var(--a2ui-bg-app)' }}
      >
        <div className="pxs-agent-head">
          <span className="pxs-agent-title"><Icon name="message-square" size={15} /> Agent</span>
        </div>
        {renderConversation()}
      </aside>
    </div>
  );
}

export default VideoWorkspace;
