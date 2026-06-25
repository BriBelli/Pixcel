'use client';

import { useEffect, useRef, useState } from 'react';
import type { GridData } from '../workers/grid.worker';
import { applyGalleryFrame } from '../lib/apply-gallery-frame';
import { useGalleryStore } from '../store/gallery-store';
import { useLiveArtStore, feedToTranscript } from '../store/live-art-store';
import { usePXSStore, type PXSFrame } from '../store/pxs-store';
import { toastManager } from './Toast';

interface Props {
  onGridUpdate: (gridData: GridData, label?: string) => void;
}

type ModelId = 'claude-opus-4-8' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';
const MODELS: { id: ModelId; label: string }[] = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
];
const SIZES = [16, 24, 32, 48, 64];
// Canvas ASPECT-RATIO presets (separate from resolution). Rendered as a dropdown whose DEFAULT option
// is "Auto" (the artist picks the best shape for the subject); these are the explicit overrides.
// 'custom' = exact W×H (shows the W/H inputs). (docs/SPEC-DIMENSIONS.md)
const ASPECTS = [
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
  const [lastPrompt, setLastPrompt] = useState(''); // the last subject we generated — for "Redo" (fresh re-roll)
  const [size, setSize] = useState(32);
  const [model, setModel] = useState<ModelId>('claude-opus-4-8');
  // Aspect = the canvas SHAPE (separate from Size/resolution). 'auto' = the artist picks the best shape
  // for the subject — the smart default. Presets force a shape; 'custom' = exact W×H. (docs/SPEC-DIMENSIONS.md)
  const [aspect, setAspect] = useState<'auto' | 'portrait' | 'landscape' | 'square' | 'custom'>('auto');
  const [manualW, setManualW] = useState(48);
  const [manualH, setManualH] = useState(32);
  // 2.1 — HIDDEN pass budget (the AI never sees it; '' = auto by complexity, up to 90).
  const [passes, setPasses] = useState<number | ''>('');
  // Complexity is ALWAYS auto-estimated by VISION. The manual "Detail" override (Simple/Moderate/…) was
  // removed — its tiers were dead, confusing dead-space (no user knows which to pick). Kept as a const so
  // the cost-cap math below still reads it.
  const complexity = 'auto';
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
  const { jobId, job, startedAt, reviewing, accepted, start, resume, control, feedback, accept, reject, refineFrame, restoredDraft, keepDraft, discardDraft, setPiece } = useLiveArtStore();
  const addPiece = useGalleryStore((s) => s.addPiece);
  const canvasCells = usePXSStore((s) => s.grid.cells.size); // is there a piece on the canvas to refine?
  const [refineNote, setRefineNote] = useState('');
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

  // AUTO-DRAFT RECOVERY (Opus Design): a piece recovered from a prior session → drop it on the canvas so
  // the user sees their unsaved work; the banner below lets them Save (promote) or Discard it.
  const restoredShown = useRef(false);
  useEffect(() => {
    if (restoredDraft && !jobId && !restoredShown.current) {
      restoredShown.current = true;
      onGridUpdate(applyGalleryFrame(restoredDraft.frame, `Recovered: ${restoredDraft.title}`), `↩ ${restoredDraft.title}`);
      setPiece(restoredDraft.frame, restoredDraft.title); // the recovered piece becomes the current piece (fresh version chain)
      toastManager.success('Restored an unsaved piece — Save to keep it');
    }
  }, [restoredDraft, jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // LEAVE GUARD (Opus Design): warn on refresh/close ONLY when there's a finished, UNSAVED piece on the
  // table (a resolved-but-not-saved live piece, or a recovered draft). Save promotes it; this stops
  // accidental loss WITHOUT making Save the thing that prevents loss.
  useEffect(() => {
    const hasUnsaved = (reviewing && !accepted && !!curFrame) || !!restoredDraft;
    if (!hasUnsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [reviewing, accepted, curFrame, restoredDraft]);

  function onSend() {
    const p = input.trim();
    if (!p) return;
    if (running) {
      feedback(p); // a live job is running → steer it mid-flight
    } else if (job?.status === 'done' && reviewing) {
      // Reviewing a FINISHED piece → the chat REFINES this piece (resume + fold in the note), it does
      // NOT start a new generation from scratch. (To make a brand-new piece, use Redo, or Cancel first.)
      reject(p);
    } else {
      setLastPrompt(p); start(startArgs(p)); // idle → a brand-new piece
    }
    setInput('');
  }
  function onRefineCanvas() {
    const g = usePXSStore.getState().grid;
    if (!g.cells.size) return;
    const frame: PXSFrame = { cols: g.cols, rows: g.rows, cells: Array.from(g.cells.values()) };
    const note = refineNote.trim();
    setRefineNote('');
    refineFrame(frame, note, model, lastPrompt || undefined); // seed a refine job from the canvas piece + feedback
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
    onGridUpdate(applyGalleryFrame(curFrame, `AI: ${job?.title ?? 'piece'}`), `✦ ${job?.title ?? 'AI piece'}`);
    toastManager.success('Loaded on canvas');
  }
  function onCancel() {
    const save = window.confirm('Cancel the artist? OK = save the current artwork to your gallery first; Cancel = discard. Either way the agent stops.');
    if (save) saveCurrent();
    control('cancel');
    toastManager.success('Stopping the artist…');
  }
  function onRedo() {
    const p = (lastPrompt || job?.title || '').trim();
    if (!p) return;
    // Fresh re-roll: discard THIS result and generate a NEW attempt from the same prompt + settings.
    // (Variance → a brand-new design, NOT a refine of this one — that's Iterate.) start() replaces the
    // current job, so the abandoned result is simply not saved.
    setLastPrompt(p);
    start(startArgs(p));
    toastManager.success('Redo — fresh attempt…');
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
        {restoredDraft && !jobId && (
          <div className="rounded-lg border border-accent-yellow/40 bg-accent-yellow/10 p-2.5 space-y-1.5">
            <div className="text-[11px] text-text-primary font-semibold">↩ Restored an unsaved piece</div>
            <div className="text-[10px] text-text-muted leading-snug">It&apos;s loaded on the canvas. <b className="text-accent-green">Save</b> to keep it in your Art gallery, or discard it. <span className="text-text-muted/70">(Auto-kept from your last session — nothing was lost.)</span></div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <button onClick={() => keepDraft()} className="px-2 py-0.5 rounded bg-accent-green text-background-primary text-[9px] font-semibold hover:opacity-90">✓ Save to gallery</button>
              <button onClick={() => discardDraft()} className="px-2 py-0.5 rounded border border-border bg-background-overlay text-[9px] text-text-muted hover:text-text-primary">Discard</button>
            </div>
          </div>
        )}
        {!jobId && (
          <div className="text-[11px] text-text-muted leading-relaxed space-y-3">
            {canvasCells > 0 && (
              <div className="rounded-lg border border-accent-purple/30 bg-accent-purple/5 p-2.5 space-y-1.5">
                <div className="text-[11px] text-text-primary font-semibold flex items-center gap-1"><span className="text-accent-purple">✦</span> Refine</div>
                <div className="text-[10px] text-text-muted leading-snug">Refine the piece in the canvas (e.g. &ldquo;sharpen the eye&rdquo;, &ldquo;add feather detail&rdquo;) — or leave blank to just refine + elevate it.</div>
                <div className="flex items-end gap-1.5">
                  <textarea
                    value={refineNote}
                    onChange={(e) => setRefineNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onRefineCanvas(); } }}
                    rows={2}
                    placeholder="What should the artist change? (optional)"
                    className="flex-1 resize-none rounded-md border border-border bg-background-tertiary px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
                  />
                  <button onClick={onRefineCanvas} title="Refine the canvas piece with this feedback" className="rounded-md bg-accent-purple hover:opacity-90 text-white px-2.5 h-8 flex items-center justify-center shrink-0 text-[10px] font-semibold">↻ Refine</button>
                </div>
              </div>
            )}
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
                    <button onClick={onRedo} title="Redo — discard this and generate a FRESH attempt from the same prompt (a new roll, not a refine of this design)." className="px-2 py-0.5 rounded border border-accent-purple/40 bg-accent-purple/10 text-[9px] text-accent-purple hover:bg-accent-purple/20">⟳ Redo</button>
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
                <div className="text-[9px] text-text-muted leading-snug"><b className="text-accent-green">Save</b> → into your art assets. <b className="text-accent-yellow">Iterate</b> → refine THIS one further. <b className="text-accent-purple">Redo</b> → a fresh re-roll of the same prompt (new design). <b>Cancel</b> → discard. Nothing is saved until you say so.</div>
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
        {/* Resolution (pixel count — longest edge) + model */}
        <div className="flex items-center gap-2 text-[9px]">
          <span className="uppercase tracking-wider text-text-muted" title="The artwork's PIXEL RESOLUTION — how many pixels across (the longest edge), i.e. how chunky vs fine. The Aspect Ratio control below sets the canvas proportions.">Resolution</span>
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-background-tertiary p-0.5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                title={s >= 48 ? `${s}px grid — finer, slower & pricier` : `${s}px grid — quick & cheap`}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  size === s
                    ? s >= 48
                      ? 'bg-accent-yellow/80 text-background-primary'
                      : 'bg-primary text-white'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
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

        {/* Aspect ratio — a dropdown defaulting to "Auto" (the artist picks the shape); Custom shows W×H */}
        <div className="flex flex-wrap items-center gap-2 text-[9px]">
          <span className="uppercase tracking-wider text-text-muted" title="The canvas ASPECT RATIO / proportions (separate from Resolution). Auto (the default) lets the artist choose the best for your subject — a car is WIDE, a tower is TALL. Pick one to force it; Custom = your exact W×H.">Aspect Ratio</span>
          <select
            value={aspect}
            onChange={(e) => setAspect(e.target.value as typeof aspect)}
            title="Auto = the artist picks the best shape for your subject. Pick one to force it; Custom = your exact W×H."
            className="rounded-md border border-border bg-background-tertiary px-1.5 py-1 text-[9px] text-text-secondary focus:outline-none focus:border-border-hover"
          >
            <option value="auto">Auto</option>
            {ASPECTS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
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

        {/* Max rounds — the hidden pass budget (cost seatbelt). Complexity is auto (Detail control removed). */}
        <div className="flex items-center gap-2 text-[9px] text-text-muted">
          <label className="flex items-center gap-1" title="The MAX number of refine rounds before it must ship — your cost seatbelt, HIDDEN from the AI (it approves on quality, never to fill a budget). Blank = the cap the AI estimated for this piece (shown in the box); type a number to override, up to 90.">
            <span className="uppercase tracking-wider">Max revisions</span>
            <input
              type="number" min={1} max={90} value={passes}
              placeholder={String(passCap)}
              onChange={(e) => setPasses(e.target.value === '' ? '' : Math.min(90, Math.max(1, Math.round(+e.target.value || 1))))}
              title={`auto-estimated cap = ${passCap} (blank uses it; type to override)`}
              className="w-12 rounded-md border border-border bg-background-tertiary px-1 py-0.5 text-center text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
            />
          </label>
          {passes !== '' && passes >= 24 && (
            <span className="ml-auto text-accent-yellow/80" title="More revisions = more spend (each revision is one model call).">~{passes} revisions · higher cost</span>
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
            placeholder={
              running ? 'Send live feedback to the artist…  (e.g. "make two tentacles into arms")'
              : (job?.status === 'done' && reviewing) ? 'Tell the artist a change to make to THIS piece…  (or Save / Redo above)'
              : 'Describe a piece to sculpt live…'
            }
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
