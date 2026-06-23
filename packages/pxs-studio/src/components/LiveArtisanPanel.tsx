'use client';

import { useEffect, useRef, useState } from 'react';
import type { GridData } from '../workers/grid.worker';
import { applyGalleryFrame } from '../lib/apply-gallery-frame';
import { useGalleryStore } from '../store/gallery-store';
import { useLiveArtStore, feedToTranscript } from '../store/live-art-store';
import { toastManager } from './Toast';

interface Props {
  onGridUpdate: (gridData: GridData) => void;
}

type ModelId = 'claude-opus-4-8' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';
const MODELS: { id: ModelId; label: string }[] = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8 · top craft (default)' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 · faster' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 · cheapest' },
];
const SIZES = [16, 24, 32, 48, 64];
// Canvas SHAPE presets (separate from Size/resolution). 'auto' = the artist picks the best for the
// subject (the smart default); the rest force a shape; 'custom' = exact W×H. (docs/SPEC-DIMENSIONS.md)
const ASPECTS = [
  { id: 'auto' as const, label: 'Auto', title: 'The artist picks the best shape for your subject (a car is wide, a tower is tall) — the smart default.' },
  { id: 'landscape' as const, label: 'Landscape', title: 'Landscape / wide — cars, scenes, anything horizontal.' },
  { id: 'portrait' as const, label: 'Portrait', title: 'Portrait / tall — figures, towers, anything vertical.' },
  { id: 'square' as const, label: 'Square', title: 'Square (1:1) — icons, faces, symmetric subjects.' },
  { id: 'custom' as const, label: 'Custom', title: 'Set the exact width × height yourself.' },
];
// The hidden pass CEILING per complexity tier (mirrors live-jobs CEILINGS) — shown to the USER as the
// max-rounds cap; it stays hidden from the AI (which approves on quality). Auto → the top of the range.
const PASS_CAPS: Record<string, number> = { simple: 4, moderate: 6, complex: 9, advanced: 12 };
const SUGGESTIONS = ['a red apple', 'a snail', 'a teapot', 'a ladybug'];

export default function LiveArtisanPanel({ onGridUpdate }: Props) {
  const [input, setInput] = useState('');
  const [size, setSize] = useState(24);
  const [model, setModel] = useState<ModelId>('claude-opus-4-8');
  // Aspect = the canvas SHAPE (separate from Size/resolution). 'auto' = the artist picks the best shape
  // for the subject — the smart default. Presets force a shape; 'custom' = exact W×H. (docs/SPEC-DIMENSIONS.md)
  const [aspect, setAspect] = useState<'auto' | 'portrait' | 'landscape' | 'square' | 'custom'>('auto');
  const [manualW, setManualW] = useState(48);
  const [manualH, setManualH] = useState(32);
  // 2.1 — HIDDEN pass budget (the AI never sees it; '' = auto by complexity, up to 90).
  const [passes, setPasses] = useState<number | ''>('');
  // 2.2 — complexity: 'auto' lets VISION estimate; else the user forces the tier (simplifies the AI).
  const [complexity, setComplexity] = useState<string>('auto');
  // Dims to send, derived from the SHAPE + the size budget. 'auto' omits cols/rows (VISION picks the
  // shape itself); presets derive cols×rows from `size` (3:2); 'custom' = the exact W×H.
  const shortEdge = Math.max(8, Math.round(size * 2 / 3));
  const dims =
    aspect === 'square' ? { cols: size, rows: size }
    : aspect === 'landscape' ? { cols: size, rows: shortEdge }
    : aspect === 'portrait' ? { cols: shortEdge, rows: size }
    : aspect === 'custom' ? { cols: manualW, rows: manualH }
    : {};
  // The effective max-rounds cap shown to the user (Auto → top of the range). Stays hidden from the AI.
  const passCap = complexity === 'auto' ? 12 : (PASS_CAPS[complexity] ?? 12);
  const startArgs = (prompt: string) => ({
    prompt, size, model, ...dims,
    passes: passes === '' ? undefined : passes,
    complexity: complexity === 'auto' ? undefined : complexity,
  });
  const { jobId, job, startedAt, reviewing, accepted, start, resume, control, feedback, accept, reject } = useLiveArtStore();
  const addPiece = useGalleryStore((s) => s.addPiece);
  const [elapsed, setElapsed] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const thinkRef = useRef<HTMLDivElement>(null);

  const running = job?.status === 'running';
  const curFrame = job?.frame || job?.latestFrame;
  const strokes = job?.gestures ?? 0;
  const [briefOpen, setBriefOpen] = useState(false);
  const STAGES = ['vision', 'shape', 'polish', 'qa'] as const;
  const stage = job?.stage ?? 'vision';
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (!jobId || !running) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [jobId, running, startedAt]);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [job?.feed?.length]);
  useEffect(() => {
    thinkRef.current?.scrollTo({ top: thinkRef.current.scrollHeight });
  }, [job?.liveThinking]);

  function onSend() {
    const p = input.trim();
    if (!p) return;
    if (running) feedback(p);
    else start(startArgs(p));
    setInput('');
  }
  function saveCurrent() {
    if (!curFrame) return;
    addPiece({
      id: crypto.randomUUID(),
      title: job?.title || 'Live piece',
      prompt: input || 'live piece',
      promptBy: 'human',
      composedBy: 'ai-composer',
      frame: curFrame,
      createdAt: Date.now(),
      model,
      session: { mode: 'sculpt', transcript: feedToTranscript(job?.feed ?? []) },
    });
    toastManager.success('Saved to your Art gallery');
  }
  function loadOnCanvas() {
    if (!curFrame) return;
    onGridUpdate(applyGalleryFrame(curFrame, `AI: ${job?.title ?? 'piece'}`));
    toastManager.success('Loaded on canvas');
  }
  function onCancel() {
    const save = window.confirm('Cancel the artist? OK = save the current artwork to your gallery first; Cancel = discard. Either way the agent stops.');
    if (save) saveCurrent();
    control('cancel');
    toastManager.success('Stopping the artist…');
  }
  function onIterate() {
    const note = window.prompt('Run ANOTHER round. Add a note to steer it (e.g. "bigger eyes", "richer shading", "add a hat"), or leave blank to just have the artist refine + elevate the piece further.');
    if (note === null) return; // cancelled
    // Resume the autonomous process for another round. A blank note becomes a generic "push it further"
    // so Iterate always does meaningful work (otherwise the satisfied judge would just re-approve as-is).
    reject(note.trim() || 'Take this further — push it a notch past where it is now (sharper details, richer form, more polish) WITHOUT changing the committed design.');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!jobId && (
          <div className="text-[11px] text-text-muted leading-relaxed space-y-3">
            <p>
              Describe anything — a fox, a teapot, your logo — and watch it come to life on the
              canvas, drawn step by step like a real artist would.
            </p>
            <p className="text-[10px]">Chime in with feedback any time while it works. Pieces take a few minutes — it keeps going in the background.</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => start(startArgs(s))}
                  className="px-2 py-1 rounded-md border border-border bg-background-tertiary text-[10px] text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {jobId && (
          <>
            {/* Status + phase progress + controls (the canvas itself is on the center easel) */}
            <div className="rounded-lg border border-border bg-background-tertiary p-2.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                <span className="text-accent-purple">✦</span> Drawing on the canvas → look &amp; refine until it&apos;s right
              </div>
              <div className="flex items-center justify-between text-[9px] text-text-muted font-mono">
                <span>
                  {running ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {stage.toUpperCase()}{strokes ? ` · pass ${strokes}` : ''} · {mmss}{job?.costUsd ? ` · $${job.costUsd.toFixed(2)}` : ''}
                    </span>
                  ) : job?.status === 'done' ? (
                    accepted ? (
                      <span className="text-accent-green">✓ kept · saved to gallery · {job?.cells} cells{job?.costUsd ? ` · $${job.costUsd.toFixed(2)}` : ''}</span>
                    ) : (
                      <span className="text-accent-purple">● the artist says it&apos;s done — your call · {job?.cells} cells · {job?.durationMs ? `${(job.durationMs / 1000).toFixed(0)}s` : ''}{job?.costUsd ? ` · $${job.costUsd.toFixed(2)}` : ''}</span>
                    )
                  ) : job?.status === 'paused' ? (
                    <span className="text-accent-yellow">⏸ paused</span>
                  ) : (
                    <span className="text-accent-red">stopped</span>
                  )}
                </span>
                {curFrame && (
                  <button onClick={loadOnCanvas} className="text-text-secondary hover:text-text-primary">
                    Load to edit
                  </button>
                )}
              </div>
              {/* controls */}
              <div className="flex items-center gap-1.5">
                {running && (
                  <>
                    <button onClick={() => control('pause')} className="px-2 py-0.5 rounded border border-border bg-background-overlay text-[9px] text-text-secondary hover:text-text-primary hover:border-border-hover">⏸ Pause</button>
                    <button onClick={onCancel} className="px-2 py-0.5 rounded border border-accent-red/40 bg-accent-red/10 text-[9px] text-accent-red hover:bg-accent-red/20">✕ Cancel</button>
                  </>
                )}
                {/* HONESTY GATE — the artist proposes, you dispose. Keep saves; push back reworks. */}
                {job?.status === 'done' && reviewing && curFrame && (
                  <>
                    <button onClick={() => accept()} title="Save to your art assets — added to your gallery; load it back any time to keep editing." className="px-2 py-0.5 rounded bg-accent-green text-background-primary text-[9px] font-semibold hover:opacity-90">✓ Save</button>
                    <button onClick={onIterate} title="Run another round — keep refining autonomously, optionally with a note to steer it (e.g. 'bigger eyes')." className="px-2 py-0.5 rounded border border-accent-yellow/40 bg-accent-yellow/10 text-[9px] text-accent-yellow hover:bg-accent-yellow/20">↻ Iterate</button>
                    <button onClick={() => reject()} title="Cancel — discard this piece (nothing is saved)." className="px-2 py-0.5 rounded border border-border bg-background-overlay text-[9px] text-text-muted hover:text-text-primary">✕ Cancel</button>
                  </>
                )}
                {(job?.status === 'paused' || job?.status === 'cancelled' || job?.status === 'error') && curFrame && (
                  <>
                    <button onClick={() => resume()} className="px-2 py-0.5 rounded bg-accent-purple text-white text-[9px] hover:opacity-90">▶ Resume</button>
                    <button onClick={saveCurrent} className="px-2 py-0.5 rounded border border-border bg-background-overlay text-[9px] text-text-secondary hover:text-text-primary">Save</button>
                  </>
                )}
              </div>
              {job?.status === 'done' && reviewing && (
                <div className="text-[9px] text-text-muted leading-snug"><b className="text-accent-green">Save</b> → into your art assets (load it back from the gallery to keep editing). <b className="text-accent-yellow">Iterate</b> → another round, optionally with a note to steer it. <b>Cancel</b> → discard. Nothing is saved until you say so.</div>
              )}
              {/* Statue-stage progress — VISION → SHAPE → POLISH → QA */}
              <div className="flex items-center gap-1 text-[8px] font-mono">
                {STAGES.map((s, i) => {
                  const done = job?.stagesPassed?.includes(s) || (stage === 'done');
                  const active = stage === s && running;
                  return (
                    <span key={s} className="inline-flex items-center gap-1">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          done ? 'bg-accent-green/20 text-accent-green' : active ? 'bg-primary/20 text-primary' : 'bg-background-overlay text-text-muted'
                        }`}
                      >
                        {done ? '✓ ' : ''}{s.toUpperCase()}
                      </span>
                      {i < STAGES.length - 1 && <span className="text-text-muted">›</span>}
                    </span>
                  );
                })}
              </div>
              {job?.status === 'paused' && <div className="text-[9px] text-accent-yellow">⏸ Paused — checkpointed and resumable.</div>}
              {job?.error && <div className="text-[9px] text-accent-red">{job.error}</div>}
            </div>

            {/* The committed VISION design brief — read-only (the intent the whole reveal builds toward) */}
            {job?.brief && (
              <div className="rounded-lg border border-border bg-background-tertiary p-2.5">
                <button
                  onClick={() => setBriefOpen((o) => !o)}
                  className="flex items-center justify-between w-full text-[10px] text-text-secondary hover:text-text-primary"
                >
                  <span className="inline-flex items-center gap-1.5"><span className="text-accent-purple">◆</span> Design brief <span className="text-text-muted">(the committed vision)</span></span>
                  <span className="text-text-muted">{briefOpen ? '▾' : '▸'}</span>
                </button>
                {briefOpen && (
                  <pre className="mt-2 whitespace-pre-wrap text-[9px] leading-relaxed text-text-muted font-mono max-h-48 overflow-y-auto">{job.brief}</pre>
                )}
              </div>
            )}

            {/* The artist's thinking + the studio feed live on the CANVAS now, not here. */}
            <p className="text-[10px] text-text-muted leading-snug">
              Watch the thinking &amp; the strokes on the <span className="text-text-secondary">canvas</span>. Type below to give live feedback.
            </p>
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2.5 space-y-2 shrink-0">
        {size >= 48 && (
          <p className="text-[9px] text-accent-yellow leading-snug">
            {size}px is finer and takes a bit longer — still a handful of drafts, a few minutes.
          </p>
        )}
        {/* Size (the budget — longest edge) + model */}
        <div className="flex items-center gap-2 text-[9px]">
          <span className="uppercase tracking-wider text-text-muted" title="The artwork's PIXEL resolution — the grid size on its longest edge (not a zoom level). The Shape control below sets the canvas proportions.">Size</span>
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            title="The artwork's pixel resolution (longest edge). Bigger = finer, slower, pricier."
            className="rounded-md border border-border bg-background-tertiary px-1.5 py-1 text-[9px] text-text-secondary focus:outline-none focus:border-border-hover"
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>{s} px{s >= 48 ? ' · finer' : ''}</option>
            ))}
          </select>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelId)}
            className="ml-auto rounded-md border border-border bg-background-tertiary px-1.5 py-1 text-[9px] text-text-secondary focus:outline-none focus:border-border-hover"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Shape (aspect) — Auto = the artist picks the best for the subject; presets force it; custom = W×H */}
        <div className="flex flex-wrap items-center gap-2 text-[9px]">
          <span className="uppercase tracking-wider text-text-muted" title="The canvas SHAPE (separate from Size). Auto lets the artist pick the best for your subject — a car is WIDE, a tower is TALL. Square crams a car into a UFO — pick Landscape for vehicles.">Shape</span>
          <select
            value={aspect}
            onChange={(e) => setAspect(e.target.value as typeof aspect)}
            title="The canvas SHAPE (separate from Size). Auto = the artist picks the best for your subject; pick Landscape for cars/wide things."
            className="rounded-md border border-border bg-background-tertiary px-1.5 py-1 text-[9px] text-text-secondary focus:outline-none focus:border-border-hover"
          >
            {ASPECTS.map((a) => (
              <option key={a.id} value={a.id} title={a.title}>{a.label}</option>
            ))}
          </select>
          {aspect === 'custom' && (
            <div className="flex items-center gap-1 rounded-md border border-border bg-background-tertiary px-1.5 py-0.5 text-text-secondary">
              <input
                type="number" min={8} max={64} value={manualW}
                onChange={(e) => setManualW(Math.min(64, Math.max(8, Math.round(+e.target.value || 8))))}
                title="width (cells)"
                className="w-8 bg-transparent text-center text-text-primary focus:outline-none"
              />
              <span className="text-text-muted">×</span>
              <input
                type="number" min={8} max={64} value={manualH}
                onChange={(e) => setManualH(Math.min(64, Math.max(8, Math.round(+e.target.value || 8))))}
                title="height (cells)"
                className="w-8 bg-transparent text-center text-text-primary focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* 2.1 passes (hidden budget) + 2.2 complexity — the interactive controls. */}
        <div className="flex items-center gap-2 text-[9px] text-text-muted">
          <label className="flex items-center gap-1" title="The MAX number of refine rounds before it must ship — your cost seatbelt, HIDDEN from the AI (it approves on quality, never to fill a budget). Blank = the cap for the chosen Detail tier (shown in the box); type a number to override, up to 90.">
            <span className="uppercase tracking-wider">Max rounds</span>
            <input
              type="number" min={1} max={90} value={passes}
              placeholder={String(passCap)}
              onChange={(e) => setPasses(e.target.value === '' ? '' : Math.min(90, Math.max(1, Math.round(+e.target.value || 1))))}
              title={`default cap for ${complexity === 'auto' ? 'the estimated tier' : complexity} = ${passCap}`}
              className="w-12 rounded-md border border-border bg-background-tertiary px-1 py-0.5 text-center text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
            />
          </label>
          <label className="flex items-center gap-1" title="Detail/complexity tier. Auto lets the designer estimate it; pick one to set it yourself.">
            <span className="uppercase tracking-wider">Detail</span>
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              className="rounded-md border border-border bg-background-tertiary px-1.5 py-0.5 text-text-secondary focus:outline-none focus:border-border-hover"
            >
              <option value="auto">Auto</option>
              <option value="simple">Simple</option>
              <option value="moderate">Moderate</option>
              <option value="complex">Complex</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          {passes !== '' && passes >= 24 && (
            <span className="ml-auto text-accent-yellow/80" title="More rounds = more spend (each round is one model call).">~{passes} rounds · higher cost</span>
          )}
        </div>
        <div className="flex items-end gap-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={2}
            placeholder={running ? 'Send live feedback to the artist…  (e.g. "make two tentacles into arms")' : 'Describe a piece to sculpt live…'}
            className="flex-1 resize-none rounded-md border border-border bg-background-tertiary px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
          />
          <button
            onClick={onSend}
            disabled={!input.trim()}
            className="rounded-md bg-accent-purple hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white w-8 h-8 flex items-center justify-center shrink-0 transition-opacity"
            title={running ? 'Send live feedback' : 'Sculpt live'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
