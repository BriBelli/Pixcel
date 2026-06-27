'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * credentials-auth — email/password (Resource Owner Password Grant) login that
 * lives ALONGSIDE the @auth0/auth0-react SDK session.
 *
 * The Auth0 React SDK only does redirect/PKCE flows (Google, hosted login,
 * signup). For our CUSTOM in-app modal we hit Auth0's token endpoint directly
 * (grant_type=password) and persist a small custom session in localStorage —
 * exactly the photolif auth-service pattern, ported from Lit to a framework-
 * agnostic module + a React-reactive store.
 *
 * Reactivity: the custom session is held in module state with a tiny
 * subscribe/emit store so `useCredentialsSession()` (useSyncExternalStore) makes
 * the app re-render the moment a credentials login / logout happens — without
 * waiting for a page reload.
 *
 * Domain/clientId mirror AuthProvider.tsx: NEXT_PUBLIC_AUTH0_* env overrides with
 * the same SPA defaults. NO client secret (public SPA app).
 * ───────────────────────────────────────────────────────────────────────────── */

const AUTH0_DOMAIN =
  process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-iep8px1emd3ipkkp.us.auth0.com';
const AUTH0_CLIENT_ID =
  process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '3Z6o8Yvey48FOeGHILCr9czwJ6iHuQpQ';
// Optional API audience — when set, request a JWT access token so a backend can
// verify the `sub` claim; otherwise Auth0 issues an opaque token. Omit when absent.
const AUTH0_AUDIENCE: string | undefined =
  process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || undefined;

const STORAGE_KEYS = {
  TOKENS: 'a2ui_auth_tokens',
  USER: 'a2ui_auth_user',
} as const;

// ── Types ─────────────────────────────────────────────────────

export interface CredentialsUser {
  email: string;
  name: string;
  picture?: string;
  sub: string;
  email_verified?: boolean;
  nickname?: string;
  given_name?: string;
  [key: string]: unknown;
}

interface StoredTokens {
  access_token?: string;
  expires_in?: number;
  expires_at?: number;
  [key: string]: unknown;
}

// ── Reactive store ────────────────────────────────────────────

let currentUser: CredentialsUser | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Synchronous snapshot of the current credentials user (null when none). */
function getSnapshot(): CredentialsUser | null {
  return currentUser;
}

/** Stable server snapshot for SSR — there's never a session on the server. */
function getServerSnapshot(): CredentialsUser | null {
  return null;
}

// ── Session persistence ───────────────────────────────────────

/** Restore a non-expired custom session from localStorage into module state. */
export function restoreCredentialsSession(): CredentialsUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const tokensRaw = localStorage.getItem(STORAGE_KEYS.TOKENS);
    const userRaw = localStorage.getItem(STORAGE_KEYS.USER);
    if (tokensRaw && userRaw) {
      const tokens: StoredTokens = JSON.parse(tokensRaw);
      if (tokens.expires_at && Date.now() < tokens.expires_at) {
        currentUser = JSON.parse(userRaw) as CredentialsUser;
        emit();
        return currentUser;
      }
    }
  } catch {
    /* invalid / partial data — fall through to clear */
  }
  clearCredentialsSession();
  return null;
}

/** Clear the custom session (localStorage + module state) and notify subscribers. */
export function clearCredentialsSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
  if (currentUser !== null) {
    currentUser = null;
    emit();
  }
}

/** Synchronous read of the current credentials user (null when none). */
export function getCredentialsUser(): CredentialsUser | null {
  return currentUser;
}

// ── Login / reset ─────────────────────────────────────────────

/**
 * Email/password login via Auth0 Resource Owner Password Grant.
 *
 * Tries multiple connection names (matching the photolif / Demo-App behaviour)
 * because tenants differ on the database connection name. On success: fetch the
 * profile from /userinfo, persist the custom session, and notify subscribers.
 */
export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<CredentialsUser> {
  const connections = ['Username-Password-Authentication', 'email', 'database', null];
  let lastError = 'Authentication failed';

  for (const connection of connections) {
    const body: Record<string, string> = {
      grant_type: 'password',
      username: email,
      password,
      client_id: AUTH0_CLIENT_ID,
      scope: 'openid profile email',
    };
    if (connection) body.connection = connection;
    if (AUTH0_AUDIENCE) body.audience = AUTH0_AUDIENCE;

    const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();

      // Fetch the user profile.
      const userResp = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (!userResp.ok) throw new Error('Failed to fetch user profile');

      const user = (await userResp.json()) as CredentialsUser;

      // Persist the custom session.
      localStorage.setItem(
        STORAGE_KEYS.TOKENS,
        JSON.stringify({
          ...data,
          expires_at: Date.now() + (data.expires_in ?? 0) * 1000,
        }),
      );
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      currentUser = user;
      emit();
      return user;
    }

    const errData = await response.json().catch(() => ({}));
    lastError = errData.error_description || errData.error || lastError;
  }

  throw new Error(lastError);
}

/** Send a password-reset email via Auth0's dbconnections/change_password. */
export async function resetPassword(email: string): Promise<void> {
  const response = await fetch(`https://${AUTH0_DOMAIN}/dbconnections/change_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      email,
      connection: 'Username-Password-Authentication',
    }),
  });
  if (!response.ok) throw new Error('Failed to send password reset email');
}

// ── React hook ────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';

/**
 * React-reactive view of the custom credentials session. Re-renders consumers
 * when a credentials login / logout happens. Restores any persisted session on
 * first mount (client-only).
 */
export function useCredentialsSession(): CredentialsUser | null {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Lazily restore a persisted session the first time the hook runs on the
  // client. `restoreCredentialsSession` is idempotent and only emits on change.
  if (typeof window !== 'undefined' && user === null && !restoredOnce) {
    restoredOnce = true;
    restoreCredentialsSession();
  }

  return user;
}

let restoredOnce = false;
