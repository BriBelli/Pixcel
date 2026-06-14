'use client';

import { useEffect, useRef } from 'react';
import type { PXSFrame } from '../store/pxs-store';

interface FramePreviewProps {
  frame: PXSFrame;
  /** Display size of the longest edge, in CSS pixels. */
  size?: number;
  className?: string;
}

/**
 * Lightweight crisp preview of a PXSFrame — paints 1px/cell into a cols×rows canvas,
 * then CSS-upscales with pixelated rendering. Used by chat cards and gallery thumbnails.
 */
export default function FramePreview({ frame, size = 96, className }: FramePreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    cv.width = frame.cols;
    cv.height = frame.rows;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, frame.cols, frame.rows);
    for (const c of frame.cells) {
      ctx.fillStyle = c.color;
      ctx.globalAlpha = c.opacity ?? 1;
      ctx.fillRect(c.x, c.y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }, [frame]);

  const w = frame.cols >= frame.rows ? size : Math.round(size * (frame.cols / frame.rows));
  const h = frame.rows >= frame.cols ? size : Math.round(size * (frame.rows / frame.cols));

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: w, height: h, imageRendering: 'pixelated' }}
    />
  );
}
