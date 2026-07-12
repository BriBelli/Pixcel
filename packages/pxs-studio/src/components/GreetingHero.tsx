'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * GreetingHero — the ONE canonical greeting lockup (title + quiet subtitle).
 *
 * Shared so every "what are we making" moment reads identically: the chat splash
 * (SplashGreeting) and the image/video workspace empty state (ImageStage) both render
 * THIS — tune the type here and it changes everywhere. Lighter, calmer, graceful; a
 * medium-weight title (never bold) on a steep fluid slope so it holds across breakpoints,
 * with a restrained subtitle beneath. Tokens/brand only, Claude-Design gospel.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface GreetingHeroProps {
  title: string;
  subtitle?: string;
}

const CSS = `
.pxs-hero-title {
  font-size: clamp(1.875rem, 1.2rem + 2.6vw, 3rem); /* ~30 → 48px */
  font-weight: var(--a2ui-font-medium, 500);
  letter-spacing: -0.02em; line-height: var(--a2ui-leading-tight);
  color: var(--a2ui-text-primary); margin: 0;
}
.pxs-hero-sub {
  font-size: clamp(1.125rem, 0.95rem + 0.6vw, 1.375rem); /* ~18 → 22px */
  font-weight: var(--a2ui-font-normal, 400);
  color: var(--a2ui-text-secondary);
  letter-spacing: 0.02em;
  line-height: 1.45; margin: var(--a2ui-space-1) 0 0; max-width: 44ch;
}
`;

export function GreetingHero({ title, subtitle }: GreetingHeroProps) {
  return (
    <>
      <style>{CSS}</style>
      <h1 className="pxs-hero-title">{title}</h1>
      {subtitle && <p className="pxs-hero-sub">{subtitle}</p>}
    </>
  );
}

export default GreetingHero;
