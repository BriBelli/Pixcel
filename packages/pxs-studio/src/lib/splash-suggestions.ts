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

/** A low-pressure DISCOVERY entry — for the new/overwhelmed or just-curious user who isn't here
 *  to create yet (routes to the Operator answering, no spend). Always surfaced, before starters. */
const DISCOVERY: SplashChip = {
  id: 'discover',
  label: 'What can Pixcel do?',
  kind: 'prompt',
  prompt: 'What can Pixcel do?',
};

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

// SESSION cache + in-flight dedupe — the splash re-mounts on every nav (and StrictMode double-invokes
// effects in dev), which was firing a fresh /api/threads on each. Share ONE fetch across all mounts:
// an in-flight promise coalesces concurrent mounts; the result is cached for the session so later
// mounts resolve instantly (no repeat calls). Stale until reload — fine for a splash nicety.
let recentCache: RecentProject[] | null = null;
let recentInflight: Promise<RecentProject[]> | null = null;
function fetchRecentProjects(): Promise<RecentProject[]> {
  if (recentCache) return Promise.resolve(recentCache);
  if (recentInflight) return recentInflight;
  recentInflight = fetch(`/api/threads?user_id=${encodeURIComponent(DEV_USER_ID)}&limit=6`)
    .then((r) => (r.ok ? r.json() : { threads: [] }))
    .then((d: { threads?: RecentProject[] }) => {
      recentCache = Array.isArray(d.threads) ? d.threads : [];
      return recentCache;
    })
    .catch(() => [] as RecentProject[])
    .finally(() => {
      recentInflight = null;
    });
  return recentInflight;
}

/**
 * The splash's personalized state. Fetches recent projects after mount (once per session, cached);
 * offers the two most recent as "Continue: <title>" resume chips, then fills with production starters.
 */
export function useSplashState(max = 4): SplashState {
  const [projects, setProjects] = useState<RecentProject[]>(() => recentCache ?? []);
  const [loading, setLoading] = useState(() => recentCache === null);

  useEffect(() => {
    if (recentCache) return; // already have it — no fetch, no flash
    let live = true;
    fetchRecentProjects()
      .then((t) => {
        if (live) setProjects(t);
      })
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
  // Discovery entry always surfaces (serves the non-creator/curious user), then production starters fill.
  if (chips.length < max) chips.push(DISCOVERY);
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
