'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useCurrentUser } from '../lib/use-current-user';
import { useLoginModal } from './LoginModalProvider';
import { clearCredentialsSession } from '../lib/credentials-auth';

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

type IconName = 'chat' | 'scribble' | 'image' | 'video' | 'export' | 'assets' | 'assistant' | 'user' | 'login';

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
};

function Ic({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* Nav rail — Chat (the universal A2UI assistant) + the creative studios.
   Verbatim from the frozen LandingPage.tsx. */
const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'art', label: 'Art', icon: 'scribble' },
  { id: 'image', label: 'Image', icon: 'image' },
  { id: 'video', label: 'Video', icon: 'video' },
];
const UTILITY: { id: string; label: string; icon: IconName }[] = [
  { id: 'export', label: 'Export', icon: 'export' },
  { id: 'assets', label: 'Assets', icon: 'assets' },
  { id: 'assistant', label: 'Assistant', icon: 'assistant' },
];

/* The `.pxl-*` rail styles, lifted verbatim from the frozen splash so the rail is
   identical wherever it's used. Scoped to .pxl-rail-scope to avoid colliding with the
   splash's own inline <style> (which scopes under .pxl-root). */
const RAIL_CSS = `
  .pxl-rail-scope { font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }
  .pxl-rail { background: var(--a2ui-bg-primary); border-right: 1px solid var(--a2ui-border-subtle); }
  .pxl-navbtn { color: var(--a2ui-text-tertiary); border-radius: var(--a2ui-radius-lg); transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); position: relative; }
  .pxl-navbtn:hover { color: var(--a2ui-text-secondary); background: var(--a2ui-bg-hover); }
  .pxl-navbtn[data-active="true"] { color: var(--a2ui-text-primary); background: var(--a2ui-bg-tertiary); }
  .pxl-rail-mark { color: var(--a2ui-text-secondary); border-radius: var(--a2ui-radius-lg); transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); }
  .pxl-rail-mark:hover { color: var(--a2ui-text-primary); background: var(--a2ui-bg-hover); }
  .pxl-avatar { width: 34px; height: 34px; border-radius: var(--a2ui-radius-full); border: 1px solid var(--a2ui-border-default); overflow: hidden; display: flex; align-items: center; justify-content: center; transition: border-color var(--a2ui-transition-fast); }
  .pxl-avatar:hover { border-color: var(--a2ui-border-strong); }
  .pxl-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pxl-avatar-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-secondary); font-size: 13px; font-weight: 500; text-transform: uppercase; }
`;

/* The bottom rail slot: a "Sign in" affordance when signed out, otherwise the
   signed-in user's avatar (round, ~34px). Avatar shows the user's picture when
   present, else a graceful fallback (their initial, else a Lucide `user` glyph). */
function UserAvatar() {
  const { isAuthenticated, logout } = useAuth0();
  const { openLogin } = useLoginModal();
  // useCurrentUser merges BOTH sessions (Auth0 SDK + custom credentials), so the
  // avatar reflects a credentials login too — not just Auth0 redirect flows.
  const user = useCurrentUser();

  // Signed out: a round "Sign in" button → opens our CUSTOM login modal
  // (overlays whichever shell is on screen, via LoginModalProvider).
  if (!user) {
    return (
      <button
        type="button"
        title="Sign in"
        onClick={openLogin}
        className="pxl-avatar"
      >
        <span className="pxl-avatar-fallback">
          <Ic name="login" size={18} />
        </span>
      </button>
    );
  }

  // Signed in: the avatar. Clicking it logs out for now.
  // TODO(auth): replace this with a fuller account menu (profile, settings,
  // sign out) — a later task. For now a click signs the user out directly.
  //
  // Logout must tear down BOTH sessions: clear the custom credentials session
  // first, then run the Auth0 SDK logout when there's an SDK session (it
  // redirects). When there's only a credentials session, clearing it is enough —
  // useCurrentUser re-renders the rail back to "Sign in".
  const handleLogout = () => {
    clearCredentialsSession();
    if (isAuthenticated) {
      logout({ logoutParams: { returnTo: window.location.origin } });
    }
  };

  const initial = (user?.firstName || user?.name || '').trim().charAt(0);
  return (
    <button
      type="button"
      title={user?.name || user?.firstName || 'Sign out'}
      onClick={handleLogout}
      className="pxl-avatar"
    >
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" />
      ) : (
        <span className="pxl-avatar-fallback">
          {initial ? initial : <Ic name="user" size={18} />}
        </span>
      )}
    </button>
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
}

export default function NavRail({ activeSection = 'art', onHome, onSection, onUtility }: NavRailProps) {
  const handleSection = (id: string) => {
    if (id === 'chat') return onHome?.();
    (onSection ?? (() => onHome?.()))(id);
  };
  return (
    <nav className="pxl-rail-scope pxl-rail flex flex-col items-center w-[72px] py-4 shrink-0">
      <style>{RAIL_CSS}</style>
      <button onClick={onHome} title="Home — back to Chat" className="pxl-rail-mark mb-6 flex h-10 w-10 items-center justify-center">
        <PixcelMark size={22} />
      </button>
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
      <div className="mt-auto flex flex-col gap-1.5">
        {UTILITY.map((s) => (
          <button
            key={s.id}
            onClick={() => onUtility?.(s.id)}
            title={s.label}
            className="pxl-navbtn flex flex-col items-center gap-1 w-14 py-2"
          >
            <Ic name={s.icon} size={18} />
            <span className="text-[10px] font-medium">{s.label}</span>
          </button>
        ))}
      </div>

      {/* FUTURE: Alerts/notification icon goes HERE (above the avatar), with a
          push-style unread badge dot rendered on the avatar below. Not built yet —
          for now just the avatar. */}
      <div className="mt-3 flex flex-col items-center">
        <UserAvatar />
      </div>
    </nav>
  );
}
