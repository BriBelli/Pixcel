'use client';

import { useEffect, useRef } from 'react';
import type { PXSFrame } from '../store/pxs-store';

/**
 * Renders a PXSFrame and animates it onto the canvas. On the FIRST frame it resolves the whole
 * image out of dark noise in a diagonal wave. On every SUBSEQUENT frame (a new draft from the
 * live artist) it keeps the unchanged cells solid and only reveals the cells that CHANGED — so
 * the viewer literally watches the new strokes paint in. This "watch it paint" effect is produced
 * entirely client-side from the diff between drafts: zero extra model calls.
 */
export default function MaterializeFrame({ frame, size = 360 }: { frame: PXSFrame; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const prevColors = useRef<Map<string, string>>(new Map());

  // Cheap content signature so the effect re-runs whenever any cell changes color.
  let h = (frame.cols << 16) ^ frame.rows ^ frame.cells.length;
  for (const c of frame.cells) h = (h * 31 + c.x * 7 + c.y * 13 + colorCode(c.color)) | 0;
  const sig = String(h);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const { cols, rows, cells } = frame;
    const px = Math.max(1, Math.floor(size / Math.max(cols, rows)));
    cv.width = cols * px;
    cv.height = rows * px;

    const prev = prevColors.current;
    const changed = new Map<string, boolean>();
    let anyChange = false;
    for (const c of cells) {
      const k = `${c.x},${c.y}`;
      const isNew = prev.get(k) !== c.color;
      changed.set(k, isNew);
      if (isNew) anyChange = true;
    }
    // First-ever frame (empty prev): treat everything as changed → full materialize.
    const firstPaint = prev.size === 0;

    const maxDiag = cols + rows || 1;
    const dur = firstPaint ? 650 : 420;
    let raf = 0;
    const start = performance.now();

    const noiseAt = (x: number, y: number) =>
      (x * 7 + y * 13) % 3 === 0 ? '#222c52' : (x + y) % 2 === 0 ? '#161d34' : '#0f1320';

    const draw = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      for (const c of cells) {
        const k = `${c.x},${c.y}`;
        const animate = firstPaint || changed.get(k);
        let color = c.color;
        if (animate) {
          const reveal = (c.x + c.y) / maxDiag;
          if (p < reveal - 0.04) color = noiseAt(c.x, c.y);
        }
        ctx.fillStyle = color;
        ctx.fillRect(c.x * px, c.y * px, px, px);
      }
      if (p < 1) raf = requestAnimationFrame(draw);
    };

    // If nothing changed (same frame re-rendered), just paint it solid — no animation.
    if (!firstPaint && !anyChange) {
      for (const c of cells) {
        ctx.fillStyle = c.color;
        ctx.fillRect(c.x * px, c.y * px, px, px);
      }
    } else {
      raf = requestAnimationFrame(draw);
    }

    // Remember this frame's colors for the next diff.
    const next = new Map<string, string>();
    for (const c of cells) next.set(`${c.x},${c.y}`, c.color);
    prevColors.current = next;

    return () => cancelAnimationFrame(raf);
  }, [sig, size]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} style={{ width: size, height: size, imageRendering: 'pixelated' }} className="rounded-lg block" />;
}

function colorCode(hex: string): number {
  let n = 0;
  for (let i = 0; i < hex.length; i++) n = (n * 17 + hex.charCodeAt(i)) | 0;
  return n;
}
