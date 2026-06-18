'use client';

import { useEffect, useRef } from 'react';
import type { PXSFrame } from '../store/pxs-store';

/**
 * Renders a PXSFrame "resolving out of noise" — each cell reveals its real color in a diagonal
 * wave, with un-revealed cells shown as dark noise. Re-animates whenever the frame changes, so a
 * new draft visibly *materializes* (the real diffusion feel) using the actual image's pixels.
 */
export default function MaterializeFrame({ frame, size = 360 }: { frame: PXSFrame; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sig = `${frame.cols}x${frame.rows}:${frame.cells.length}:${frame.cells.slice(0, 12).map((c) => c.color).join('')}`;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const { cols, rows, cells } = frame;
    const px = Math.max(1, Math.floor(size / Math.max(cols, rows)));
    cv.width = cols * px;
    cv.height = rows * px;
    const maxDiag = cols + rows || 1;
    const dur = 650;
    let raf = 0;
    const start = performance.now();
    const draw = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      for (const c of cells) {
        const reveal = (c.x + c.y) / maxDiag;
        let color = c.color;
        if (p < reveal - 0.04) {
          color = (c.x * 7 + c.y * 13) % 3 === 0 ? '#222c52' : (c.x + c.y) % 2 === 0 ? '#161d34' : '#0f1320';
        }
        ctx.fillStyle = color;
        ctx.fillRect(c.x * px, c.y * px, px, px);
      }
      if (p < 1) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [sig, size]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} style={{ width: size, height: size, imageRendering: 'pixelated' }} className="rounded-lg block" />;
}
