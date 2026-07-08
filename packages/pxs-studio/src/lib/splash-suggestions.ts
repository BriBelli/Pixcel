'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Splash personalization — REAL state, not filler.
 *
 * Pulls the user's recent projects (active threads) so the greeting can offer specific
 * "Continue: <title>" chips that resume the actual work, and so the copy can be
 * state-aware (a returning user with projects reads differently from a first visit).
 * Curated production starters fill the rest.
 *
 * GROWTH PATH: this is the seam a fuller suggestion agent slots into — next-steps on a
 * project, newly-relevant models/features, reminders, inspiration. It already renders
 * whatever it returns; enriching the source doesn't touch the greeting.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { DEV_USER_ID } from './db/models';

/** localStorage key holding the active chat thread (mirrors chat-turns-store). */
const THREAD_KEY = 'pxs-chat-thread';

export interface SplashChip {
  id: string;
  label: string;
  /** 'resume' → reopen an existing project (by threadId); 'prompt' → start a new turn with `prompt`. */
  kind: 'prompt' | 'resume';
  prompt?: string;
  threadId?: string;
}

interface RecentProject {
  id: string;
  title: string;
  updated_at: number;
}

/** Curated production starters — professional register (this is a production tool, not a toy). */
const CREATIVE_STARTERS: SplashChip[] = [
  { id: 'character', label: 'Build a character reference', kind: 'prompt', prompt: 'Build a character reference sheet' },
  { id: 'scene', label: 'Compose a scene', kind: 'prompt', prompt: 'Compose a cinematic scene' },
  { id: 'style', label: 'Develop a style frame', kind: 'prompt', prompt: 'Develop a style frame for a project' },
  { id: 'identity', label: 'Design a brand mark', kind: 'prompt', prompt: 'Design a brand mark' },
];

/** Trim a project title to a chip-friendly length. */
function short(title: string, n = 32): string {
  const t = title.trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

export interface SplashState {
  chips: SplashChip[];
  /** True once we know the user has prior projects — drives state-aware greeting copy. */
  hasProjects: boolean;
  /** Still fetching (avoids a flash of the "new user" copy for a returning user). */
  loading: boolean;
}

/**
 * The splash's personalized state. Fetches recent projects after mount; offers the two most recent
 * as "Continue: <title>" resume chips, then fills with production starters.
 */
export function useSplashState(max = 4): SplashState {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetch(`/api/threads?user_id=${encodeURIComponent(DEV_USER_ID)}&limit=6`)
      .then((r) => (r.ok ? r.json() : { threads: [] }))
      .then((d: { threads?: RecentProject[] }) => {
        if (live) setProjects(Array.isArray(d.threads) ? d.threads : []);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const chips: SplashChip[] = [];
  for (const p of projects.slice(0, 2)) {
    chips.push({ id: `resume-${p.id}`, label: `Continue: ${short(p.title)}`, kind: 'resume', threadId: p.id });
  }
  for (const s of CREATIVE_STARTERS) {
    if (chips.length >= max) break;
    chips.push(s);
  }

  return { chips: chips.slice(0, max), hasProjects: projects.length > 0, loading };
}

/** Set the active thread so a resume chip reopens THAT project (ChatView restores it on mount). */
export function markResumeThread(threadId: string): void {
  try {
    window.localStorage.setItem(THREAD_KEY, threadId);
  } catch {
    /* storage unavailable — resume falls back to the last thread */
  }
}
