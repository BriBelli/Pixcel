'use client';

import { useEffect, useState } from 'react';
import { Auth0Provider } from '@auth0/auth0-react';

/* ─────────────────────────────────────────────────────────────────────────────
 * AuthProvider — wraps the studio in Auth0's React context.
 *
 * Reuses the SAME Auth0 SPA application as photolif (browser-public PKCE flow,
 * NO client secret). Config mirrors photolif's fallback pattern: env override
 * with hard-coded SPA defaults so the app works out of the box.
 *
 * SSR guard: Auth0Provider reads `window.location.origin` for redirect_uri, so
 * we render children plainly until the component has mounted in the browser.
 * Auth0Provider auto-handles the redirect callback when redirect_uri === origin.
 * ───────────────────────────────────────────────────────────────────────────── */

const AUTH0_DOMAIN =
  process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-iep8px1emd3ipkkp.us.auth0.com';
const AUTH0_CLIENT_ID =
  process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '3Z6o8Yvey48FOeGHILCr9czwJ6iHuQpQ';
// Optional API audience. When set, the SDK requests JWT access tokens for it;
// when unset, Auth0 issues opaque tokens. Omit the param entirely when absent.
const AUTH0_AUDIENCE: string | undefined =
  process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || undefined;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Until mounted (i.e. during SSR/prerender) there's no `window` for
  // redirect_uri — render children without the provider so nothing crashes.
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : {}),
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {children}
    </Auth0Provider>
  );
}
