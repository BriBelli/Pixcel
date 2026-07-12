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
  /** 'splash' = the big full-viewport hero (default); 'compact' = a smaller scale for the workspace
   *  empty state, where it shares the frame with panels and shouldn't shout. Same lockup, sized down. */
  size?: 'splash' | 'compact';
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
/* compact — the workspace empty state (shares the frame with panels) */
.pxs-hero-title--sm { font-size: clamp(1.5rem, 1.15rem + 1.4vw, 2rem); } /* ~24 → 32px */
.pxs-hero-sub--sm { font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem); } /* ~16 → 18px */
`;

export function GreetingHero({ title, subtitle, size = 'splash' }: GreetingHeroProps) {
  const sm = size === 'compact';
  return (
    <>
      <style>{CSS}</style>
      <h1 className={sm ? 'pxs-hero-title pxs-hero-title--sm' : 'pxs-hero-title'}>{title}</h1>
      {subtitle && <p className={sm ? 'pxs-hero-sub pxs-hero-sub--sm' : 'pxs-hero-sub'}>{subtitle}</p>}
    </>
  );
}

export default GreetingHero;
