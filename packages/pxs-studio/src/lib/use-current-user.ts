'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useCredentialsSession } from './credentials-auth';

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
 * MERGES two sessions:
 *  1. The Auth0 React SDK session (redirect/PKCE: Google, hosted login, signup) —
 *     see AuthProvider.tsx, which wraps the app in `<Auth0Provider>`.
 *  2. The CUSTOM credentials session (email/password Resource Owner Password
 *     Grant via the in-app LoginModal) — see credentials-auth.ts.
 *
 * The SDK session wins when present; otherwise the custom credentials session is
 * mapped into the same CurrentUser shape. Returns `null` when no one is signed in
 * so name-dependent UI falls back gracefully (e.g. the splash greeting drops the
 * name).
 *
 * Must be called inside the AuthProvider tree. `firstName` prefers the IdP's
 * `given_name`, falling back to the first token of `name`.
 */
export function useCurrentUser(): CurrentUser | null {
  const { isAuthenticated, user } = useAuth0();
  const credentialsUser = useCredentialsSession();

  if (isAuthenticated && user) {
    return {
      name: user.name,
      email: user.email,
      avatarUrl: user.picture,
      firstName: user.given_name ?? user.name?.split(' ')[0],
    };
  }

  if (credentialsUser) {
    return {
      name: credentialsUser.name,
      email: credentialsUser.email,
      avatarUrl: credentialsUser.picture,
      firstName:
        credentialsUser.given_name ?? credentialsUser.name?.split(' ')[0],
    };
  }

  return null;
}
