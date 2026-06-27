'use client';

import { useState, useEffect } from 'react';

export interface CurrentUser {
  firstName?: string;
  name?: string;
  email?: string;
}

/**
 * The single source of truth for the signed-in user.
 *
 * TODO(auth): wire this to the real session (next-auth / Cognito / your provider).
 * Until auth exists it returns `null`, so name-dependent UI falls back gracefully
 * (the splash greeting drops the name → "How can I help you today?").
 *
 * Dev convenience: set `localStorage.setItem('pxs-user', JSON.stringify({ firstName: 'Brian' }))`
 * to preview the personalized greeting without auth.
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
