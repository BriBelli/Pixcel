'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * PixcelLogo — the big, centered Pixcel wordmark on the Chat splash (Google-style).
 *
 * SINGLE SWAP POINT. Today this renders the static pixel wordmark
 * (`/pixcel-wordmark.svg`). Later it can become the animated "Doodle": swap the
 * mask source here for a seasonal SVG, or replace the masked <span> with an
 * <img>/<video>/Lottie player — every splash that wants the big logo imports THIS,
 * so there's exactly one place to change.
 *
 * Tint note: `currentColor` does NOT inherit through `<img src>` (it renders black
 * on every surface). We use a CSS mask + `background: currentColor` so the wordmark
 * tints to whatever `color` the host sets — here `var(--a2ui-text-primary)`.
 * ───────────────────────────────────────────────────────────────────────────── */

interface PixcelLogoProps {
  /** Rendered height of the wordmark in px. Width scales to the 459×136 aspect ratio. */
  height?: number;
  className?: string;
}

/** Wordmark intrinsic aspect ratio (viewBox 0 0 459 136). */
const WORDMARK_RATIO = 459 / 136;

export default function PixcelLogo({ height = 84, className }: PixcelLogoProps) {
  return (
    <span
      role="img"
      aria-label="Pixcel"
      className={className}
      style={{
        display: 'block',
        height,
        width: height * WORDMARK_RATIO,
        // Tintable via the host's `color`. Swap this URL for the animated Doodle later.
        WebkitMask: 'url(/pixcel-wordmark.svg) center / contain no-repeat',
        mask: 'url(/pixcel-wordmark.svg) center / contain no-repeat',
        background: 'currentColor',
        color: 'var(--a2ui-text-primary)',
      }}
    />
  );
}
