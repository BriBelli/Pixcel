'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * DigitalWall — the persistent z-0 "Pixcel digital wall" (charter §1/§3, build-order step 1).
 *
 * A full-bleed, DPR-aware canvas painting a faint blue char-sea over the theme bg — the SAME
 * ambient "digital LED screen / blue char-grid" feel as the studio's IDLE MatrixArtStage, factored
 * into a reusable backdrop. This is the wall the whole app shares: it sits at z-0, never broken,
 * "feel-not-there" until art lands on it.
 *
 * IDLE ONLY. This component is deliberately NOT coupled to the live-art store/job — it only renders
 * the ambient sea (no WRITE / CASCADE / DATA mechanics, no HUD). When the studio later adopts this as
 * its z-0 base, the live MatrixArtStage layers ON TOP (or this component's sea fades under the art);
 * keeping it idle-only means the splash never imports the live engine.
 *
 * Ink is the locked brand blue (rgb 88,166,255). BG follows the theme bg token, read at runtime.
 */

const INK = '88,166,255'; // locked --pxl-brand-blue (rgb)
const BG_FALLBACK = '#161618'; // --a2ui-bg-app dark; real value read from the theme token at runtime
const SEA_ALPHABET = ['#', '*', '+', '=', 'o', 'x', '%', '&', 'a', 'b', 'c', '2', '3', '7'];

interface DigitalWallProps {
  /** Edge length (px) of each grid cell. Larger = chunkier LED look. */
  cell?: number;
  /** Base opacity of the ambient char-sea ink (0..1). Subtle by design — it's a backdrop. */
  intensity?: number;
  /** Optional radial mask focal point (CSS), e.g. '50% 34%' to bloom toward the logo. null = no mask. */
  focal?: string | null;
  className?: string;
}

export default function DigitalWall({
  cell = 26,
  intensity = 0.06,
  focal = '50% 34%',
  className,
}: DigitalWallProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const bgRef = useRef(BG_FALLBACK);

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
      setBox({ w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The render loop — a faint, slowly-shimmering blue char-sea across the whole canvas.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = box.w;
    const H = box.h;
    if (W < 2 || H < 2) return;

    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const px = Math.max(8, cell);
    const cols = Math.ceil(W / px) + 2;
    const rows = Math.ceil(H / px) + 2;
    const font = `${Math.max(7, Math.floor(px * 0.8))}px ui-monospace, SFMono-Regular, monospace`;

    let raf = 0;
    let tick = 0;

    const draw = () => {
      tick++;
      // BG fills the whole canvas (theme token) — full-bleed, no box.
      ctx.fillStyle = bgRef.current;
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font;
      ctx.fillStyle = `rgba(${INK},${intensity})`;

      // ambient char-sea: a deterministic hash per cell, advancing slowly (tick >> 3) so glyphs
      // shimmer/drift gently — the same idle feel as MatrixArtStage's char-sea, but standalone.
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const cx = gx * px;
          const cy = gy * px;
          const seed = (gx * 73856093) ^ (gy * 19349663) ^ ((tick >> 3) * 83492791);
          ctx.fillText(SEA_ALPHABET[Math.abs(seed) % SEA_ALPHABET.length], cx + px / 2, cy + px / 2 + 0.5);
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [box.w, box.h, cell, intensity]);

  const maskStyle = focal
    ? ({
        WebkitMaskImage: `radial-gradient(circle at ${focal}, black, transparent 72%)`,
        maskImage: `radial-gradient(circle at ${focal}, black, transparent 72%)`,
      } as const)
    : undefined;

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ imageRendering: 'pixelated', ...maskStyle }}
      />
    </div>
  );
}
