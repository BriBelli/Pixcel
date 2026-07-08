'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Splash suggestions — the personalized chips under the greeting hero.
 *
 * v1 draws on the little state we have client-side: a "continue where you left off"
 * chip when a prior conversation exists, plus a few curated Pixcel-creative starters.
 *
 * GROWTH PATH (not built yet): correlate to the user's history + state — recent
 * projects (reminders / "continue <title>"), newly-available models or features,
 * inspiration, and simple next-steps. This function is the single seam a suggestion
 * agent slots into later; the greeting renders whatever it returns.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';

/** localStorage key holding the last active chat thread (mirrors chat-turns-store). */
const THREAD_KEY = 'pxs-chat-thread';

export interface SplashChip {
  id: string;
  label: string;
  /** 'resume' → reopen the last conversation (no prompt); 'prompt' → start a new turn with `prompt`. */
  kind: 'prompt' | 'resume';
  prompt?: string;
}

/** Curated creative starters, tailored to Pixcel's verticals (not generic-assistant fluff). */
const CREATIVE_STARTERS: SplashChip[] = [
  { id: 'logo', label: 'Design a logo', kind: 'prompt', prompt: 'Design a logo for my brand' },
  { id: 'scene', label: 'Create a film scene', kind: 'prompt', prompt: 'Create a short cinematic film scene' },
  { id: 'poster', label: 'Make a poster', kind: 'prompt', prompt: 'Make a poster' },
  { id: 'character', label: 'Design a character', kind: 'prompt', prompt: 'Design a character' },
];

/**
 * The personalized chip set for the splash greeting. Reads the "last thread" flag after mount
 * (SSR-safe) so a returning user is offered "continue" first, then curated starters.
 */
export function useSplashSuggestions(max = 4): SplashChip[] {
  const [hasThread, setHasThread] = useState(false);
  useEffect(() => {
    try {
      setHasThread(!!window.localStorage.getItem(THREAD_KEY));
    } catch {
      /* storage unavailable — no continue chip */
    }
  }, []);

  const chips: SplashChip[] = [];
  if (hasThread) {
    chips.push({ id: 'continue', label: 'Continue where you left off', kind: 'resume' });
  }
  chips.push(...CREATIVE_STARTERS);
  return chips.slice(0, max);
}
