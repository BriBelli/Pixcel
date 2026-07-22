'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useCurrentUser } from '../lib/use-current-user';
import { useLoginModal } from './LoginModalProvider';
import { clearCredentialsSession } from '../lib/credentials-auth';
import { useSettings } from '../store/settings-store';

/* ─────────────────────────────────────────────────────────────────────────────
 * AccountAvatar — the identity anchor, pinned to the TOP-RIGHT of the viewport.
 *
 * Lives in the shell (not the nav rail): it is not a destination, it's *you*. Standard avatar
 * behaviour, in strict fallback order:
 *     signed in + photo  → the photo
 *     signed in, no photo→ their INITIALS (1–2 letters, from name, else email)
 *     signed out         → a neutral person glyph  →  opens the login modal
 *
 * Clicking (when signed in) opens the account popover: theme · Settings · Sign out. The popover
 * hangs DOWN-LEFT from the avatar (it's top-right anchored, so it must not run off-screen).
 * ───────────────────────────────────────────────────────────────────────────── */

type IconName = 'user' | 'settings' | 'sun' | 'moon' | 'logout';

const PATHS: Record<IconName, string[]> = {
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  settings: [
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  ],
  sun: ['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
};

function Ic({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/** Initials from a display name ("Brian Bellino" → "BB"), else the email's first letter. */
function initialsOf(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return email.trim().charAt(0).toUpperCase();
}

const CSS = `
  /* Pinned top-right of the viewport, above every surface. The wrapper is pointer-events:none so a
     fixed element can never block the canvas; only the button itself is clickable. */
  .pxs-account { position: fixed; top: 16px; right: 16px; z-index: 70; pointer-events: none; }
  .pxs-account > * { pointer-events: auto; }

  .pxs-av {
    width: 38px; height: 38px; border-radius: var(--a2ui-radius-full);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-secondary);
    border: 1px solid var(--a2ui-border-default); cursor: pointer; padding: 0;
    transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast), transform var(--a2ui-transition-fast);
  }
  .pxs-av:hover { border-color: var(--a2ui-border-strong); box-shadow: 0 0 0 3px var(--a2ui-bg-hover); }
  .pxs-av:focus-visible { outline: none; border-color: var(--pxs-brand-primary); box-shadow: 0 0 0 3px var(--a2ui-accent-subtle); }
  .pxs-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  /* Initials: the brand pair, so a signed-in user is instantly identifiable and on-brand. */
  .pxs-av-initials {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, var(--pxs-brand-primary), var(--pxs-brand-secondary));
    color: #fff; font-size: 13px; font-weight: 600; letter-spacing: 0.02em;
  }

  /* Account popover — hangs DOWN-LEFT (the avatar is top-right anchored). */
  .pxs-acct-pop {
    position: absolute; top: calc(100% + 10px); right: 0; width: 260px;
    background: var(--a2ui-glass-dark, rgba(18,18,22,0.9)); backdrop-filter: blur(20px);
    border: 1px solid var(--pxs-glass-border, rgba(255,255,255,0.08)); border-radius: var(--a2ui-radius-xl);
    box-shadow: var(--a2ui-shadow-lg); padding: var(--a2ui-space-2);
    display: flex; flex-direction: column; gap: 2px;
  }
  .pxs-acct-head { display: flex; align-items: center; gap: var(--a2ui-space-3); padding: var(--a2ui-space-2) var(--a2ui-space-2) var(--a2ui-space-3); }
  .pxs-acct-id { display: flex; flex-direction: column; min-width: 0; }
  .pxs-acct-name { font-size: var(--a2ui-text-md); color: var(--a2ui-text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pxs-acct-email { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pxs-acct-sep { height: 1px; background: var(--a2ui-border-subtle); margin: var(--a2ui-space-1) 0; }
  .pxs-acct-item {
    display: flex; align-items: center; gap: var(--a2ui-space-3); width: 100%; text-align: left;
    padding: var(--a2ui-space-2) var(--a2ui-space-3); border-radius: var(--a2ui-radius-md);
    background: transparent; color: var(--a2ui-text-primary); cursor: pointer;
    font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-md);
    transition: background var(--a2ui-transition-fast);
  }
  .pxs-acct-item:hover { background: var(--a2ui-bg-hover); }
  .pxs-acct-item > svg { color: var(--a2ui-text-secondary); flex-shrink: 0; }
  .pxs-acct-danger, .pxs-acct-danger > svg { color: var(--a2ui-error); }
  .pxs-acct-danger:hover { background: var(--a2ui-error-bg); }
`;

export default function AccountAvatar({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { isAuthenticated, logout } = useAuth0();
  const { openLogin } = useLoginModal();
  // Merges BOTH sessions (Auth0 SDK + custom credentials).
  const user = useCurrentUser();
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside-click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // SIGNED OUT — the standard neutral person glyph; opens the login modal.
  if (!user) {
    return (
      <div className="pxs-account">
        <style>{CSS}</style>
        <button type="button" title="Sign in" aria-label="Sign in" onClick={openLogin} className="pxs-av">
          <Ic name="user" size={19} />
        </button>
      </div>
    );
  }

  const handleLogout = () => {
    setOpen(false);
    clearCredentialsSession();
    if (isAuthenticated) logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const name = (user.name || user.firstName || '').trim();
  const email = (user.email || '').trim();
  const initials = initialsOf(name, email);

  return (
    <div className="pxs-account">
      <style>{CSS}</style>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          title={name || email || 'Account'}
          aria-label={name || email || 'Account'}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="pxs-av"
        >
          {/* photo → initials (never the generic glyph once signed in). */}
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="pxs-av-initials">{initials || <Ic name="user" size={19} />}</span>}
        </button>

        {open && (
          <div className="pxs-acct-pop" role="menu">
            <div className="pxs-acct-head">
              <span className="pxs-av" style={{ width: 40, height: 40, flexShrink: 0, cursor: 'default' }}>
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="pxs-av-initials">{initials}</span>}
              </span>
              <span className="pxs-acct-id">
                <span className="pxs-acct-name">{name || email || 'Account'}</span>
                {email && <span className="pxs-acct-email">{email}</span>}
              </span>
            </div>

            <div className="pxs-acct-sep" />

            <button type="button" role="menuitem" className="pxs-acct-item" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <Ic name={theme === 'dark' ? 'sun' : 'moon'} />
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              type="button"
              role="menuitem"
              className="pxs-acct-item"
              onClick={() => {
                setOpen(false);
                onOpenSettings?.();
              }}
            >
              <Ic name="settings" />
              Settings
            </button>

            <div className="pxs-acct-sep" />

            <button type="button" role="menuitem" className="pxs-acct-item pxs-acct-danger" onClick={handleLogout}>
              <Ic name="logout" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
