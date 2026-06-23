'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveArtStore } from '../store/live-art-store';

/**
 * THE PIXCEL LIVE SHOW — the REAL char-map, written then resolved (docs/MATRIX-LIVE-SHOW.md).
 *
 * The art IS a palette-indexed character grid, so the show is literal and DATA-true:
 *   1. WRITE  — the model's actual cells stream in (pass.delta, writing order) and fill the grid with
 *               their REAL palette characters (`r`,`w`,`c`… — NOT fake katakana rain). You watch the
 *               char-map get typed, pass by pass, as the hot-potato refines it.
 *   2. CASCADE — when the piece resolves, a diagonal wave converts each character into its solid
 *               color, materialising the final pixel image.
 *   3. DATA   — a live column streams every SSE log line as it lands (the "everything is data" feel).
 *
 * Pure client-side off the real stream — zero extra API cost, no synthetic tweening.
 */

const BG = '#0d1117';
const PHOS = '125,255,176'; // phosphor green (rgb)
const CASCADE_MS = 1100;
const REVEAL_FLASH = 480;

export default function MatrixArtStage({ maxEdge = 460 }: { maxEdge?: number }) {
  const job = useLiveArtStore((s) => s.job);
  const reviewing = useLiveArtStore((s) => s.reviewing);

  const dims =
    job?.dims ||
    (job?.latestFrame ? { cols: job.latestFrame.cols, rows: job.latestFrame.rows } : null) ||
    (job?.frame ? { cols: job.frame.cols, rows: job.frame.rows } : null) ||
    { cols: job?.size || 32, rows: job?.size || 32 };
  const cols = dims.cols;
  const rows = dims.rows;
  const status = job?.status || 'running';
  const done = status === 'done';
  const phase = job?.stage || 'vision';

  // hex → the REAL palette char (from vision.committed); unknown shades get a stable fallback char.
  const paletteMap = job?.paletteMap || null;
  const idleAlphabet = useMemo(() => {
    const fromMap = paletteMap ? Object.values(paletteMap) : [];
    return (fromMap.length ? fromMap : ['#', '*', '+', '=', 'o', 'x', '%', '&']) as string[];
  }, [paletteMap]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // "writing" = cells actively streaming in (vs the model still THINKING) — for an honest HUD label,
  // so the long pre-output thinking phase doesn't read as "WRITING" when nothing's been drawn yet.
  const [writing, setWriting] = useState(false);
  const writingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const st = useRef({
    sig: '',
    char: [] as (string | null)[], // palette char per cell (null = empty)
    color: [] as (string | null)[], // real color per cell (revealed only via cascade)
    revealAt: new Float64Array(0),
    queue: [] as { idx: number; char: string; color: string | null }[],
    consumedSeq: -1,
    lastIdx: -1,
    cascadeStart: 0, // 0 = not started, -1 = pending (queue draining), >0 = running
    fallback: new Map<string, string>(),
    poolNext: 0,
  });

  const charFor = (color: string): string => {
    const s = st.current;
    const key = color.toLowerCase();
    if (paletteMap && paletteMap[key]) return paletteMap[key];
    if (s.fallback.has(key)) return s.fallback.get(key)!;
    const pool = 'abcdefghkmnpqrstuvwxyz23456789';
    const ch = pool[s.poolNext++ % pool.length];
    s.fallback.set(key, ch);
    return ch;
  };

  // (re)initialise the grid when dimensions change
  useEffect(() => {
    const s = st.current;
    const sig = `${cols}x${rows}`;
    if (s.sig !== sig) {
      s.sig = sig;
      s.char = new Array(cols * rows).fill(null);
      s.color = new Array(cols * rows).fill(null);
      s.revealAt = new Float64Array(cols * rows);
      s.queue = [];
      s.consumedSeq = -1;
      s.lastIdx = -1;
      s.cascadeStart = 0;
    }
  }, [cols, rows]);

  // enqueue each pass.delta batch exactly once (the model's writing order drives the fill)
  useEffect(() => {
    const s = st.current;
    const seq = job?.revealSeq ?? -1;
    if (seq > s.consumedSeq && job?.pendingReveal) {
      s.consumedSeq = seq;
      setWriting(true);
      if (writingTimer.current) clearTimeout(writingTimer.current);
      writingTimer.current = setTimeout(() => setWriting(false), 1500);
      for (const c of job.pendingReveal) {
        if (c.x < 0 || c.x >= cols || c.y < 0 || c.y >= rows) continue;
        const idx = c.y * cols + c.x;
        const isBg = c.color.toLowerCase() === BG;
        s.queue.push({ idx, char: isBg ? '' : charFor(c.color), color: isBg ? null : c.color });
      }
    }
  }, [job?.revealSeq, job?.pendingReveal, cols, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // reconcile to the final/last frame (covers any dropped deltas) — enqueue anything not yet written
  useEffect(() => {
    const s = st.current;
    const frame = job?.frame || (done ? job?.latestFrame : null);
    if (!frame || frame.cols !== cols || frame.rows !== rows) return;
    for (const c of frame.cells) {
      if (c.color.toLowerCase() === BG) continue;
      const idx = c.y * cols + c.x;
      if (s.char[idx] == null && !s.queue.some((q) => q.idx === idx)) s.queue.push({ idx, char: charFor(c.color), color: c.color });
    }
  }, [job?.frame, done, cols, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // arm the cascade once the run resolves (it fires after the write queue drains)
  useEffect(() => {
    if ((done || reviewing) && st.current.cascadeStart === 0) st.current.cascadeStart = -1;
  }, [done, reviewing]);

  // the render loop
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const px = Math.max(7, Math.min(22, Math.floor(maxEdge / Math.max(cols, rows))));
    cv.width = cols * px;
    cv.height = rows * px;
    const font = `${Math.max(7, Math.floor(px * 0.8))}px ui-monospace, SFMono-Regular, monospace`;
    const maxDiag = cols + rows || 1;
    let raf = 0;
    let tick = 0;

    const draw = (now: number) => {
      const s = st.current;
      tick++;
      // drain the write queue (a few cells/frame → a pass types over ~0.5–1s, deliberate not instant)
      const perFrame = Math.max(2, Math.ceil(s.queue.length / 36));
      for (let i = 0; i < perFrame && s.queue.length; i++) {
        const { idx, char, color } = s.queue.shift()!;
        if (char === '') { s.char[idx] = null; s.color[idx] = null; }
        else { s.char[idx] = char; s.color[idx] = color; s.revealAt[idx] = now; s.lastIdx = idx; }
      }
      if (s.cascadeStart === -1 && s.queue.length === 0) s.cascadeStart = now; // queue drained → cascade
      const cascading = s.cascadeStart > 0;
      const front = cascading ? Math.min(1, (now - s.cascadeStart) / CASCADE_MS) * maxDiag : 0;

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          const cx = x * px;
          const cy = y * px;
          const ch = s.char[idx];
          const colr = s.color[idx];
          if (cascading && colr && x + y <= front) {
            // resolved → solid color block (the final image)
            ctx.fillStyle = colr;
            ctx.fillRect(cx, cy, px, px);
            if (x + y > front - 1.4) { ctx.fillStyle = `rgba(${PHOS},0.5)`; ctx.fillRect(cx, cy, px, px); } // bright front
          } else if (ch) {
            // a written char — phosphor green, brighter just after it lands
            const fresh = Math.max(0, 1 - (now - s.revealAt[idx]) / REVEAL_FLASH);
            ctx.fillStyle = `rgba(${PHOS},${0.55 + 0.45 * fresh})`;
            ctx.fillText(ch, cx + px / 2, cy + px / 2 + 0.5);
          } else if (!done && !cascading) {
            // empty cell — a very faint, slowly-shifting char from the piece's OWN alphabet (alive, not random rain)
            const seed = (x * 73856093) ^ (y * 19349663) ^ ((tick >> 3) * 83492791);
            ctx.fillStyle = `rgba(${PHOS},0.06)`;
            ctx.fillText(idleAlphabet[Math.abs(seed) % idleAlphabet.length], cx + px / 2, cy + px / 2 + 0.5);
          }
        }
      }

      // typing cursor on the most-recently written cell
      if (!cascading && s.lastIdx >= 0 && s.queue.length) {
        const x = s.lastIdx % cols;
        const y = Math.floor(s.lastIdx / cols);
        ctx.strokeStyle = `rgba(${PHOS},0.9)`;
        ctx.lineWidth = Math.max(1, px / 9);
        ctx.strokeRect(x * px + 0.5, y * px + 0.5, px - 1, px - 1);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cols, rows, maxEdge, done, idleAlphabet]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- the live data column ----
  const feed = job?.feed || [];
  const shown = feed.slice(-16);
  const verdict = job?.lastVerdict;
  const costUsd = job?.costUsd ?? 0;
  const phaseLabel = done ? 'RESOLVED' : writing ? 'WRITING' : phase === 'vision' ? 'DESIGNING' : 'THINKING';

  return (
    <div className="flex gap-3 items-stretch">
      {/* the grid — real char-map written, then cascaded to color */}
      <div
        className="relative inline-block self-start overflow-hidden rounded-lg"
        style={{ background: BG, boxShadow: '0 0 0 1px rgba(125,255,176,0.16), 0 0 36px rgba(20,120,70,0.22)' }}
      >
        <canvas ref={canvasRef} className="block" style={{ width: Math.min(maxEdge, cols * 22), imageRendering: 'pixelated' }} />
        {/* CRT scanlines — a "generating live" vibe ONLY while writing; gone on resolve so the final art reads clean. */}
        {!done && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 3px)', mixBlendMode: 'multiply' }}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-2 py-1 font-mono text-[10px]">
          <span className="rounded bg-black/55 px-1.5 py-0.5 tracking-widest text-[#7dffb0]">
            {phaseLabel}
            {!done && <span className="ml-0.5 animate-pulse">▮</span>}
          </span>
          <span className="rounded bg-black/55 px-1.5 py-0.5 text-[#7dffb0]/80">{job?.gestures ? `pass ${job.gestures}` : '—'} · ${costUsd.toFixed(2)}</span>
        </div>
        {verdict && !done && (
          <div className={`pointer-events-none absolute inset-x-0 bottom-0 px-2 py-1 font-mono text-[10px] backdrop-blur-sm ${verdict.approved ? 'bg-[#0a2a18]/80 text-[#7dffb0]' : 'bg-[#2a0f0f]/80 text-[#ff9a9a]'}`}>
            {verdict.approved ? '✓ approved' : `✦ ${verdict.flaw}`}
          </div>
        )}
        {done && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-2 py-1 text-center font-mono text-[10px] tracking-wider bg-[#0a2a18]/85 text-[#7dffb0]">✓ resolved — keep it or push back →</div>
        )}
      </div>

      {/* the live data stream — every SSE log line as it lands */}
      <div className="hidden w-44 flex-col overflow-hidden rounded-lg border border-[#7dffb0]/15 bg-black/30 p-2 font-mono text-[9px] sm:flex">
        <div className="mb-1 flex items-center gap-1 text-[8px] uppercase tracking-widest text-[#7dffb0]/70">
          <span className="h-1 w-1 animate-pulse rounded-full bg-[#7dffb0]" /> live · data
        </div>
        <div className="flex flex-1 flex-col justify-end gap-0.5 overflow-hidden">
          {shown.map((f, i) => (
            <div
              key={feed.length - shown.length + i}
              className="leading-tight"
              style={{
                animation: 'pxsFadeUp 0.3s ease-out',
                color: f.kind === 'review' ? (f.approved ? '#7dffb0' : '#ff9a9a') : f.kind === 'phase' ? '#9ad0ff' : 'rgba(125,255,176,0.6)',
              }}
            >
              <span className="opacity-40">{f.kind === 'review' ? (f.approved ? '✓' : '✦') : f.kind === 'phase' ? '◆' : '·'}</span> {f.text}
            </div>
          ))}
        </div>
        <style>{`@keyframes pxsFadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
      </div>
    </div>
  );
}
