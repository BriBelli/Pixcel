'use client';

import { PIXCEL_LOGO_FRAME } from '../data/pixcel-logo';

/* ─────────────────────────────────────────────────────────────────────────────
 * PixcelLogo — the Pixcel wordmark rendered from REAL PXSFrame data
 * (`data/pixcel-logo.ts`, derived exactly from the canonical wordmark). Each lit
 * cell is one crisp square; empty cells are transparent so it blends seamlessly on
 * the digital wall. Theme-aware (fills with the text-primary token, not a baked hex).
 *
 * SINGLE SWAP POINT + animation-ready: swap PIXCEL_LOGO_FRAME for a different frame,
 * or animate the <rect>s per-cell, to become a living "Doodle" later.
 * ───────────────────────────────────────────────────────────────────────────── */

interface PixcelLogoProps {
  /** Rendered height in px. Width scales to the frame's aspect ratio. */
  height?: number;
  className?: string;
  /** Override the fill (defaults to the theme's primary text color). */
  fill?: string;
}

export default function PixcelLogo({ height = 72, className, fill = 'var(--a2ui-text-primary)' }: PixcelLogoProps) {
  const { cols, rows, cells } = PIXCEL_LOGO_FRAME;
  return (
    <svg
      role="img"
      aria-label="Pixcel"
      className={className}
      width={height * (cols / rows)}
      height={height}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      style={{ display: 'block' }}
    >
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill={fill} />
      ))}
    </svg>
  );
}
