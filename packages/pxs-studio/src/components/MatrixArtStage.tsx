'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useLiveArtStore } from '../store/live-art-store';

/**
 * THE MATRIX LIVE SHOW (docs/MATRIX-LIVE-SHOW.md) — the epic "watch the AI paint" reveal.
 *
 * The art IS a color-key grid, so the Matrix conceit is literal: the canvas starts as raining
 * palette glyphs over #0d1117, and as the model emits each cell (the REAL `pass.delta` stream —
 * never synthetic tweening) that cell LOCKS from a flickering glyph into its solid color with a
 * flash. Phase beats (VISION typing → masses lock → the art director's verdict drama → a QA
 * scan-line sweep → a final bloom) give the fast stream meaning. Pure client-side rendering off the
 * stream — zero extra API cost.
 *
 * Driven by the live-art store: `dims` + `paletteHexes` (vision.committed), `pendingReveal`/
 * `revealSeq` (pass.delta), `lastVerdict` (audit.verdict), reconciled to the final frame on done.
 */

const RAIN_GLYPHS = '01<>[]{}/\\|=+*#%&xXoØ▚▜▘APSアイウエカキ'.split('');
const FLASH_MS = 320;
const SWEEP_MS = 900;

const BG = '#0d1117';

export default function MatrixArtStage({ maxEdge = 480 }: { maxEdge?: number }) {
  const job = useLiveArtStore((s) => s.job);
  const reviewing = useLiveArtStore((s) => s.reviewing);

  const dims = job?.dims || (job?.latestFrame ? { cols: job.latestFrame.cols, rows: job.latestFrame.rows } : null) || (job?.frame ? { cols: job.frame.cols, rows: job.frame.rows } : null) || { cols: job?.size || 32, rows: job?.size || 32 };
  const cols = dims.cols;
  const rows = dims.rows;
  const status = job?.status || 'running';
  const phase = job?.stage || 'vision';
  const done = status === 'done';

  const palette = useMemo(() => {
    const fromVision = job?.paletteHexes && job.paletteHexes.length ? job.paletteHexes : null;
    const fromFrame = job?.latestFrame ? Array.from(new Set(job.latestFrame.cells.map((c) => c.color).filter((c) => c !== BG))).slice(0, 12) : [];
    return (fromVision || fromFrame || []) as string[];
  }, [job?.paletteHexes, job?.latestFrame]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Per-cell render state, kept in refs so the rAF loop never triggers React re-renders.
  const stateRef = useRef({
    sig: '',
    colors: new Array<string | null>(0), // locked color per cell index (null = still raining)
    flash: new Float64Array(0), // lock timestamp per cell (for the flash)
    queue: [] as { idx: number; color: string }[],
    consumedSeq: -1,
    lastIdx: -1, // the cursor (most recently locked cell)
    rainTick: 0,
    sweepStart: 0,
    sweptForDone: false,
  });

  // Enqueue each new pass.delta batch exactly once (drives the lock animation in writing order).
  useEffect(() => {
    const st = stateRef.current;
    const sig = `${cols}x${rows}`;
    if (st.sig !== sig) {
      st.sig = sig;
      st.colors = new Array(cols * rows).fill(null);
      st.flash = new Float64Array(cols * rows);
      st.queue = [];
      st.consumedSeq = -1;
      st.lastIdx = -1;
      st.sweptForDone = false;
      st.sweepStart = 0;
    }
    const seq = job?.revealSeq ?? -1;
    if (seq > st.consumedSeq && job?.pendingReveal) {
      st.consumedSeq = seq;
      for (const c of job.pendingReveal) {
        if (c.x < 0 || c.x >= cols || c.y < 0 || c.y >= rows) continue;
        st.queue.push({ idx: c.y * cols + c.x, color: c.color });
      }
    }
  }, [job?.revealSeq, job?.pendingReveal, cols, rows]);

  // On the final frame, reconcile: enqueue any painted cell not yet locked (covers dropped deltas).
  useEffect(() => {
    const st = stateRef.current;
    const frame = job?.frame || (done ? job?.latestFrame : null);
    if (!frame || frame.cols !== cols || frame.rows !== rows) return;
    for (const c of frame.cells) {
      if (c.color === BG) continue;
      const idx = c.y * cols + c.x;
      if (st.colors[idx] == null && !st.queue.some((q) => q.idx === idx)) st.queue.push({ idx, color: c.color });
    }
  }, [job?.frame, done, cols, rows]);

  // The render loop — drain the reveal queue, paint rain + locks + flash + the QA sweep.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const px = Math.max(6, Math.min(24, Math.floor(maxEdge / Math.max(cols, rows))));
    cv.width = cols * px;
    cv.height = rows * px;
    const font = `${Math.max(7, Math.floor(px * 0.82))}px ui-monospace, monospace`;
    const pal = palette.length ? palette : ['#7dffb0'];
    let raf = 0;
    let lastRain = 0;

    const draw = (now: number) => {
      const st = stateRef.current;
      // Drain: reveal a batch each frame so a pass locks over ~0.6–1s (deliberate, not instant).
      const perFrame = Math.max(2, Math.ceil(st.queue.length / 40));
      for (let i = 0; i < perFrame && st.queue.length; i++) {
        const { idx, color } = st.queue.shift()!;
        st.colors[idx] = color;
        st.flash[idx] = now;
        st.lastIdx = idx;
      }
      const refreshRain = now - lastRain > 70;
      if (refreshRain) { lastRain = now; st.rainTick++; }

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font;

      const settling = done || reviewing;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          const cx = x * px, cy = y * px;
          const color = st.colors[idx];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(cx, cy, px, px);
            const age = now - st.flash[idx];
            if (age < FLASH_MS && !settling) {
              const a = 1 - age / FLASH_MS;
              ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
              ctx.fillRect(cx, cy, px, px);
            }
          } else if (!settling) {
            // Raining glyph (not-yet-emitted cell): green-tinted code awaiting its color.
            const seed = (x * 73856093) ^ (y * 19349663) ^ (st.rainTick * 83492791);
            const g = RAIN_GLYPHS[Math.abs(seed) % RAIN_GLYPHS.length];
            const bright = Math.abs(seed >> 5) % 17 === 0;
            // Bright glyphs flash in the piece's OWN palette (the code hinting at the art to come);
            // the rest are dim Matrix-green code awaiting their color.
            ctx.fillStyle = bright ? pal[Math.abs(seed >> 11) % pal.length] : `rgba(40,150,90,${0.18 + (Math.abs(seed >> 9) % 30) / 120})`;
            ctx.fillText(g, cx + px / 2, cy + px / 2 + 0.5);
          }
        }
      }

      // The cursor — a bright marker on the most-recently locked cell (the "typing" head).
      if (!settling && st.lastIdx >= 0 && st.queue.length) {
        const x = st.lastIdx % cols, y = Math.floor(st.lastIdx / cols);
        ctx.strokeStyle = 'rgba(140,255,180,0.9)';
        ctx.lineWidth = Math.max(1, px / 8);
        ctx.strokeRect(x * px + 0.5, y * px + 0.5, px - 1, px - 1);
      }

      // QA scan-line sweep on done — a single bright line confirms the piece, then it settles.
      if (settling) {
        if (!st.sweptForDone) { st.sweepStart = st.sweepStart || now; }
        const p = st.sweepStart ? Math.min(1, (now - st.sweepStart) / SWEEP_MS) : 0;
        if (p < 1) {
          const ly = p * cv.height;
          const grad = ctx.createLinearGradient(0, ly - px * 1.5, 0, ly + px * 1.5);
          grad.addColorStop(0, 'rgba(120,255,170,0)');
          grad.addColorStop(0.5, 'rgba(160,255,200,0.55)');
          grad.addColorStop(1, 'rgba(120,255,170,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, ly - px * 1.5, cv.width, px * 3);
        } else {
          st.sweptForDone = true;
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cols, rows, maxEdge, done, reviewing, palette]);

  const verdict = job?.lastVerdict;
  const costUsd = job?.costUsd ?? 0;
  const phaseLabel = done ? 'COMPLETE' : phase === 'vision' ? 'VISION' : phase === 'refine' ? 'PAINTING' : String(phase).toUpperCase();

  return (
    <div className="relative inline-block rounded-lg overflow-hidden" style={{ background: BG, boxShadow: '0 0 0 1px rgba(120,255,170,0.18), 0 0 40px rgba(20,120,70,0.25)' }}>
      <canvas ref={canvasRef} className="block" style={{ width: Math.min(maxEdge, cols * 24), imageRendering: 'pixelated' }} />

      {/* CRT skin — scanlines + vignette + a faint green glow sell the "generating live" vibe. */}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)', mixBlendMode: 'multiply' }} />
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.55)' }} />

      {/* Top HUD — phase / pass / live cost. */}
      <div className="pointer-events-none absolute top-0 inset-x-0 flex items-center justify-between px-2 py-1 text-[10px] font-mono">
        <span className="px-1.5 py-0.5 rounded bg-black/55 text-[#7dffb0] tracking-widest">{phaseLabel}{!done && <span className="ml-0.5 animate-pulse">▮</span>}</span>
        <span className="px-1.5 py-0.5 rounded bg-black/55 text-[#7dffb0]/80">{job?.gestures ? `pass ${job.gestures}` : '—'} · ${costUsd.toFixed(2)}</span>
      </div>

      {/* The art director's drama — green ✓ on approve, red flaw on a reject. */}
      {verdict && !done && (
        <div className={`pointer-events-none absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] font-mono backdrop-blur-sm ${verdict.approved ? 'bg-[#0a2a18]/80 text-[#7dffb0]' : 'bg-[#2a0f0f]/80 text-[#ff9a9a]'}`}>
          {verdict.approved ? '✓ approved' : `✦ ${verdict.flaw}`}
        </div>
      )}
      {done && (
        <div className="pointer-events-none absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] font-mono bg-[#0a2a18]/85 text-[#7dffb0] text-center tracking-wider">
          ✓ the artist signs off — keep it or push back →
        </div>
      )}
    </div>
  );
}
