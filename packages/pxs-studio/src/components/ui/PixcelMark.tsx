/* ─────────────────────────────────────────────────────────────────────────────
 * PixcelMark — the locked Pixel-X brand mark (Claude Design handoff §10).
 * Rendered via inline <svg><use href="/brand/logo-mark.svg#pixcel-x"/></svg> so
 * `currentColor` inherits from the host element and the glyph tints to `color`.
 * (An <img src> would render black on every surface — forbidden by the handoff.)
 * ───────────────────────────────────────────────────────────────────────────── */

export interface PixcelMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function PixcelMark({ size = 24, className, style }: PixcelMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Pixcel"
      shapeRendering="crispEdges"
      className={className}
      style={{ flexShrink: 0, display: 'block', color: 'currentColor', ...style }}
    >
      <use href="/brand/logo-mark.svg#pixcel-x" />
    </svg>
  );
}

export default PixcelMark;
