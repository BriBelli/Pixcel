'use client';

import { useEffect, useRef, useState } from 'react';
import type { GridData } from '../workers/grid.worker';
import type { PXSFrame } from '../store/pxs-store';
import { applyGalleryFrame } from '../lib/apply-gallery-frame';
import { usePXSStore, selectActions } from '../store/pxs-store';
import { useGenJobsStore } from '../store/gen-jobs-store';
import { toastManager } from './Toast';
import LiveArtisanPanel from './LiveArtisanPanel';

interface AiChatPanelProps {
  onGridUpdate: (gridData: GridData) => void;
}

type ModelId = 'claude-opus-4-8' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';

const MODELS: { id: ModelId; label: string }[] = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
];
const SIZES = [16, 24, 32, 48, 64];
const SUGGESTIONS = ['a red mushroom', 'a smiling cat', 'a green cactus', 'a pixel rocket'];

export default function AiChatPanel({ onGridUpdate }: AiChatPanelProps) {
  const [mode, setMode] = useState<'quick' | 'live'>('quick');
  const [input, setInput] = useState('');
  const [size, setSize] = useState(16);
  const [model, setModel] = useState<ModelId>('claude-opus-4-8');
  const jobs = useGenJobsStore((s) => s.jobs);
  const startJob = useGenJobsStore((s) => s.start);
  const dismiss = useGenJobsStore((s) => s.dismiss);
  const actions = usePXSStore(selectActions);
  const scrollRef = useRef<HTMLDivElement>(null);
  const running = jobs.filter((j) => j.state === 'running').length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [jobs.length]);

  function loadFrameOntoCanvas(frame: PXSFrame, title: string) {
    const gridData = applyGalleryFrame(frame, `AI: ${title}`);
    onGridUpdate(gridData);
    toastManager.success(`Loaded "${title}" on canvas`);
  }

  function submit(promptText: string) {
    const prompt = promptText.trim();
    if (!prompt) return;
    startJob({ prompt, size, model });
    setInput('');
  }

  return (
    <div className="flex flex-col h-full">
      {/* One artist, two depths: Sketch (fast) vs Sculpt (the full studio) */}
      <div className="px-2.5 pt-2.5">
        <div className="flex gap-1 p-1 rounded-xl bg-background-tertiary border border-border">
          <button
            onClick={() => setMode('quick')}
            aria-pressed={mode === 'quick'}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all duration-150 ${
              mode === 'quick'
                ? 'bg-primary/15 text-primary ring-1 ring-primary/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-background-overlay/40'
            }`}
          >
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <span className="text-accent-yellow">⚡</span> Optimized
            </span>
            <span className="text-[8px] opacity-70 tracking-wide">quicker · lower cost</span>
          </button>
          <button
            onClick={() => setMode('live')}
            aria-pressed={mode === 'live'}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all duration-150 ${
              mode === 'live'
                ? 'bg-accent-purple/15 text-accent-purple ring-1 ring-accent-purple/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-background-overlay/40'
            }`}
          >
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <span className="text-accent-purple">✦</span> Comprehensive
            </span>
            <span className="text-[8px] opacity-70 tracking-wide">detailed · higher cost</span>
          </button>
        </div>
      </div>

      {mode === 'live' ? (
        <div className="flex-1 min-h-0">
          <LiveArtisanPanel onGridUpdate={onGridUpdate} />
        </div>
      ) : (
        <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {jobs.length === 0 && (
          <div className="text-[11px] text-text-muted leading-relaxed space-y-3">
            <p>
              <span className="text-primary">Optimized</span> — the fast artist. Describe a piece;
              it reasons, draws, and self-corrects to a clean result, then saves it to{' '}
              <span className="text-text-secondary">Art</span>. Quicker, lower cost.
            </p>
            <p className="text-[10px]">
              Want it carved with more care — phase-by-phase, an art director gating each step?
              Switch to <span className="text-accent-purple">✦ Comprehensive</span>.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="px-2 py-1 rounded-md border border-border bg-background-tertiary text-[10px] text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {jobs.map((m) => (
          <div key={m.id}>
            {/* User prompt bubble */}
            <div className="flex justify-end mb-2">
              <div className="max-w-[85%] rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1.5 text-[11px] text-text-primary">
                {m.prompt}
                <span className="ml-1.5 text-[9px] text-text-muted">{m.size}²</span>
              </div>
            </div>

            {/* Assistant card */}
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-accent-purple">AI</span>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {m.state === 'running' && m.status && (
                  <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {m.status}
                  </div>
                )}

                {/* High-level only — the design, drafts, and the artwork itself live on the canvas. */}
                {m.frame && (
                  <div className="text-[10px] text-accent-green leading-snug">
                    ✓ Created “{m.title ?? 'piece'}” — on the canvas &amp; saved to{' '}
                    <span className="text-text-secondary">Art</span>.{' '}
                    <button
                      onClick={() => m.frame && loadFrameOntoCanvas(m.frame, m.title ?? 'piece')}
                      className="underline text-text-muted hover:text-text-primary"
                    >
                      load to edit
                    </button>
                  </div>
                )}

                {m.error && (
                  <div className="rounded-md border border-accent-red/30 bg-accent-red/10 px-2.5 py-1.5 text-[10px] text-accent-red">
                    {m.error}
                  </div>
                )}

                {m.state !== 'running' && (
                  <button
                    onClick={() => dismiss(m.id)}
                    className="text-[9px] text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2.5 space-y-2 shrink-0">
        {running > 0 && (
          <div className="flex items-center gap-1.5 text-[9px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {running} generating in the background — you can keep working
          </div>
        )}
        <div className="flex items-center gap-2 text-[9px]">
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-background-tertiary p-0.5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  size === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
                }`}
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
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
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
                submit(input);
              }
            }}
            rows={2}
            placeholder="Describe a piece…  (Enter to send)"
            className="flex-1 resize-none rounded-md border border-border bg-background-tertiary px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
          />
          <button
            onClick={() => submit(input)}
            disabled={!input.trim()}
            className="rounded-md bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white w-8 h-8 flex items-center justify-center shrink-0 transition-colors"
            title="Generate"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
