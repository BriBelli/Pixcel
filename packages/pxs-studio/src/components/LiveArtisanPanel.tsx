'use client';

import { useEffect, useRef, useState } from 'react';
import type { GridData } from '../workers/grid.worker';
import { applyGalleryFrame } from '../lib/apply-gallery-frame';
import { useGalleryStore } from '../store/gallery-store';
import { useLiveArtStore } from '../store/live-art-store';
import { toastManager } from './Toast';

interface Props {
  onGridUpdate: (gridData: GridData) => void;
}

type ModelId = 'claude-opus-4-8' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';
const MODELS: { id: ModelId; label: string }[] = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
];
const SIZES = [16, 24, 32, 48, 64];
const PHASES = ['shape', 'elements', 'refine', 'detail', 'polish', 'qa'];
const SUGGESTIONS = ['a red apple', 'a snail', 'a teapot', 'a ladybug'];

export default function LiveArtisanPanel({ onGridUpdate }: Props) {
  const [input, setInput] = useState('');
  const [size, setSize] = useState(24);
  const [model, setModel] = useState<ModelId>('claude-opus-4-8');
  const { jobId, job, startedAt, start, resume, control, feedback } = useLiveArtStore();
  const addPiece = useGalleryStore((s) => s.addPiece);
  const [elapsed, setElapsed] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const thinkRef = useRef<HTMLDivElement>(null);

  const running = job?.status === 'running';
  const curFrame = job?.frame || job?.latestFrame;
  const phaseIdx = PHASES.indexOf(job?.phase ?? '');
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
    else start({ prompt: p, size, model });
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!jobId && (
          <div className="text-[11px] text-text-muted leading-relaxed space-y-3">
            <p>
              <span className="text-accent-purple">Sculpt</span> — the full studio. It carves like a
              human: block-in → refine → detail → polish, eyes open, an art director gating each
              phase. It draws on the <span className="text-text-secondary">main canvas</span>; this
              panel is the studio conversation and controls. Finer & more original — slower, pricier.
            </p>
            <p className="text-[10px]">Great pieces take several minutes; it runs in the background. You can send live feedback while it works.</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => start({ prompt: s, size, model })}
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
                <span className="text-accent-purple">✦</span> Sculpting on the canvas →
              </div>
              {/* phase progress */}
              <div className="flex items-center gap-1">
                {PHASES.map((p, i) => {
                  const done = i < phaseIdx || job?.status === 'done';
                  const cur = i === phaseIdx && running;
                  return (
                    <div key={p} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className={`h-1 w-full rounded-full ${done ? 'bg-accent-green' : cur ? 'bg-primary animate-pulse' : 'bg-border'}`} />
                      <span className={`text-[7px] uppercase tracking-wide ${cur ? 'text-primary' : 'text-text-muted'}`}>{p}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[9px] text-text-muted font-mono">
                <span>
                  {running ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> g{job?.gestures ?? 0} · {mmss}
                    </span>
                  ) : job?.status === 'done' ? (
                    <span className="text-accent-green">✓ done · {job?.cells} cells · {job?.durationMs ? `${(job.durationMs / 1000).toFixed(0)}s` : ''}</span>
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
                {(job?.status === 'paused' || job?.status === 'cancelled' || job?.status === 'error') && curFrame && (
                  <>
                    <button onClick={() => resume()} className="px-2 py-0.5 rounded bg-accent-purple text-white text-[9px] hover:opacity-90">▶ Resume</button>
                    <button onClick={saveCurrent} className="px-2 py-0.5 rounded border border-border bg-background-overlay text-[9px] text-text-secondary hover:text-text-primary">Save</button>
                  </>
                )}
              </div>
              {job?.status === 'paused' && <div className="text-[9px] text-accent-yellow">⏸ Paused — checkpointed and resumable.</div>}
              {job?.error && <div className="text-[9px] text-accent-red">{job.error}</div>}
            </div>

            {/* live thinking */}
            {running && job?.liveThinking && (
              <div className="rounded-md border border-accent-purple/30 bg-accent-purple/5">
                <div className="px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-accent-purple flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-accent-purple animate-pulse" /> thinking
                </div>
                <div ref={thinkRef} className="px-2 pb-2 max-h-24 overflow-y-auto text-[9px] leading-snug text-text-secondary italic">
                  {job.liveThinking}
                </div>
              </div>
            )}

            {/* studio feed */}
            {job?.feed && job.feed.length > 0 && (
              <div className="rounded-md border border-border bg-background-tertiary">
                <div className="px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-text-muted">studio feed</div>
                <div ref={feedRef} className="px-2 pb-2 max-h-64 overflow-y-auto space-y-1">
                  {job.feed.map((f, i) => (
                    <div key={i} className="text-[9px] leading-snug flex gap-1.5">
                      {f.kind === 'user' ? (
                        <span className="text-text-primary"><span className="text-primary font-semibold">you →</span> {f.text}</span>
                      ) : f.kind === 'phase' ? (
                        <span className="text-primary font-semibold">◆ {f.text}</span>
                      ) : f.kind === 'gesture' ? (
                        <span className="text-text-secondary"><span className="text-text-muted">✎ g{f.gesture}</span> {f.text}</span>
                      ) : f.kind === 'recall' ? (
                        <span className="text-accent-yellow">↩ {f.text}</span>
                      ) : f.kind === 'done' ? (
                        <span className="text-accent-green font-semibold">✓ {f.text}</span>
                      ) : (
                        <span className={f.approved ? 'text-accent-green' : 'text-accent-yellow'}>👁 {f.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2.5 space-y-2 shrink-0">
        <div className="flex items-center gap-2 text-[9px]">
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-background-tertiary p-0.5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-1.5 py-0.5 rounded transition-colors ${size === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                {s}²
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
