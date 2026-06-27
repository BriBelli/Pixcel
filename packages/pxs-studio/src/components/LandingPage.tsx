'use client';

import { useState, useEffect } from 'react';

interface Props {
  onEnter: () => void;
}

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

type IconName =
  | 'scribble' | 'image' | 'video' | 'anim' | 'export' | 'assets' | 'assistant'
  | 'send' | 'plus' | 'layers' | 'sparkles' | 'maximize';

const PATHS: Record<IconName, string[]> = {
  scribble: ['M3.0 12.00L3.7 9.65L4.3 8.81L5.0 10.02L5.7 12.50L6.4 14.66L7.0 15.11L7.7 13.56L8.4 11.01L9.1 9.09L9.8 9.04L10.4 10.89L11.1 13.45L11.8 15.08L12.4 14.73L13.1 12.62L13.8 10.12L14.5 8.82L15.2 9.57L15.8 11.87L16.5 14.26L17.2 15.20L17.9 14.08L18.5 11.62L19.2 9.41L19.9 8.86L20.6 10.33L21.0 12.00'],
  image: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'm21 15-5-5L5 21'],
  video: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'm10 8 6 4-6 4z'],
  anim: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  export: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 9l5-5 5 5', 'M12 4v12'],
  assets: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'm21 15-5-5L5 21'],
  assistant: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M15 3v18'],
  send: ['M5 12h14', 'm12 5 7 7-7 7'],
  plus: ['M5 12h14', 'M12 5v14'],
  layers: ['M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z', 'm22 12.07-9.17 4.18a2 2 0 0 1-1.66 0L2 12.07', 'm22 17.07-9.17 4.18a2 2 0 0 1-1.66 0L2 17.07'],
  sparkles: ['M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z', 'M20 3v4', 'M22 5h-4', 'M4 17v2', 'M5 18H3'],
  maximize: ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3'],
};

function Ic({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* Nav rail — primary media sections + bottom utility cluster. NOTE: on the splash/root,
   no section is active (home = the X mark); items only highlight once you enter one. */
const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'art', label: 'Art', icon: 'scribble' },
  { id: 'image', label: 'Image', icon: 'image' },
  { id: 'video', label: 'Video', icon: 'video' },
  { id: 'anim', label: 'Anim', icon: 'anim' },
];
const UTILITY: { id: string; label: string; icon: IconName }[] = [
  { id: 'export', label: 'Export', icon: 'export' },
  { id: 'assets', label: 'Assets', icon: 'assets' },
  { id: 'assistant', label: 'Assistant', icon: 'assistant' },
];

/* Rotating starting-point examples. NOT the limit — the agent can find or SYNTHESIZE
   any workflow from the prompt bar (see docs/PIXCEL-UNIFICATION-PLAN.md, emergent workflows). */
const WORKFLOWS: { id: string; icon: IconName; title: string; body: string }[] = [
  { id: 'art', icon: 'scribble', title: 'Pixel art', body: 'Sculpted live by the autonomous artisan, cell by cell.' },
  { id: 'image', icon: 'image', title: 'Image', body: 'Generate across many top models, then refine in Studio.' },
  { id: 'video', icon: 'video', title: 'Video', body: 'Direct a short clip or animation from a single prompt.' },
  { id: 'character', icon: 'layers', title: 'Character set', body: 'One subject, consistent across every pose and angle.' },
  { id: 'story', icon: 'anim', title: 'Multi-image story', body: 'A narrative or steps across a coherent set.' },
  { id: 'style', icon: 'sparkles', title: 'Style bursts', body: 'One image rendered across many styles at once.' },
  { id: 'storyboard', icon: 'layers', title: 'Storyboard', body: 'Pre-vis grids and comic strips that feed video.' },
  { id: 'upscale', icon: 'maximize', title: 'Upscale & enhance', body: 'Higher resolution and crisper detail for print.' },
  { id: 'logo', icon: 'sparkles', title: 'Logo & marks', body: 'Clean, original marks that scale to any size.' },
];
const PAGES: typeof WORKFLOWS[] = [];
for (let i = 0; i < WORKFLOWS.length; i += 3) PAGES.push(WORKFLOWS.slice(i, i + 3));

export default function LandingPage({ onEnter }: Props) {
  const [draft, setDraft] = useState('');
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  // gentle auto-advance of the carousel, paused on hover
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setPage((p) => (p + 1) % PAGES.length), 6000);
    return () => clearTimeout(t);
  }, [page, paused]);

  return (
    <div className="pxl-root flex h-screen overflow-hidden">
      <style>{`
        .pxl-root { background: var(--a2ui-bg-app); color: var(--a2ui-text-primary); font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }
        .pxl-root ::selection { background: var(--a2ui-accent-subtle); }
        .pxl-gridbg { background-image: linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px); background-size:28px 28px; -webkit-mask-image:radial-gradient(circle at 50% 34%,black,transparent 70%); mask-image:radial-gradient(circle at 50% 34%,black,transparent 70%); }
        .pxl-rail { background: var(--a2ui-bg-primary); border-right: 1px solid var(--a2ui-border-subtle); }
        .pxl-navbtn { color: var(--a2ui-text-tertiary); border-radius: var(--a2ui-radius-lg); transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); position: relative; }
        .pxl-navbtn:hover { color: var(--a2ui-text-secondary); background: var(--a2ui-bg-hover); }
        .pxl-secondary { color: var(--a2ui-text-secondary); }
        .pxl-tertiary { color: var(--a2ui-text-tertiary); }
        /* hero prompt bar — simple Google-style single search */
        .pxl-promptbar { background: var(--a2ui-bg-input); border: 1px solid var(--a2ui-border-default); transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast); }
        .pxl-promptbar:focus-within { border-color: var(--a2ui-accent); box-shadow: 0 0 0 3px var(--a2ui-accent-subtle); }
        .pxl-input { background: transparent; color: var(--a2ui-text-primary); }
        .pxl-input::placeholder { color: var(--a2ui-text-tertiary); }
        .pxl-iconbtn { color: var(--a2ui-text-tertiary); border-radius: 9999px; transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); }
        .pxl-iconbtn:hover { color: var(--a2ui-text-secondary); background: var(--a2ui-bg-hover); }
        .pxl-send { background: var(--a2ui-accent); color: var(--a2ui-text-inverse); border-radius: 9999px; transition: background var(--a2ui-transition-fast); }
        .pxl-send:hover { background: var(--a2ui-accent-hover); }
        .pxl-chip { background: var(--a2ui-bg-secondary); border: 1px solid var(--a2ui-border-default); color: var(--a2ui-text-secondary); border-radius: var(--a2ui-radius-full); transition: border-color var(--a2ui-transition-fast), color var(--a2ui-transition-fast); }
        .pxl-chip:hover { border-color: var(--a2ui-border-strong); color: var(--a2ui-text-primary); }
        .pxl-card { background: var(--a2ui-bg-tertiary); border: 1px solid transparent; border-radius: var(--a2ui-radius-lg); transition: background var(--a2ui-transition-normal), border-color var(--a2ui-transition-normal), box-shadow var(--a2ui-transition-normal); text-align:left; }
        .pxl-card:hover { background: var(--a2ui-bg-secondary); border-color: var(--a2ui-border-default); box-shadow: var(--a2ui-shadow-sm); }
        .pxl-card-ic { background: var(--a2ui-bg-elevated); color: var(--a2ui-text-tertiary); border-radius: 9px; transition: background var(--a2ui-transition-normal), color var(--a2ui-transition-normal); }
        .pxl-card:hover .pxl-card-ic { background: var(--a2ui-accent-subtle); color: var(--pxs-accent-text); }
        .pxl-dot { background: var(--a2ui-border-strong); transition: width var(--a2ui-transition-normal), background var(--a2ui-transition-normal); }
        .pxl-dot[data-on="true"] { background: var(--a2ui-text-secondary); }
        @keyframes pxlFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .pxl-fade { animation: pxlFade 300ms var(--a2ui-ease-entrance); }
      `}</style>

      {/* Primary nav rail */}
      <nav className="pxl-rail flex flex-col items-center w-[72px] py-4 shrink-0">
        <div className="pxl-secondary mb-6"><PixcelMark size={22} /></div>
        <div className="flex flex-col gap-1.5">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={onEnter} title={s.label} className="pxl-navbtn flex flex-col items-center gap-1 w-14 py-2">
              <Ic name={s.icon} size={20} />
              <span className="text-[10px] font-medium">{s.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-1.5">
          {UTILITY.map((s) => (
            <button key={s.id} onClick={onEnter} title={s.label} className="pxl-navbtn flex flex-col items-center gap-1 w-14 py-2">
              <Ic name={s.icon} size={18} />
              <span className="text-[10px] font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main column */}
      <div className="relative flex-1 flex flex-col min-w-0">
        <div className="pxl-gridbg pointer-events-none absolute inset-0" />

        <div className="relative flex-1 flex flex-col items-center justify-center px-6">
          {/* The ask */}
          <h1 style={{ margin: 0, fontSize: 'clamp(28px, 3.6vw, 36px)', fontWeight: 400, letterSpacing: '-0.01em', textAlign: 'center' }}>
            What do you want to make?
          </h1>

          {/* Hero prompt bar — Google-style single search; placeholder carries the supporting text */}
          <form
            onSubmit={(e) => { e.preventDefault(); onEnter(); }}
            className="pxl-promptbar mt-7 flex w-full max-w-2xl items-center gap-2 rounded-full px-3.5 py-2.5"
          >
            <button type="button" onClick={onEnter} className="pxl-iconbtn flex h-9 w-9 items-center justify-center shrink-0" title="Attach"><Ic name="plus" size={20} /></button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask me anything, or describe a piece to create…"
              className="pxl-input min-w-0 flex-1 text-[15px] outline-none"
            />
            <button type="submit" className="pxl-send flex h-9 w-9 items-center justify-center shrink-0" title="Send"><Ic name="send" size={16} /></button>
          </form>

          {/* Rotating starting-point cards */}
          <div
            className="mt-10 w-full max-w-3xl"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div key={page} className="pxl-fade flex flex-wrap justify-center gap-3">
              {PAGES[page].map((c) => (
                <button key={c.id} onClick={onEnter} className="pxl-card group flex w-[212px] flex-col gap-[9px] px-4 py-[15px]">
                  <span className="pxl-card-ic inline-flex h-8 w-8 items-center justify-center"><Ic name={c.icon} size={17} /></span>
                  <span className="font-semibold" style={{ fontSize: 13.5, letterSpacing: '-0.01em' }}>{c.title}</span>
                  <span className="pxl-tertiary line-clamp-2" style={{ fontSize: 11.5, lineHeight: 1.45 }}>{c.body}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {PAGES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  data-on={i === page}
                  aria-label={`Page ${i + 1}`}
                  className="pxl-dot rounded-full"
                  style={{ height: 6, width: i === page ? 20 : 6 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
