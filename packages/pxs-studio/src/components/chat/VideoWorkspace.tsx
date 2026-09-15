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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../ui';
import { toastManager } from '../Toast';
import { FrameTimeline } from './FrameTimeline';
import { planFrames, type ShotFrame } from '../../lib/engine/shot-frames';
// Registry DATA only. video-model-agent reaches the DB (and so the sqlite adapter), which a client
// component must never pull into the bundle — MEDIA_MODELS is pure and is all the timeline needs.
import { MEDIA_MODELS } from '../../lib/engine/media-registry';
import { useChatTurnsStore } from '../../store/chat-turns-store';

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
.pxv-builder { position: relative; flex-shrink: 0; display: flex; flex-direction: column; min-height: 0;
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
.pxv-render:disabled { filter: saturate(0.5); cursor: default; }
/* The clip's slot exists WHILE it renders — a 1-3 minute wait with no visible home for the result
   reads as nothing happening. */
.pxv-why { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); line-height: 1.45; margin-top: 6px; }
.pxv-chip:disabled { opacity: 0.45; cursor: not-allowed; }
.pxv-shot-live { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  border: 1px dashed var(--a2ui-accent); background: var(--a2ui-bg-secondary); }
.pxv-live-stage { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-primary); font-weight: var(--a2ui-font-semibold); }
.pxv-live-time { font-size: var(--a2ui-text-xs); color: var(--a2ui-accent); font-variant-numeric: tabular-nums; }
.pxv-live-note { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }
`;

export interface VideoWorkspaceProps {
  renderConversation: () => React.ReactNode;
  /** The video agent's deconstruction of your brief — parts + the shot specs it chose. */
  plan?: { parts?: { id: string; label: string; value?: string }[]; shot?: { durationSec?: number; resolution?: string; aspectRatio?: string; audio?: boolean }; modelId?: string; media?: string } | null;
  /** Live part values (the agent edits these as you talk to it). */
  planValues?: Record<string, string>;
}

export function VideoWorkspace({ renderConversation, plan, planValues }: VideoWorkspaceProps) {
  const [shots, setShots] = useState<Shot[]>([
    { id: 's1', label: 'Shot 1 · establishing' },
    { id: 's2', label: 'Shot 2 · tracking' },
  ]);
  const [scene, setScene] = useState('');
  /**
   * Which model this shot is being built FOR. The frame timeline renders that model's real slots, so
   * the target has to be a choice rather than an assumption — an opening frame is a control on
   * Seedance and an impossibility on a text-only model, and the surface must say which.
   */
  // Routable = vetted enough to spend on. Whether an adapter + key are actually present is a SERVER
  // fact; the render call reports honestly if not, rather than the client guessing.
  const runnable = useMemo(
    () => MEDIA_MODELS.filter((m) => m.modalities.includes('video') && m.video && !m.preview && !m.needsResearch),
    [],
  );
  // Shared, not local: the agent panel plans for whatever is selected here.
  const storedModelId = useChatTurnsStore((st) => st.videoModelId);
  const setVideoModelId = useChatTurnsStore((st) => st.setVideoModelId);
  const modelId = storedModelId ?? runnable[0]?.id ?? '';
  const setModelId = setVideoModelId;
  useEffect(() => {
    // Seed the shared target on first mount, so the agent plans for the model the chips are showing
    // rather than choosing its own before the user has touched anything.
    if (!storedModelId && runnable[0]) setVideoModelId(runnable[0].id);
  }, [storedModelId, runnable, setVideoModelId]);

  /**
   * THE DECONSTRUCTION LANDS HERE. You describe the shot to the agent; it returns the target model's
   * formula filled in, plus the specs it chose. Those become the Scene builder's contents — which is
   * the whole point of having a specialist, and was previously computed and thrown away.
   *
   * It fills, it does not overwrite: once you have edited the scene yourself, a later plan does not
   * wipe your words.
   */
  const [touched, setTouched] = useState(false);

  /** Panel chrome. Persisted so a layout you set survives a reload, like the image workspace's. */
  const [builderOpen, setBuilderOpen] = useState(true);
  const [agentOpen, setAgentOpen] = useState(true);
  const [builderW, setBuilderW] = useState(460);
  const [agentW, setAgentW] = useState(360);
  const drag = useRef<{ x: number; w: number; set: (w: number) => void; min: number; max: number } | null>(null);

  const onMove = useCallback((e: MouseEvent) => {
    const d = drag.current;
    if (!d) return;
    // Both panels sit to the RIGHT of the storyboard, so dragging left widens them.
    d.set(Math.max(d.min, Math.min(d.max, d.w + (d.x - e.clientX))));
  }, []);
  const onUp = useCallback(() => {
    drag.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [onMove]);
  const startResize = useCallback(
    (e: React.MouseEvent, w: number, set: (w: number) => void, min: number, max: number) => {
      drag.current = { x: e.clientX, w, set, min, max };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    },
    [onMove, onUp],
  );
  useEffect(() => {
    if (!plan || touched) return;
    const assembled = (plan.parts ?? [])
      .map((p) => (planValues?.[p.id] ?? p.value ?? '').trim())
      .filter(Boolean)
      .join('. ');
    if (assembled) setScene(assembled);
    if (plan.shot?.durationSec) setDuration((d) => plan.shot!.durationSec ?? d);
    if (typeof plan.shot?.audio === 'boolean') setAudio(plan.shot.audio);
  }, [plan, planValues, touched]);
  const model = runnable.find((m) => m.id === modelId) ?? runnable[0];
  const framePlan = useMemo(() => (model ? planFrames(model) : null), [model]);
  const [frames, setFrames] = useState<ShotFrame[]>([]);
  /** The chosen model's real ceiling — the slider cannot ask for a clip it will not make. */
  const maxDuration = model?.video?.maxDurationSec ?? 15;

  /**
   * Generate synced audio with the picture. Defaults ON for models that make sound, because that is
   * what "video" means to a person — a silent clip is a surprise, not a default. It was not sent AT
   * ALL before this, so every render came back mute no matter what the brief asked for.
   */
  const [audio, setAudio] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [stage, setStage] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [clips, setClips] = useState<{ url: string; modelLabel: string }[]>([]);

  /**
   * Render this shot for real. The camera chips join the prompt because they ARE prompt language on
   * every model here (none takes a camera parameter), and the pinned frames become the seam's
   * startFrame / endFrame / references. Progress is surfaced on the button itself: a 75-120s render
   * with a silent button is indistinguishable from a broken one.
   */
  async function renderClip() {
    if (!scene.trim() || !model) return;
    setRendering(true);
    setStage('Sending…');
    setElapsed(0);
    const t0 = Date.now();
    const ticker = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    const camera = [...moves];
    const prompt = camera.length > 0 ? `${scene.trim()} Camera: ${camera.join(', ')}.` : scene.trim();
    const { framesToRequest } = await import('../../lib/engine/shot-frames');

    try {
      const res = await fetch('/api/video-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          render_prompt: prompt,
          shot: {
            durationSec: duration,
            models: [model.id],
            fanModels: 1,
            perModel: 1,
            audio: audio && !!model.video?.nativeAudio,
            ...framesToRequest(frames),
          },
        }),
      });
      if (!res.body) throw new Error('no stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: { type?: string; stage?: string; url?: string; modelLabel?: string; message?: string };
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.type === 'fan_model' && evt.stage) setStage(evt.stage);
          else if (evt.type === 'clip' && evt.url) setClips((c) => [...c, { url: evt.url!, modelLabel: evt.modelLabel ?? '' }]);
          else if (evt.type === 'gen_error' && evt.message) toastManager.info(evt.message);
        }
      }
    } catch (err) {
      toastManager.info(err instanceof Error ? err.message : 'The render could not start.');
    } finally {
      clearInterval(ticker);
      setRendering(false);
      setStage('');
    }
  }
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
            {rendering && (
              <div>
                <div className="pxv-shot pxv-shot-live">
                  <span className="pxv-live-stage">{stage || 'Working…'}</span>
                  <span className="pxv-live-time">{elapsed}s</span>
                  <span className="pxv-live-note">Video takes 1–3 minutes</span>
                </div>
                <div className="pxv-connect"><Icon name="chevron-down" size={16} /></div>
              </div>
            )}
            {clips.map((c, i) => (
              <div key={c.url}>
                <div className="pxv-shot" data-wash={i % 2 === 0 ? 'a' : 'b'} style={{ padding: 0, overflow: 'hidden' }}>
                  <video
                    src={c.url}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
                    onMouseLeave={(e) => e.currentTarget.pause()}
                  />
                </div>
                <div className="pxv-connect"><Icon name="chevron-down" size={16} /></div>
              </div>
            ))}
            {clips.length === 0 && shots.map((s, i) => (
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
      {builderOpen && (
        <div
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
          onMouseDown={(e) => startResize(e, builderW, setBuilderW, 360, 760)}
          className="pxs-resize shrink-0"
        />
      )}
      {!builderOpen && (
        <button type="button" className="pxs-agent-tab shrink-0" onClick={() => setBuilderOpen(true)} title="Open the Scene builder">
          <Icon name="sparkles" size={16} />
        </button>
      )}
      <div className="pxv-builder" style={{ width: builderW, display: builderOpen ? 'flex' : 'none' }}>
        <div className="pxs-agent-head">
          <span className="pxs-agent-title"><Icon name="sparkles" size={15} /> Scene builder</span>
          <button type="button" onClick={() => setBuilderOpen(false)} title="Collapse the Scene builder">
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="pxv-builder-scroll">
          <div className="pxv-card">
            <div className="pxv-card-label">Scene</div>
            <textarea
              className="pxv-textarea"
              value={scene}
              onChange={(e) => {
                setTouched(true);
                setScene(e.target.value);
              }}
              placeholder="Two explorers cross a foreign plain, chased from behind."
            />
          </div>


          <div className="pxv-card">
            <div className="pxv-card-label">Duration</div>
            <div className="pxv-dur">
              <span className="pxv-dur-val">{duration}s</span>
              <div className="pxv-dur-bar">
                <div className="pxv-dur-fill" style={{ width: `${((duration - 2) / Math.max(1, maxDuration - 2)) * 100}%` }} />
              </div>
            </div>
            <input
              className="pxv-dur-range"
              type="range"
              min={2}
              max={maxDuration}
              value={duration}
              aria-label="Clip duration in seconds"
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          <div className="pxv-card">
            <div className="pxv-card-label">Sound</div>
            <div className="pxv-chips">
              <button
                type="button"
                className="pxv-chip"
                data-on={audio && !!model?.video?.nativeAudio ? 'true' : 'false'}
                disabled={!model?.video?.nativeAudio}
                onClick={() => setAudio((a) => !a)}
                title={
                  model?.video?.nativeAudio
                    ? 'Generate engine, ambience and effects in the same pass as the picture'
                    : `${model?.label ?? 'This model'} renders picture only`
                }
              >
                <Icon name={audio && model?.video?.nativeAudio ? 'check' : 'plus'} size={13} /> Synced audio
              </button>
            </div>
            {!model?.video?.nativeAudio && (
              <div className="pxv-why">{model?.label} renders picture only — pick a model with audio for sound.</div>
            )}
          </div>

          {framePlan && (
            <div className="pxv-card">
              <FrameTimeline
                plan={framePlan}
                frames={frames}
                durationSec={duration}
                onChange={setFrames}
              />
            </div>
          )}

          {runnable.length > 1 && (
            <div className="pxv-card">
              <div className="pxv-card-label">Model</div>
              <div className="pxv-chips">
                {runnable.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="pxv-chip"
                    data-on={m.id === model?.id ? 'true' : 'false'}
                    onClick={() => {
                      setModelId(m.id);
                      const cap = m.video?.maxDurationSec ?? 15;
                      setDuration((d) => Math.min(d, cap));
                    }}
                    title={`${m.video?.maxDurationSec ?? '?'}s max · ${m.video?.nativeAudio ? 'synced audio' : 'no audio'}`}
                  >
                    {m.label.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          )}

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

        </div>

        <button
          type="button"
          className="pxv-render"
          disabled={rendering || !scene.trim()}
          onClick={() => void renderClip()}
        >
          <Icon name="sparkles" size={16} /> {rendering ? `${stage || 'Rendering'} · ${elapsed}s` : 'Render clip'}
        </button>
      </div>

      {/* AGENT — the same conversation + composer as Image. */}
      <div role="separator" aria-orientation="vertical" className="pxs-resize shrink-0" />
      {agentOpen ? (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize"
            onMouseDown={(e) => startResize(e, agentW, setAgentW, 300, 640)}
            className="pxs-resize shrink-0"
          />
          <aside
            className="shrink-0 flex flex-col min-h-0"
            style={{ width: agentW, borderLeft: '1px solid var(--a2ui-border-subtle)', background: 'var(--a2ui-bg-app)' }}
          >
            <div className="pxs-agent-head">
              <span className="pxs-agent-title"><Icon name="message-square" size={15} /> Agent</span>
              <button type="button" onClick={() => setAgentOpen(false)} title="Collapse the Agent">
                <Icon name="x" size={15} />
              </button>
            </div>
            {renderConversation()}
          </aside>
        </>
      ) : (
        <button type="button" className="pxs-agent-tab shrink-0" onClick={() => setAgentOpen(true)} title="Open the Agent">
          <Icon name="message-square" size={16} />
        </button>
      )}
    </div>
  );
}

export default VideoWorkspace;
