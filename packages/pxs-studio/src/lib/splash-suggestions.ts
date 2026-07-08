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

/** Curated production starters — professional register (this is a production tool, not a toy). */
const CREATIVE_STARTERS: SplashChip[] = [
  { id: 'character', label: 'Build a character reference', kind: 'prompt', prompt: 'Build a character reference sheet' },
  { id: 'scene', label: 'Compose a scene', kind: 'prompt', prompt: 'Compose a cinematic scene' },
  { id: 'style', label: 'Develop a style frame', kind: 'prompt', prompt: 'Develop a style frame for a project' },
  { id: 'identity', label: 'Design a brand mark', kind: 'prompt', prompt: 'Design a brand mark' },
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
