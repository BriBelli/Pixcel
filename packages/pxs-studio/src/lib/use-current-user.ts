'use client';

import { useState, useEffect } from 'react';

export interface CurrentUser {
  firstName?: string;
  name?: string;
  email?: string;
  /** URL to the user's avatar image. When absent, UI falls back to an initial/glyph. */
  avatarUrl?: string;
}

/**
 * The single source of truth for the signed-in user.
 *
 * TODO(auth): wire this to the real session (next-auth / Cognito / your provider).
 * Until auth exists it returns `null`, so name-dependent UI falls back gracefully
 * (the splash greeting drops the name → "How can I help you today?").
 *
 * Dev convenience: set
 * `localStorage.setItem('pxs-user', JSON.stringify({ firstName: 'Brian', avatarUrl: 'https://…' }))`
 * to preview the personalized greeting + rail avatar without auth. The whole JSON blob is
 * spread onto CurrentUser, so any field (incl. avatarUrl) on the override flows through.
 */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    // TODO(auth): replace this block with the real session lookup.
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('pxs-user') : null;
      if (raw) setUser(JSON.parse(raw) as CurrentUser);
    } catch {
      /* ignore malformed dev override */
    }
  }, []);

  return user;
}
