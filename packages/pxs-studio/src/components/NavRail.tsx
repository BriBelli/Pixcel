'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useCurrentUser } from '../lib/use-current-user';
import { useLoginModal } from './LoginModalProvider';
import { clearCredentialsSession } from '../lib/credentials-auth';
import { useSettings } from '../store/settings-store';

/* ─────────────────────────────────────────────────────────────────────────────
 * NavRail — the primary app-feature switcher (Chat · Art · Image · Video
 * + Export · Assets · Assistant utility cluster, and the signed-in user's avatar
 * pinned at the very bottom).
 *
 * This is the SHARED extraction of the rail pattern that lives inline in the FROZEN
 * LandingPage.tsx (the Chat splash). Marks, icons, `.pxl-*` styles, SECTIONS/UTILITY
 * items and tokens are copied verbatim from that gold reference so the rail is
 * pixel-identical across the splash and the Studio. LandingPage keeps its own inline
 * rail — do NOT route it through this component (it is frozen).
 *
 * The Studio uses this rail as its leftmost column. The active creative section is
 * highlighted; the Pixcel-X mark (and the active item) navigate home to the splash.
 * ───────────────────────────────────────────────────────────────────────────── */

/* ── Iconography (Claude Design handoff): the Pixel-X mark + Lucide line icons
   (stroke 2, currentColor, viewBox 0 0 24 24). Art glyph is the `scribble` squiggle. ── */
function PixcelMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" shapeRendering="crispEdges" fill="currentColor" role="img" aria-label="Pixcel">
      <rect x="-0.5" y="-0.5" width="21" height="21" /><rect x="79.5" y="-0.5" width="21" height="21" />
      <rect x="19.5" y="19.5" width="21" height="21" /><rect x="59.5" y="19.5" width="21" height="21" />
      <rect x="39.5" y="39.5" width="21" height="21" />
      <rect x="19.5" y="59.5" width="21" height="21" /><rect x="59.5" y="59.5" width="21" height="21" />
      <rect x="-0.5" y="79.5" width="21" height="21" /><rect x="79.5" y="79.5" width="21" height="21" />
    </svg>
  );
}

type IconName = 'chat' | 'scribble' | 'image' | 'video' | 'export' | 'assets' | 'assistant' | 'user' | 'login' | 'settings' | 'sun' | 'moon' | 'logout';

const PATHS: Record<IconName, string[]> = {
  chat: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  scribble: ['M3.0 12.00L3.7 9.65L4.3 8.81L5.0 10.02L5.7 12.50L6.4 14.66L7.0 15.11L7.7 13.56L8.4 11.01L9.1 9.09L9.8 9.04L10.4 10.89L11.1 13.45L11.8 15.08L12.4 14.73L13.1 12.62L13.8 10.12L14.5 8.82L15.2 9.57L15.8 11.87L16.5 14.26L17.2 15.20L17.9 14.08L18.5 11.62L19.2 9.41L19.9 8.86L20.6 10.33L21.0 12.00'],
  image: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'm21 15-5-5L5 21'],
  video: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'm10 8 6 4-6 4z'],
  export: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 9l5-5 5 5', 'M12 4v12'],
  assets: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'm21 15-5-5L5 21'],
  assistant: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M15 3v18'],
  // Lucide `user` — avatar fallback glyph.
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  // Lucide `log-in` — the signed-out "Sign in" affordance.
  login: ['M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4', 'M10 17l5-5-5-5', 'M15 12H3'],
  // Lucide `settings` (gear) — opens the settings slide-over.
  settings: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  // Lucide `sun` — switch to light mode.
  sun: ['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  // Lucide `moon` — switch to dark mode.
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'],
  // Lucide `log-out` — sign out.
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
};

function Ic({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* Nav rail — Chat (the universal A2UI assistant / front door) + the creative mediums.
   NOTE: the pixel-art medium is DELIBERATELY NOT in the nav right now (Brian, 2026-07-06).
   It is Pixcel's PROPRIETARY IP (the reasoning-based pixel engine), not "just another model",
   and "Art" was a nonsense label for it. It returns later as its own named medium ("Pixel Art")
   once the platform is dialed in — we are NOT competing with image models via a generic "Art" tab.
   Current focus = the IMAGE medium/workflow. */
/* The interconnected-web SECTIONS. Assets is a first-class section (not a bottom utility) — it's the
   inventory that ties chat/image/video together. (Brian, 2026-07-16.) */
const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'image', label: 'Image', icon: 'image' },
  { id: 'video', label: 'Video', icon: 'video' },
  { id: 'assets', label: 'Assets', icon: 'assets' },
];

/* The `.pxl-*` rail styles, lifted verbatim from the frozen splash so the rail is
   identical wherever it's used. Scoped to .pxl-rail-scope to avoid colliding with the
   splash's own inline <style> (which scopes under .pxl-root). */
const RAIL_CSS = `
  .pxl-rail-scope { font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }
  /* Rail sits on the near-black cool-950 (Claude Design PrimaryNav) — NOT the lighter bg-primary,
     which washed the tertiary labels out ("light grey on medium grey"). */
  .pxl-rail { background: var(--a2ui-cool-950); border-right: 1px solid var(--a2ui-border-subtle); }
  .pxl-navbtn { color: var(--a2ui-text-tertiary); border-radius: var(--a2ui-radius-lg); transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); position: relative; }
  .pxl-navbtn:hover { color: var(--a2ui-text-secondary); background: var(--a2ui-bg-hover); }
  /* Active: subtle bg-active tint only (no left accent bar). */
  .pxl-navbtn[data-active="true"] { color: var(--a2ui-text-primary); background: var(--a2ui-bg-active); }
  .pxl-rail-mark { color: var(--a2ui-text-primary); border-radius: var(--a2ui-radius-lg); transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); }
  .pxl-rail-mark:hover { color: var(--a2ui-text-primary); background: var(--a2ui-bg-hover); }

  /* The rail's expand/collapse CONTROL (Projects) — deliberately NOT a nav item. It belongs to the
     rail, so it shares the rail's color language; but it must never read as a destination. Hence:
     a PILL (sections are rounded squares), no text label (sections are labelled), smaller, and an
     "open" state that OUTLINES rather than filling with the solid bg-active the sections use.
     A hairline below fences the control zone off from the destinations. */
  .pxl-railtoggle {
    color: var(--a2ui-text-tertiary); background: transparent;
    border: 1px solid transparent; border-radius: var(--a2ui-radius-full);
    transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast);
  }
  .pxl-railtoggle:hover { color: var(--a2ui-text-secondary); background: var(--a2ui-bg-hover); }
  .pxl-railtoggle[data-open="true"] { color: var(--a2ui-text-primary); border-color: var(--a2ui-border-default); background: transparent; }
  .pxl-rail-sep { width: 24px; height: 1px; background: var(--a2ui-border-subtle); }
  .pxl-avatar { width: 34px; height: 34px; border-radius: var(--a2ui-radius-full); border: 1px solid var(--a2ui-border-default); overflow: hidden; display: flex; align-items: center; justify-content: center; transition: border-color var(--a2ui-transition-fast); }
  .pxl-avatar:hover { border-color: var(--a2ui-border-strong); }
  .pxl-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pxl-avatar-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-secondary); font-size: 13px; font-weight: 500; text-transform: uppercase; }

  /* Account popover — floating chrome (gospel §glass): opens up + to the right of the avatar. */
  .pxl-pop {
    position: absolute; bottom: 0; left: calc(100% + 10px); width: 260px; z-index: 60;
    background: var(--a2ui-glass-dark, rgba(18,18,22,0.9)); backdrop-filter: blur(20px);
    border: 1px solid var(--pxs-glass-border, rgba(255,255,255,0.08)); border-radius: var(--a2ui-radius-xl);
    box-shadow: var(--a2ui-shadow-lg); padding: var(--a2ui-space-2);
    display: flex; flex-direction: column; gap: 2px;
  }
  .pxl-pop-head { display: flex; align-items: center; gap: var(--a2ui-space-3); padding: var(--a2ui-space-2) var(--a2ui-space-2) var(--a2ui-space-3); }
  .pxl-pop-avatar {
    width: 40px; height: 40px; flex-shrink: 0; border-radius: var(--a2ui-radius-full); overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-secondary);
    font-size: 15px; font-weight: 500; text-transform: uppercase;
  }
  .pxl-pop-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .pxl-pop-id { display: flex; flex-direction: column; min-width: 0; }
  .pxl-pop-name { font-size: var(--a2ui-text-md); color: var(--a2ui-text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pxl-pop-email { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pxl-pop-sep { height: 1px; background: var(--a2ui-border-subtle); margin: var(--a2ui-space-1) 0; }
  .pxl-pop-item {
    display: flex; align-items: center; gap: var(--a2ui-space-3); width: 100%; text-align: left;
    padding: var(--a2ui-space-2) var(--a2ui-space-3); border-radius: var(--a2ui-radius-md);
    background: transparent; color: var(--a2ui-text-primary); cursor: pointer;
    font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-md);
    transition: background var(--a2ui-transition-fast);
  }
  .pxl-pop-item:hover { background: var(--a2ui-bg-hover); }
  .pxl-pop-item > svg { color: var(--a2ui-text-secondary); flex-shrink: 0; }
  .pxl-pop-danger { color: var(--a2ui-error); }
  .pxl-pop-danger > svg { color: var(--a2ui-error); }
  .pxl-pop-danger:hover { background: var(--a2ui-error-bg); }
`;

/* The bottom rail slot: a "Sign in" affordance when signed out, otherwise the signed-in user's
   avatar (round, ~34px) that opens an account POPOVER (photolif pattern): account · theme toggle ·
   Settings · Sign out. Settings now lives here, not as a separate rail item. */
function UserAvatar({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { isAuthenticated, logout } = useAuth0();
  const { openLogin } = useLoginModal();
  // useCurrentUser merges BOTH sessions (Auth0 SDK + custom credentials).
  const user = useCurrentUser();
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the popover on outside-click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Signed out: a round "Sign in" button → opens our CUSTOM login modal.
  if (!user) {
    return (
      <button type="button" title="Sign in" onClick={openLogin} className="pxl-avatar">
        <span className="pxl-avatar-fallback">
          <Ic name="login" size={18} />
        </span>
      </button>
    );
  }

  // Logout tears down BOTH sessions: clear the credentials session, then Auth0 SDK logout if present.
  const handleLogout = () => {
    setOpen(false);
    clearCredentialsSession();
    if (isAuthenticated) {
      logout({ logoutParams: { returnTo: window.location.origin } });
    }
  };

  const name = (user.name || user.firstName || '').trim();
  const email = (user.email || '').trim();
  const initial = (user.firstName || user.name || user.email || '').trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        title={name || email || 'Account'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="pxl-avatar"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" />
        ) : (
          <span className="pxl-avatar-fallback">{initial || <Ic name="user" size={18} />}</span>
        )}
      </button>

      {open && (
        <div className="pxl-pop" role="menu">
          <div className="pxl-pop-head">
            <span className="pxl-pop-avatar">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initial || <Ic name="user" size={16} />}
            </span>
            <span className="pxl-pop-id">
              <span className="pxl-pop-name">{name || email || 'Account'}</span>
              {email && <span className="pxl-pop-email">{email}</span>}
            </span>
          </div>

          <div className="pxl-pop-sep" />

          <button
            type="button"
            role="menuitem"
            className="pxl-pop-item"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Ic name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="pxl-pop-item"
            onClick={() => {
              setOpen(false);
              onOpenSettings?.();
            }}
          >
            <Ic name="settings" size={18} />
            Settings
          </button>

          <div className="pxl-pop-sep" />

          <button type="button" role="menuitem" className="pxl-pop-item pxl-pop-danger" onClick={handleLogout}>
            <Ic name="logout" size={18} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

interface NavRailProps {
  /** The active creative section in the current shell (e.g. 'art' for the Pixel Art studio). */
  activeSection?: string;
  /** Return to the splash (the Chat home). Wired to the Pixcel-X mark + the active Chat item. */
  onHome?: () => void;
  /** Click on a section (other than the active one). Defaults to onHome so non-active
      sections route back to the splash, matching the splash's own rail behavior. */
  onSection?: (id: string) => void;
  /** Click on a utility item (Export / Assets / Assistant). */
  onUtility?: (id: string) => void;
  /** Which utility item is currently "on" (e.g. 'assets' while the Assets panel is open). */
  activeUtility?: string;
  /** Optional count badges per utility id (e.g. { assets: 12 } → the unified Assets catalog size). */
  utilityBadges?: Partial<Record<string, number>>;
  /** Open the settings slide-over (the gear affordance above the avatar). */
  onOpenSettings?: () => void;
  /** Toggle the Projects list panel (the » affordance under the mark). */
  onToggleProjects?: () => void;
  /** Whether the Projects panel is currently open (highlights the » affordance). */
  projectsOpen?: boolean;
}

export default function NavRail({ activeSection = 'chat', onHome, onSection, onOpenSettings, onToggleProjects, projectsOpen }: NavRailProps) {
  const handleSection = (id: string) => {
    if (id === 'chat') return onHome?.();
    (onSection ?? (() => onHome?.()))(id);
  };
  return (
    <nav className="pxl-rail-scope pxl-rail flex flex-col items-center w-[72px] py-4 shrink-0">
      <style>{RAIL_CSS}</style>
      <button onClick={onHome} title="Home — back to Chat" className="pxl-rail-mark mb-3 flex h-10 w-10 items-center justify-center">
        <PixcelMark size={22} />
      </button>

      {/* Projects toggle — docked under the mark, in the rail's CONTROL zone (see .pxl-railtoggle):
          part of the rail, but visibly not a nav item. The hairline separates control from destinations. */}
      {onToggleProjects && (
        <>
          <button
            onClick={onToggleProjects}
            data-open={projectsOpen ? 'true' : 'false'}
            aria-expanded={projectsOpen}
            title={projectsOpen ? 'Close projects' : 'Projects'}
            className="pxl-railtoggle flex h-7 w-9 items-center justify-center text-lg font-semibold leading-none"
          >
            {projectsOpen ? '«' : '»'}
          </button>
          <div className="pxl-rail-sep my-3" />
        </>
      )}

      <div className="flex flex-col gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSection(s.id)}
            data-active={s.id === activeSection}
            title={s.label}
            className="pxl-navbtn flex flex-col items-center gap-1 w-14 py-2"
          >
            <Ic name={s.icon} size={20} />
            <span className="text-[10px] font-medium">{s.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-auto" />

      {/* FUTURE: Alerts/notification icon goes HERE (above the avatar), with a push-style unread
          badge dot on the avatar below. For now just the avatar — Settings lives in its popover. */}
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <UserAvatar onOpenSettings={onOpenSettings} />
      </div>
    </nav>
  );
}
