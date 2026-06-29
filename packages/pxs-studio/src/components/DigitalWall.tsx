'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PIXCEL_LOGO_FRAME } from '../data/pixcel-logo';
import type { PXSFrame } from '../store/pxs-store';

/**
 * DigitalWall — the persistent z-0 Pixcel digital wall (charter §1/§3, build-order step 1).
 *
 * THE WALL IS A REAL PIXCEL GRID — not a fake char-matrix. It is the actual PXS data model
 * (`PXSFrame` / `PXSCell`: one solid color per cell) rendered as REAL colored cells, exactly the
 * grid in `demos/index.html` and the studio GRID tab. The effect math here is the studio's own
 * Live-Effects engine (the same plasma / radial-pulse / spiral / gradient generators that live in
 * `workers/grid.worker.ts`), and the cells paint with the same direct per-cell `fillRect` path the
 * studio's CanvasRenderer / `GridCanvas` use. No characters, no faux text — real cells only.
 *
 * Default look: a calm, dim charcoal-blue ambient (radial pulse) with the Pixcel logo loaded as
 * REAL cells, centered. The splash is meant to "feel not there" — the logo + UI read clearly — so
 * the ambient intensity is deliberately LOW. It's a living backdrop, not a loud demo.
 *
 * AI-controllable: the wall is driven entirely by props (`mode` / `effect` / `frame` / `palette`
 * / `intensity` / `paused` …) so the agent can later flip it between pixcel-grid / video / face
 * modes, push an explicit PXSFrame onto it, or tune the ambient — all on the real engine. Keep
 * `<DigitalWall>` the export LandingPage already uses.
 *
 * CROWN JEWEL: this is a NEW consumer of the engine. It does not import or touch pxs-core engine
 * logic, MatrixArtStage, live-jobs, the live-art store, or /api.
 */

// ---------------------------------------------------------------------------
// Color helpers (self-contained — the wall renders RGB cells directly to canvas).
// ---------------------------------------------------------------------------
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 1) + 1) % 1;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  const s = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex.trim());
  if (s) return [parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), parseInt(s[3] + s[3], 16)];
  return [22, 22, 24]; // --a2ui-cool-900 fallback
}

// ---------------------------------------------------------------------------
// Effect generators — the studio's own Live-Effects math (mirrors grid.worker.ts).
// Each writes RGB into `buf` (length cols*rows*3). `intensity` (0..1) scales how far the
// effect departs from the base bg, so the SAME effect can be a loud demo or a dim ambient.
// ---------------------------------------------------------------------------
export type WallEffect = 'radialPulse' | 'plasma' | 'spiral' | 'radialGradient' | 'solid';

interface EffectCtx {
  cols: number;
  rows: number;
  time: number;
  base: [number, number, number];
  intensity: number;
  hue: number; // brand-blue centered hue
}

function writeRadialPulse(buf: Uint8ClampedArray, c: EffectCtx) {
  const { cols, rows, time, base, intensity, hue } = c;
  const cx = cols / 2;
  const cy = rows / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;
  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const norm = dist / maxDist;
      const ring1 = Math.sin(dist * 0.4 - time * 4) * 0.5 + 0.5;
      const ring2 = Math.sin(dist * 0.25 - time * 2.5 + Math.PI) * 0.3 + 0.3;
      const pulse = (ring1 + ring2) * 0.5; // 0..~0.65
      const [r, g, b] = hslToRgb(hue + norm * 0.04, 0.55, 0.18 + pulse * 0.6);
      buf[i++] = base[0] + (r - base[0]) * intensity * pulse;
      buf[i++] = base[1] + (g - base[1]) * intensity * pulse;
      buf[i++] = base[2] + (b - base[2]) * intensity * pulse;
    }
  }
}

function writePlasma(buf: Uint8ClampedArray, c: EffectCtx) {
  const { cols, rows, time, base, intensity, hue } = c;
  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v1 = Math.sin(x * 0.12 + time);
      const v2 = Math.sin((y * 0.12 + time) * 0.5);
      const v3 = Math.sin((x * 0.1 + y * 0.1 + time) * 0.5);
      const cxp = x + 0.5 * cols * Math.sin(time * 0.5);
      const cyp = y + 0.5 * rows * Math.cos(time * 0.3);
      const v4 = Math.sin(Math.sqrt((cxp * cxp + cyp * cyp) * 0.01) + time);
      const v = (v1 + v2 + v3 + v4) * 0.25; // -1..1
      const amt = (v + 1) * 0.5; // 0..1
      const [r, g, b] = hslToRgb(hue + v * 0.06, 0.5, 0.2 + amt * 0.5);
      buf[i++] = base[0] + (r - base[0]) * intensity * amt;
      buf[i++] = base[1] + (g - base[1]) * intensity * amt;
      buf[i++] = base[2] + (b - base[2]) * intensity * amt;
    }
  }
}

function writeSpiral(buf: Uint8ClampedArray, c: EffectCtx) {
  const { cols, rows, time, base, intensity, hue } = c;
  const cx = cols / 2;
  const cy = rows / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;
  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const s1 = Math.sin(dist * 0.25 - angle * 3 + time * 2.5);
      const s2 = Math.sin(dist * 0.15 + angle * 2 - time * 1.5);
      const combined = (s1 + s2) * 0.5; // -1..1
      const amt = (combined + 1) * 0.5;
      const [r, g, b] = hslToRgb(hue + combined * 0.05 + (dist / maxDist) * 0.05, 0.55, 0.18 + amt * 0.5);
      buf[i++] = base[0] + (r - base[0]) * intensity * amt;
      buf[i++] = base[1] + (g - base[1]) * intensity * amt;
      buf[i++] = base[2] + (b - base[2]) * intensity * amt;
    }
  }
}

function writeRadialGradient(buf: Uint8ClampedArray, c: EffectCtx) {
  const { cols, rows, base, intensity, hue } = c;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;
  const [cr, cg, cb] = hslToRgb(hue, 0.5, 0.45);
  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const t = 1 - Math.min(Math.sqrt(dx * dx + dy * dy) / maxDist, 1); // 1 center → 0 edge
      const amt = t * intensity;
      buf[i++] = base[0] + (cr - base[0]) * amt;
      buf[i++] = base[1] + (cg - base[1]) * amt;
      buf[i++] = base[2] + (cb - base[2]) * amt;
    }
  }
}

function writeSolid(buf: Uint8ClampedArray, c: EffectCtx) {
  const { cols, rows, base } = c;
  let i = 0;
  for (let p = 0; p < cols * rows; p++) {
    buf[i++] = base[0];
    buf[i++] = base[1];
    buf[i++] = base[2];
  }
}

const EFFECTS: Record<WallEffect, (buf: Uint8ClampedArray, c: EffectCtx) => void> = {
  radialPulse: writeRadialPulse,
  plasma: writePlasma,
  spiral: writeSpiral,
  radialGradient: writeRadialGradient,
  solid: writeSolid,
};

// ---------------------------------------------------------------------------
// Props — the AI-controllable surface.
// ---------------------------------------------------------------------------
export type WallMode = 'pixcel' | 'video' | 'face';

export interface DigitalWallProps {
  /**
   * Wall mode. `pixcel` (default) = the ambient grid + logo. `video`/`face` are reserved hooks for
   * the agent to drive later (they currently fall back to the pixcel grid so the wall is never blank).
   */
  mode?: WallMode;
  /** Ambient effect when no explicit `frame` is supplied. */
  effect?: WallEffect;
  /**
   * Explicit PXSFrame to display as real cells (AI override). When set, the ambient effect is
   * suspended and this frame is painted verbatim, scaled to fit the wall. Animation-ready: push a
   * new frame each tick to drive a sequence.
   */
  frame?: PXSFrame | null;
  /**
   * Target COLUMN COUNT for the wall — the flagship low-res look. Resolution derives from this
   * (rows are computed proportional to the wall's aspect), so the grid stays low-res and chunky as
   * the viewport grows: a large canvas at low density, with huge headroom for the AI to drive.
   * ~40 is the sweet spot ("resolution like 32, just enough to let the AI control it").
   */
  cols?: number;
  /**
   * Optional hard floor on cell edge length (px). The wall is column-count-driven; this only clamps
   * cells from getting absurdly tiny on a very narrow container. Leave default for the chunky look.
   */
  minCellPx?: number;
  /** Visible 1px gridlines on every cell (the Pixcel worktop/LED lattice). ON for the wall. */
  gridLines?: boolean;
  /** Gridline stroke color. Defaults to the theme border token, read at runtime. */
  gridLineColor?: string;
  /** Gridline alpha (0..1). Very low by design — structural, not loud. */
  gridLineAlpha?: number;
  /** How far the ambient effect departs from the charcoal base (0..1). LOW by design. */
  intensity?: number;
  /** Ambient animation rate (frames/sec). The grid itself is static between ticks. */
  fps?: number;
  /** Hard pause (the agent can freeze the wall). Also auto-paused on prefers-reduced-motion. */
  paused?: boolean;
  /** Show the Pixcel logo as real centered cells over the ambient. */
  showLogo?: boolean;
  /**
   * Logo footprint as a fraction of the grid width (0..1), centered. The 27-wide logo frame maps to
   * `round(cols * logoScale)` columns via nearest-neighbor (stays on the lattice). At/above its
   * native width (~0.68 on a 40-col grid) the wordmark is crisp; BELOW native it downsamples the
   * hand-authored cells and the letters garble — keep at native unless you want it bigger.
   */
  logoScale?: number;
  /**
   * ONE-KNOB logo sizing (recommended): the logo's width as a fraction of the wall (0..1). When set,
   * this is the size source of truth (overrides `logoScale`) AND auto-raises `cols` just enough to keep
   * the 27-wide wordmark crisp (cols ≥ 27/logoWidth) — so you never compute the crispness rule by hand.
   * It never LOWERS an explicitly chosen `cols`; a smaller logo simply pulls the grid finer (lattice law).
   * Omit it to use the classic `cols` + `logoScale` pair. Note: very small values (≲0.15) push cols high.
   */
  logoWidth?: number;
  /** Brand accent (logo cells + effect hue). Defaults to the locked brand blue. */
  accent?: string;
  /** Base/background color of the wall. Defaults to the theme bg token, read at runtime. */
  background?: string;
  /**
   * Reports the logo's bounding box as fractions of the wall (0..1), recomputed on every
   * resize / prop change (NOT per animation frame). Lets floating UI anchor to the logo —
   * e.g. the splash prompt bar sits just below the wordmark regardless of `logoWidth`.
   */
  onLogoLayout?: (box: {
    topFrac: number;
    bottomFrac: number;
    centerXFrac: number;
    heightFrac: number;
    visible: boolean;
  }) => void;
  className?: string;
}

const BRAND_BLUE = '#58a6ff'; // locked --pxl-brand-blue
const BG_FALLBACK = '#161618'; // --a2ui-cool-900
const LOGO_INK = '#e4e4e8';
const GRIDLINE_FALLBACK = '#30363d'; // --a2ui-border-default family

export default function DigitalWall({
  mode = 'pixcel',
  effect = 'radialPulse',
  frame = null,
  cols: targetCols = 40,
  minCellPx = 12,
  gridLines = true,
  gridLineColor,
  gridLineAlpha = 0.08,
  intensity = 0.16,
  fps = 18,
  paused = false,
  showLogo = true,
  // ~0.68 on a 40-col grid = the logo at its NATIVE 27-cell width (no resampling) → crisp letters,
  // centered, ~two-thirds width. Going below native downsamples the hand-authored cells and garbles
  // the wordmark (the low-res cells can't be faithfully shrunk), so native is the tasteful floor.
  logoScale = 0.68,
  logoWidth,
  accent = BRAND_BLUE,
  background,
  onLogoLayout,
  className,
}: DigitalWallProps) {
  // Keep the layout callback in a ref so the render effect never re-runs just because the parent
  // passed a new inline function — geometry recompute is driven by size/props, not callback identity.
  const onLogoLayoutRef = useRef(onLogoLayout);
  onLogoLayoutRef.current = onLogoLayout;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const bgRef = useRef(BG_FALLBACK);
  const gridLineRef = useRef(GRIDLINE_FALLBACK);

  // `video`/`face` are reserved hooks; until the agent wires those modes, every mode renders the
  // pixcel grid so the wall is never blank. `mode` is read here to keep it a live prop.
  void mode;
  const activeEffect: WallEffect = effect;

  // Brand hue (for effect tinting) derived once from the accent.
  const baseHue = useMemo(() => {
    const [r, g, b] = hexToRgb(accent).map((v) => v / 255) as [number, number, number];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return 0.58;
    let h: number;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return (((h * 60) / 360) % 1 + 1) % 1;
  }, [accent]);

  // Resolve theme bg token + measure container (full-bleed). Re-measure on resize.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const cs = (() => {
      try {
        return getComputedStyle(el);
      } catch {
        return null;
      }
    })();
    if (background) {
      bgRef.current = background;
    } else if (cs) {
      const v = cs.getPropertyValue('--a2ui-bg-app').trim();
      if (v) bgRef.current = v;
    }
    if (gridLineColor) {
      gridLineRef.current = gridLineColor;
    } else if (cs) {
      const v = cs.getPropertyValue('--a2ui-border-default').trim();
      if (v) gridLineRef.current = v;
    }
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [background, gridLineColor]);

  // The render loop — paints REAL PXSCell colors (one solid color per cell) to the canvas.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d', { alpha: false });
    if (!ctx) return;
    const W = box.w;
    const H = box.h;
    if (W < 2 || H < 2) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // LOW-RES, LARGE CANVAS: resolution is COLUMN-COUNT driven, not pixel driven, so the wall stays
    // chunky/low-density as the viewport grows. cols derives from targetCols; the cell px falls out
    // of (width / cols); rows stay proportional to the wall's aspect. minCellPx only clamps cells
    // from getting absurdly tiny on a very narrow container. This keeps the cell count tiny (~40 ×
    // ~22 ≈ 900 cells) — deep in the engine's cheap HTMLRenderer range, huge AI headroom.
    // `logoWidth` (if set) is the logo-size source of truth and dictates the MIN columns needed to keep
    // the 27-wide wordmark crisp (cols ≥ 27/logoWidth). effLogoScale is what the logo placement uses.
    const effLogoScale = logoWidth != null ? logoWidth : logoScale;
    const minColsForLogo =
      showLogo && logoWidth != null
        ? Math.ceil(PIXCEL_LOGO_FRAME.cols / Math.max(0.01, logoWidth))
        : 0;

    let cols = Math.max(4, Math.round(targetCols));
    let px = W / cols;
    if (px < minCellPx) {
      cols = Math.max(4, Math.floor(W / minCellPx));
      px = W / cols;
    }
    // Logo crispness wins over the minCellPx floor: raise cols (finer cells) so the logo never garbles.
    if (minColsForLogo > cols) {
      cols = minColsForLogo;
      px = W / cols;
    }
    const rows = Math.max(2, Math.round(H / px)); // proportional to aspect
    const cellCount = cols * rows;

    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const base = hexToRgb(bgRef.current);
    const logoRgb = hexToRgb(LOGO_INK);
    const accentRgb = hexToRgb(accent);
    const buf = new Uint8ClampedArray(cellCount * 3);

    // Gridline stroke style (token-derived, very low alpha). Drawn after the cells so the lattice
    // reads over both ambient and logo cells — the Pixcel worktop look.
    const [glR, glG, glB] = hexToRgb(gridLineRef.current);
    const gridStroke = `rgba(${glR},${glG},${glB},${Math.max(0, Math.min(1, gridLineAlpha))})`;

    // Logo placement: the 27×8 PIXCEL_LOGO_FRAME is letterboxed to `logoCols` columns (a fraction of
    // the grid width) and centered, so at low resolutions it stays tasteful instead of spanning the
    // whole wall. Each destination grid cell samples the logo source by nearest-neighbor, so the
    // logo stays ON the lattice (real cells, no sub-grid blur). Returns the lit source cell or null.
    const logo = PIXCEL_LOGO_FRAME;
    // Letterbox the logo to `logoScale` of the grid width, clamped to [a few cells, grid width].
    // Below native width the source is downsampled (nearest-neighbor) onto fewer cells; this keeps
    // the wordmark tasteful at low resolutions instead of spanning the whole wall.
    const logoCols = Math.max(4, Math.min(cols, Math.round(cols * effLogoScale)));
    const logoRows = Math.max(1, Math.round((logoCols / logo.cols) * logo.rows));
    const logoOffX = Math.round((cols - logoCols) / 2);
    const logoOffY = Math.round((rows - logoRows) / 2);
    // Report the logo's box (fractions of the wall) so floating UI can anchor to it. Done once per
    // geometry recompute (resize/prop change), not per frame.
    onLogoLayoutRef.current?.(
      showLogo
        ? {
            topFrac: logoOffY / rows,
            bottomFrac: (logoOffY + logoRows) / rows,
            centerXFrac: 0.5,
            heightFrac: logoRows / rows,
            visible: true,
          }
        : { topFrac: 0.5, bottomFrac: 0.5, centerXFrac: 0.5, heightFrac: 0, visible: false },
    );
    // Precompute a lit-cell set for O(1) source lookup.
    const litSet = new Set<number>();
    for (const c of logo.cells) litSet.add(c.y * logo.cols + c.x);
    const logoLitAt = (gx: number, gy: number): boolean => {
      const lx = gx - logoOffX;
      const ly = gy - logoOffY;
      if (lx < 0 || ly < 0 || lx >= logoCols || ly >= logoRows) return false;
      // Map destination cell → source cell (nearest neighbor).
      const sx = Math.min(logo.cols - 1, Math.floor((lx / logoCols) * logo.cols));
      const sy = Math.min(logo.rows - 1, Math.floor((ly / logoRows) * logo.rows));
      return litSet.has(sy * logo.cols + sx);
    };

    const generate = EFFECTS[activeEffect] ?? writeRadialPulse;

    const drawGridLines = () => {
      if (!gridLines || gridLineAlpha <= 0) return;
      ctx.strokeStyle = gridStroke;
      ctx.lineWidth = 1;
      const stepX = W / cols;
      const stepY = H / rows;
      ctx.beginPath();
      for (let x = 0; x <= cols; x++) {
        const gx = Math.round(x * stepX) + 0.5; // crisp 1px line
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
      }
      for (let y = 0; y <= rows; y++) {
        const gy = Math.round(y * stepY) + 0.5;
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
      }
      ctx.stroke();
    };

    const paintBuf = () => {
      // Effect buffer → real per-cell color rects.
      let i = 0;
      const stepX = W / cols;
      const stepY = H / rows;
      for (let y = 0; y < rows; y++) {
        const y0 = Math.floor(y * stepY);
        const y1 = Math.floor((y + 1) * stepY);
        for (let x = 0; x < cols; x++, i += 3) {
          const x0 = Math.floor(x * stepX);
          const x1 = Math.floor((x + 1) * stepX);
          ctx.fillStyle = `rgb(${buf[i]},${buf[i + 1]},${buf[i + 2]})`;
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
      }
      drawGridLines();
    };

    // Paint an explicit PXSFrame (AI override) scaled to fit, centered, on the base bg. This is how
    // the agent takes over the wall (a face / expression / mood frame): it fully composites OVER the
    // ambient+logo for this tick, so an expression can own the whole wall. Gridlines stay on top so
    // the Pixcel lattice persists across modes.
    const paintFrame = (f: PXSFrame) => {
      ctx.fillStyle = bgRef.current;
      ctx.fillRect(0, 0, W, H);
      const cw = W / f.cols;
      const ch = H / f.rows;
      for (const cell of f.cells) {
        ctx.fillStyle = cell.color;
        const x0 = Math.floor(cell.x * cw);
        const y0 = Math.floor(cell.y * ch);
        const x1 = Math.floor((cell.x + 1) * cw);
        const y1 = Math.floor((cell.y + 1) * ch);
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
      drawGridLines();
    };

    const overlayLogo = (glow: number) => {
      // Blend the (letterboxed, centered) logo cells over the ambient buffer — subtle, breathing.
      for (let gy = logoOffY; gy < logoOffY + logoRows; gy++) {
        if (gy < 0 || gy >= rows) continue;
        for (let gx = logoOffX; gx < logoOffX + logoCols; gx++) {
          if (gx < 0 || gx >= cols) continue;
          if (!logoLitAt(gx, gy)) continue;
          const i = (gy * cols + gx) * 3;
          const t = 0.85; // logo presence over ambient
          buf[i] = logoRgb[0] * t + accentRgb[0] * (1 - t) * glow + buf[i] * (1 - t);
          buf[i + 1] = logoRgb[1] * t + accentRgb[1] * (1 - t) * glow + buf[i + 1] * (1 - t);
          buf[i + 2] = logoRgb[2] * t + accentRgb[2] * (1 - t) * glow + buf[i + 2] * (1 - t);
        }
      }
    };

    let raf = 0;
    let last = 0;
    const frameMs = 1000 / Math.max(1, fps);
    const start = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < frameMs) return;
      last = now;

      if (frame) {
        paintFrame(frame);
        return;
      }

      const time = (now - start) / 1000;
      const ctxObj: EffectCtx = { cols, rows, time, base, intensity, hue: baseHue };
      generate(buf, ctxObj);
      if (showLogo) {
        const glow = 0.6 + 0.4 * Math.sin(time * 0.8); // gentle breathing
        overlayLogo(glow);
      }
      paintBuf();
    };

    // Static path: reduced-motion or hard pause → render exactly one frame, no loop.
    if (paused || reducedMotion) {
      if (frame) {
        paintFrame(frame);
      } else {
        const ctxObj: EffectCtx = { cols, rows, time: 0, base, intensity, hue: baseHue };
        generate(buf, ctxObj);
        if (showLogo) overlayLogo(0.7);
        paintBuf();
      }
      return;
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    box.w,
    box.h,
    targetCols,
    minCellPx,
    gridLines,
    gridLineColor,
    gridLineAlpha,
    intensity,
    fps,
    paused,
    showLogo,
    logoScale,
    activeEffect,
    baseHue,
    accent,
    frame,
  ]);

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
