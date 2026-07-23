"use client";

import AccountAvatar from "./AccountAvatar";

/* ─────────────────────────────────────────────────────────────────────────────
 * NavRail — the primary app-feature switcher (Chat · Image · Video · Assets), the
 * Projects control, and the account avatar pinned at the BOTTOM. Three persistent
 * top-level surfaces: the mark, the glass nav pane, and the glass avatar.
 *
 * IT FLOATS. The rail is absolutely positioned over the digital wall + content and
 * reserves NO layout column, so the canvas runs full-bleed beneath it. Everything is
 * transparent except ONE surface — `.primary-nav-container`, a card with a brand-lit
 * gradient edge (tokens: --pxs-nav-edge-from/-to).
 *
 * Layout, top → bottom:  MARK (top) · nav container (vertically centred).
 *
 * Shared by BOTH the splash and the chat shell, so the two are identical by construction.
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

type IconName =
  | "chat"
  | "image"
  | "video"
  | "assets"
  | "chevronsRight"
  | "chevronsLeft";

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
  // Lucide `moon` — switch to dark mode.
  // Lucide `chevrons-right` / `chevrons-left` — the Projects panel open/close control.
  chevronsRight: ["m6 17 5-5-5-5", "m13 17 5-5-5-5"],
  chevronsLeft: ["m11 17-5-5 5-5", "m18 17-5-5 5-5"],
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
const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "image", label: "Image", icon: "image" },
  { id: "video", label: "Video", icon: "video" },
  { id: "assets", label: "Assets", icon: "assets" },
];

/* The `.pxl-*` rail styles, lifted verbatim from the frozen splash so the rail is
   identical wherever it's used. Scoped to .pxl-rail-scope to avoid colliding with the
   splash's own inline <style> (which scopes under .pxl-root). */
const RAIL_CSS = `
  .pxl-rail-scope { font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }
  /* THE RAIL *IS* THE GLASS PANEL. A single floating glass column (Brian's tested pattern via
     .pxc-glass) — it OVERLAYS the wall + content and lets them show through the blur; content pads
     itself clear (--pxs-rail-space). No inner boxed card, no drop shadow — just this one pane.
     Inset from the viewport edges so its 25px radius reads as a floating column. */
  .pxl-rail {
    position: absolute;
    top: var(--pxs-rail-inset); bottom: var(--pxs-rail-inset); left: var(--pxs-rail-inset);
    width: var(--pxs-rail-w); z-index: 30;
    border-radius: 16px;
    padding: 12px 0;
  }
  .pxl-navbtn { color: var(--a2ui-text-tertiary); border: 2px solid transparent; border-radius: var(--a2ui-radius-lg); transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); position: relative; }
  /* ONE shared height for every rail button so the label-less Projects control lines up EXACTLY
     with the labelled section items (py-2 + icon 20 + gap 4 + 10px label ≈ 52px). Both reference
     this single rule, so they can never drift apart. */
  .pxl-navbtn, .pxl-railtoggle { height: 52px; }
  .pxl-navbtn:hover { color: var(--a2ui-text-secondary); background: var(--a2ui-bg-hover); }
  /* Active: a 2px BRAND-GRADIENT border (Brian's background-clip technique). Layer 1 (padding-box)
     is the opaque dark chip fill; layer 2 (border-box) is the gradient, showing only in the 2px ring.
     Gradient tokenised (--pxs-nav-edge-*) → one-line swap. */
  .pxl-navbtn[data-active="true"] {
    color: var(--a2ui-text-primary);
    background-image:
      linear-gradient(var(--a2ui-bg-secondary), var(--a2ui-bg-secondary)),
      linear-gradient(to bottom, var(--pxs-nav-edge-from), var(--pxs-nav-edge-to));
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }
  .pxl-rail-mark { color: var(--a2ui-text-primary); border-radius: var(--a2ui-radius-lg); transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); }
  .pxl-rail-mark:hover { color: var(--a2ui-text-primary); background: var(--a2ui-bg-hover); }

  /* The rail's expand/collapse CONTROL (Projects). It shares the section items' footprint, radius
     and hover/active language so it clearly BELONGS to the rail — the distinction is carried by
     having NO text label and a slightly LARGER icon, which reads as a control rather than a
     destination without needing a different shape. */
  .pxl-railtoggle {
    color: var(--a2ui-text-tertiary); background: transparent;
    border-radius: var(--a2ui-radius-lg);
    transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast);
  }
  .pxl-railtoggle:hover { color: var(--a2ui-text-secondary); background: var(--a2ui-bg-hover); }
  .pxl-railtoggle[data-open="true"] { color: var(--a2ui-text-primary); background: var(--a2ui-bg-active); }

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
    if (id === "chat") return onHome?.();
    (onSection ?? (() => onHome?.()))(id);
  };
  // The rail IS one glass column: MARK (top) · nav items (stacked) · AVATAR (bottom, mt-auto).
  // No inner boxes — items sit directly on the glass. See .pxl-rail (+ .pxc-glass).
  return (
    <nav className="pxl-rail-scope pxl-rail pxc-glass flex flex-col items-center">
      <style>{RAIL_CSS}</style>

      <button
        onClick={onHome}
        title="Home — back to Chat"
        className="pxl-rail-mark mb-2 flex h-11 w-11 items-center justify-center"
      >
        <PixcelMark size={26} />
      </button>

      {/* Nav items stacked directly on the glass — projects control, then the sections. */}
      <div className="flex flex-col items-center gap-1.5">
        {onToggleProjects && (
          <button
            onClick={onToggleProjects}
            data-open={projectsOpen ? "true" : "false"}
            aria-expanded={projectsOpen}
            title={projectsOpen ? "Close projects" : "Projects"}
            className="pxl-railtoggle flex w-14 items-center justify-center"
          >
            <Ic name={projectsOpen ? "chevronsLeft" : "chevronsRight"} size={24} />
          </button>
        )}

        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSection(s.id)}
            data-active={s.id === activeSection}
            title={s.label}
            className="pxl-navbtn flex flex-col items-center justify-center gap-1 w-14"
          >
            <Ic name={s.icon} size={20} />
            {/* leading-none: an arbitrary text size sets NO line-height, so the label inherited a
                taller line box whose extra leading pushed the icon+label group off optical centre. */}
            <span className="text-[10px] font-medium leading-none">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Account avatar — pushed to the BOTTOM of the glass column (mt-auto). */}
      <div className="mt-auto pt-3">
        <AccountAvatar onOpenSettings={onOpenSettings} />
      </div>
    </nav>
  );
}
