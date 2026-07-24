"use client";

import AccountAvatar from "./AccountAvatar";

/* ─────────────────────────────────────────────────────────────────────────────
 * NavRail — the primary switcher: Chat · Image · Video · Projects · Assets, + the account avatar.
 *
 * The rail itself is NOT a panel — just a floating absolutely-positioned BLUR strip (no fill, no
 * border). Items float on it; the ACTIVE item is the only thing that pops (its 2px brand-gradient
 * border). Projects is a normal nav item (folder) that opens the projects popover — no chevron.
 *
 * Layout, top → bottom:  MARK · nav items · AVATAR (bottom). Shared by splash + chat shell.
 * ───────────────────────────────────────────────────────────────────────────── */

/* ── Iconography (Claude Design handoff): the Pixel-X mark + Lucide line icons
   (stroke 2, currentColor, viewBox 0 0 24 24). Art glyph is the `scribble` squiggle. ── */
function PixcelMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      shapeRendering="crispEdges"
      fill="currentColor"
      role="img"
      aria-label="Pixcel"
    >
      <rect x="-0.5" y="-0.5" width="21" height="21" />
      <rect x="79.5" y="-0.5" width="21" height="21" />
      <rect x="19.5" y="19.5" width="21" height="21" />
      <rect x="59.5" y="19.5" width="21" height="21" />
      <rect x="39.5" y="39.5" width="21" height="21" />
      <rect x="19.5" y="59.5" width="21" height="21" />
      <rect x="59.5" y="59.5" width="21" height="21" />
      <rect x="-0.5" y="79.5" width="21" height="21" />
      <rect x="79.5" y="79.5" width="21" height="21" />
    </svg>
  );
}

type IconName = "chat" | "image" | "video" | "projects" | "assets";

const PATHS: Record<IconName, string[]> = {
  chat: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  image: [
    "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    "M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    "m21 15-5-5L5 21",
  ],
  video: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "m10 8 6 4-6 4z"],
  assets: [
    "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    "M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    "m21 15-5-5L5 21",
  ],
  // Lucide `folder` — the Projects panel entry (a real nav item, not a toggle chevron).
  projects: [
    "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z",
  ],
};

function Ic({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
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
type NavItem = { id: string; label: string; icon: IconName };
/* TOP group — the creative mediums. */
const SECTIONS_TOP: NavItem[] = [
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "image", label: "Image", icon: "image" },
  { id: "video", label: "Video", icon: "video" },
];
/* BOTTOM group — Projects + Assets, grouped with the avatar at the foot of the rail. */
const SECTIONS_BOTTOM: NavItem[] = [
  { id: "projects", label: "Projects", icon: "projects" },
  { id: "assets", label: "Assets", icon: "assets" },
];

/* The `.pxl-*` rail styles, lifted verbatim from the frozen splash so the rail is
   identical wherever it's used. Scoped to .pxl-rail-scope to avoid colliding with the
   splash's own inline <style> (which scopes under .pxl-root). */
const RAIL_CSS = `
  .pxl-rail-scope { font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }

  /* The rail — a frosted-glass column (base-matched fill + blur). The right-edge hairline is what
     makes it read as a SURFACE: glass with no stroke is just a blurred nothing, and over a living
     backdrop it disappears entirely. */
  .pxl-rail {
    position: absolute; top: 0; bottom: 0; left: 0;
    width: var(--pxs-rail-w); z-index: 30;
    padding: var(--pxs-rail-gap);
    background: var(--pxc-bg-glass-veil);
    border-right: 1px solid var(--pxc-stroke-subtle);
    backdrop-filter: var(--pxc-glass-filter); -webkit-backdrop-filter: var(--pxc-glass-filter);
  }

  /* Nav item — ONE rule. The 2px transparent border reserves the active gradient ring's space. */
  .pxl-navbtn {
    position: relative; height: 46px;
    color: var(--a2ui-text-tertiary);
    border: 1px solid transparent; border-radius: var(--a2ui-radius-md);
    transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast);
  }
  .pxl-navbtn:hover { color: var(--a2ui-text-primary); background: var(--a2ui-bg-hover); }

  /* 10px was below the legibility floor for this weight/color pairing. 11px + the brighter dim
     token + a touch of positive tracking (small type wants the opposite of large type). */
  .pxl-navbtn-label { font-size: 11px; letter-spacing: 0.01em; }

  /* Active item — glass chip + a 2px brand-gradient ring (masked ::before, so the fill stays glass). */
  .pxl-navbtn[data-active="true"] {
    color: var(--a2ui-text-primary);
    background: var(--pxc-bg-glass-frost);
    backdrop-filter: var(--pxc-glass-filter); -webkit-backdrop-filter: var(--pxc-glass-filter);
  }
  .pxl-navbtn[data-active="true"]::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
    background: linear-gradient(to bottom, var(--pxs-nav-edge-from), var(--pxs-nav-edge-to));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    pointer-events: none;
  }

  /* Logo mark. */
  .pxl-rail-mark {
    color: var(--a2ui-text-primary); border-radius: var(--a2ui-radius-lg);
    transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast);
  }
  .pxl-rail-mark:hover { color: var(--a2ui-text-primary); background: var(--a2ui-bg-hover); }
`;

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
  /** Toggle the Projects list panel (the » affordance under the mark). */
  onToggleProjects?: () => void;
  /** Whether the Projects panel is currently open (highlights the » affordance). */
  projectsOpen?: boolean;
  /** Open the settings slide-over (from the bottom avatar's account popover). */
  onOpenSettings?: () => void;
}

export default function NavRail({
  activeSection = "chat",
  onHome,
  onSection,
  onToggleProjects,
  projectsOpen,
  onOpenSettings,
}: NavRailProps) {
  const handleSection = (id: string) => {
    if (id === "projects") return onToggleProjects?.();
    if (id === "chat") return onHome?.();
    (onSection ?? (() => onHome?.()))(id);
  };
  const renderItem = (s: NavItem) => (
    <button
      key={s.id}
      onClick={() => handleSection(s.id)}
      data-active={
        s.id === "projects" ? Boolean(projectsOpen) : s.id === activeSection
      }
      title={s.label}
      className="pxl-navbtn flex flex-col items-center justify-center gap-0.5 w-12"
    >
      <Ic name={s.icon} size={20} />
      {/* leading-none: the label's line box would otherwise push the icon+label group off optical
          centre. Size/tracking live in .pxl-navbtn-label. */}
      <span className="pxl-navbtn-label font-medium leading-none">{s.label}</span>
    </button>
  );
  // The rail IS one glass column: MARK (top) · nav items (stacked) · AVATAR (bottom, mt-auto).
  // No inner boxes — items sit directly on the glass. See .pxl-rail (+ .pxc-glass).
  return (
    <nav className="pxl-rail-scope pxl-rail flex flex-col items-center">
      <style>{RAIL_CSS}</style>

      <button
        onClick={onHome}
        title="Home — back to Chat"
        className="pxl-rail-mark mb-2 flex h-11 w-11 items-center justify-center"
      >
        <PixcelMark size={26} />
      </button>

      {/* TOP group — the creative mediums. */}
      <div className="pxl-rail-group pxl-rail-group--top flex flex-col items-center gap-1.5">
        {SECTIONS_TOP.map(renderItem)}
      </div>

      {/* BOTTOM group — Projects · Assets · Avatar, pushed to the foot of the rail (mt-auto). */}
      <div className="pxl-rail-group pxl-rail-group--bottom mt-auto flex flex-col items-center gap-1.5">
        {SECTIONS_BOTTOM.map(renderItem)}
        <div className="pxl-rail-account pt-1">
          <AccountAvatar onOpenSettings={onOpenSettings} />
        </div>
      </div>
    </nav>
  );
}
