'use client';

import { useAuth0 } from '@auth0/auth0-react';

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
 * Backed by the real Auth0 session (see AuthProvider.tsx, which wraps the app in
 * `<Auth0Provider>`). Returns `null` when no one is signed in, so name-dependent
 * UI falls back gracefully (e.g. the splash greeting drops the name).
 *
 * Must be called inside the AuthProvider tree. `firstName` prefers Auth0's
 * `given_name`, falling back to the first token of `name`.
 */
export function useCurrentUser(): CurrentUser | null {
  const { isAuthenticated, user } = useAuth0();

  if (!isAuthenticated || !user) return null;

  return {
    name: user.name,
    email: user.email,
    avatarUrl: user.picture,
    firstName: user.given_name ?? user.name?.split(' ')[0],
  };
}
