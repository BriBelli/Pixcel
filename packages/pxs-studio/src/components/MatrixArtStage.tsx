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
 *
 * PRESENTATION: full-bleed immersive blue canvas. The canvas FILLS its container; the real colored
 * cells (the art) sit in a CENTERED sub-rect; a very faint blue char-sea extends across the WHOLE
 * canvas as ambient. Ink is the locked brand blue (rgb 88,166,255). BG is the theme bg token.
 * The WRITE→CASCADE→DATA mechanics (queue / revealAt / cascadeStart / diagonal front / reconciler)
 * are UNCHANGED — this is a re-skin, not a rewire.
 */

const INK = '88,166,255'; // locked --pxl-brand-blue (rgb)
const BG_FALLBACK = '#161618'; // --a2ui-bg-app dark; real value read from the theme token at runtime
const CASCADE_MS = 1100;
const REVEAL_FLASH = 480;

export default function MatrixArtStage() {
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

  // Wrapper fills its container; the canvas matches the wrapper's measured pixel size (full-bleed).
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });
  // theme bg token, resolved at runtime so the canvas BG follows the theme (not a hard #0d1117).
  const bgRef = useRef(BG_FALLBACK);
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

  // Resolve the theme bg token + measure the container (full-bleed). Re-measure on resize.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      const v = getComputedStyle(el).getPropertyValue('--a2ui-bg-app').trim();
      if (v) bgRef.current = v;
    } catch {
      /* ignore — keep fallback */
    }
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBoxSize({ w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
        const isBg = c.color.toLowerCase() === bgRef.current.toLowerCase();
        s.queue.push({ idx, char: isBg ? '' : charFor(c.color), color: isBg ? null : c.color });
      }
    }
  }, [job?.revealSeq, job?.pendingReveal, cols, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // reconcile to the final/last frame — re-enqueue any cell that is MISSING, whose color CHANGED (e.g.
  // an Iterate adds a pupil to an already-drawn eye), or was ERASED. Without this the live stage goes
  // stale vs the real data after an iterate (the "canvas never updated" bug) — it only filled blanks.
  useEffect(() => {
    const s = st.current;
    const frame = job?.frame || (done ? job?.latestFrame : null);
    if (!frame || frame.cols !== cols || frame.rows !== rows) return;
    const bg = bgRef.current.toLowerCase();
    const filled = new Set<number>();
    for (const c of frame.cells) {
      if (c.color.toLowerCase() === bg) continue;
      const idx = c.y * cols + c.x;
      filled.add(idx);
      const want = charFor(c.color); // color→char is deterministic, so a changed color ⇒ a changed char
      if (s.char[idx] !== want && !s.queue.some((q) => q.idx === idx)) s.queue.push({ idx, char: want, color: c.color });
    }
    // cells we're still showing that the final frame no longer fills → erase them
    for (let idx = 0; idx < s.char.length; idx++) {
      if (s.char[idx] != null && !filled.has(idx) && !s.queue.some((q) => q.idx === idx)) s.queue.push({ idx, char: '', color: null });
    }
  }, [job?.frame, done, cols, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // arm the cascade once the run resolves (it fires after the write queue drains)
  useEffect(() => {
    if ((done || reviewing) && st.current.cascadeStart === 0) st.current.cascadeStart = -1;
  }, [done, reviewing]);

  // the render loop — full-bleed: canvas == container, the art grid is centered, the char-sea is ambient.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = boxSize.w;
    const H = boxSize.h;
    if (W < 2 || H < 2) return;

    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Cell size: as large as fits the container at 1:1 integer px (crisp blocks), capped so big grids
    // still leave a faint char-sea margin around the centered art region.
    const px = Math.max(6, Math.floor(Math.min((W * 0.92) / cols, (H * 0.92) / rows)));
    const artW = cols * px;
    const artH = rows * px;
    const ox = Math.round((W - artW) / 2); // art region origin (centered)
    const oy = Math.round((H - artH) / 2);

    // the ambient char-sea spans the WHOLE canvas in the same px grid (only the centered sub-rect
    // holds real cells); we draw the sea cell-by-cell across the full extent.
    const seaCols = Math.ceil(W / px) + 2;
    const seaRows = Math.ceil(H / px) + 2;

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

      // BG fills the whole canvas (theme token) — full-bleed, no box.
      ctx.fillStyle = bgRef.current;
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font;

      // 1) ambient char-sea across the ENTIRE canvas (faint), skipping the centered art sub-rect cells
      //    that hold real chars/colors (those are drawn in pass 2). Only while live (not on resolve).
      if (!done && !cascading) {
        // origin offset so the sea grid lines up with the art grid
        const sx0 = ox - Math.ceil(ox / px) * px;
        const sy0 = oy - Math.ceil(oy / px) * px;
        ctx.fillStyle = `rgba(${INK},0.06)`;
        for (let gy = 0; gy < seaRows; gy++) {
          for (let gx = 0; gx < seaCols; gx++) {
            const cx = sx0 + gx * px;
            const cy = sy0 + gy * px;
            if (cx < -px || cy < -px || cx > W || cy > H) continue;
            // inside the art region AND a real cell? skip — pass 2 owns it.
            if (cx >= ox && cx < ox + artW && cy >= oy && cy < oy + artH) {
              const ax = Math.round((cx - ox) / px);
              const ay = Math.round((cy - oy) / px);
              const aidx = ay * cols + ax;
              if (ax >= 0 && ax < cols && ay >= 0 && ay < rows && s.char[aidx]) continue;
            }
            const seed = (gx * 73856093) ^ (gy * 19349663) ^ ((tick >> 3) * 83492791);
            ctx.fillText(idleAlphabet[Math.abs(seed) % idleAlphabet.length], cx + px / 2, cy + px / 2 + 0.5);
          }
        }
      }

      // 2) the real art region (centered sub-rect): written chars → cascaded colors.
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          const cx = ox + x * px;
          const cy = oy + y * px;
          const ch = s.char[idx];
          const colr = s.color[idx];
          if (cascading && colr && x + y <= front) {
            // resolved → solid color block (the final image)
            ctx.fillStyle = colr;
            ctx.fillRect(cx, cy, px, px);
            if (x + y > front - 1.4) { ctx.fillStyle = `rgba(${INK},0.5)`; ctx.fillRect(cx, cy, px, px); } // bright front
          } else if (ch) {
            // a written char — brand blue, brighter just after it lands
            const fresh = Math.max(0, 1 - (now - s.revealAt[idx]) / REVEAL_FLASH);
            ctx.fillStyle = `rgba(${INK},${0.55 + 0.45 * fresh})`;
            ctx.fillText(ch, cx + px / 2, cy + px / 2 + 0.5);
          }
        }
      }

      // typing cursor on the most-recently written cell
      if (!cascading && s.lastIdx >= 0 && s.queue.length) {
        const x = s.lastIdx % cols;
        const y = Math.floor(s.lastIdx / cols);
        ctx.strokeStyle = `rgba(${INK},0.9)`;
        ctx.lineWidth = Math.max(1, px / 9);
        ctx.strokeRect(ox + x * px + 0.5, oy + y * px + 0.5, px - 1, px - 1);
      }

      // 3) four 1px accent crop-mark corners around the art region (the "bold canvas" cue).
      const m = Math.max(8, Math.round(px * 0.9)); // crop-mark arm length
      const pad = Math.max(4, Math.round(px * 0.4));
      const L = ox - pad, R = ox + artW + pad, T = oy - pad, B = oy + artH + pad;
      ctx.strokeStyle = `rgba(${INK},0.32)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      // top-left
      ctx.moveTo(L, T + m); ctx.lineTo(L, T); ctx.lineTo(L + m, T);
      // top-right
      ctx.moveTo(R - m, T); ctx.lineTo(R, T); ctx.lineTo(R, T + m);
      // bottom-left
      ctx.moveTo(L, B - m); ctx.lineTo(L, B); ctx.lineTo(L + m, B);
      // bottom-right
      ctx.moveTo(R - m, B); ctx.lineTo(R, B); ctx.lineTo(R, B - m);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cols, rows, boxSize.w, boxSize.h, done, idleAlphabet]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- HUD ----
  const verdict = job?.lastVerdict;
  const costUsd = job?.costUsd ?? 0;
  const phaseLabel = done ? 'RESOLVED' : writing ? 'WRITING' : phase === 'vision' ? 'DESIGNING' : 'THINKING';

  return (
    // full-bleed: fill the whole z-0 background area, no boxed inline-block, no shadow ring / scanlines.
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full" style={{ imageRendering: 'pixelated' }} />

      {/* minimal corner HUD — phase + pass/cost, brand blue ink, no box around it */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2 font-mono text-[10px]">
        <span className="rounded bg-black/40 px-1.5 py-0.5 tracking-widest" style={{ color: `rgb(${INK})` }}>
          {phaseLabel}
          {!done && <span className="ml-0.5 animate-pulse">▮</span>}
        </span>
        <span className="rounded bg-black/40 px-1.5 py-0.5" style={{ color: `rgba(${INK},0.8)` }}>
          {job?.gestures ? `pass ${job.gestures}` : '—'} · ${costUsd.toFixed(2)}
        </span>
      </div>

      {verdict && !done && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 px-3 py-1.5 text-center font-mono text-[10px] backdrop-blur-sm"
          style={{ color: verdict.approved ? `rgb(${INK})` : '#ff9a9a', background: 'rgba(0,0,0,0.35)' }}
        >
          {verdict.approved ? '✓ approved' : `✦ ${verdict.flaw}`}
        </div>
      )}
    </div>
  );
}
