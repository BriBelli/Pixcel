'use client';

import { useState } from 'react';

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

type IconName = 'chat' | 'scribble' | 'image' | 'video' | 'anim' | 'export' | 'assets' | 'assistant' | 'send' | 'plus';

const PATHS: Record<IconName, string[]> = {
  chat: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  scribble: ['M3.0 12.00L3.7 9.65L4.3 8.81L5.0 10.02L5.7 12.50L6.4 14.66L7.0 15.11L7.7 13.56L8.4 11.01L9.1 9.09L9.8 9.04L10.4 10.89L11.1 13.45L11.8 15.08L12.4 14.73L13.1 12.62L13.8 10.12L14.5 8.82L15.2 9.57L15.8 11.87L16.5 14.26L17.2 15.20L17.9 14.08L18.5 11.62L19.2 9.41L19.9 8.86L20.6 10.33L21.0 12.00'],
  image: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'm21 15-5-5L5 21'],
  video: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'm10 8 6 4-6 4z'],
  anim: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  export: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 9l5-5 5 5', 'M12 4v12'],
  assets: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'm21 15-5-5L5 21'],
  assistant: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M15 3v18'],
  send: ['M5 12h14', 'm12 5 7 7-7 7'],
  plus: ['M5 12h14', 'M12 5v14'],
};

function Ic({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* Nav rail — Chat (the universal A2UI assistant, default splash) + the creative studios.
   On the splash you're in Chat, so Chat carries the active state. */
const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
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

export default function LandingPage({ onEnter }: Props) {
  const [draft, setDraft] = useState('');

  return (
    <div className="pxl-root flex h-screen overflow-hidden">
      <style>{`
        .pxl-root { background: var(--a2ui-bg-app); color: var(--a2ui-text-primary); font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }
        .pxl-root ::selection { background: var(--a2ui-accent-subtle); }
        .pxl-gridbg { background-image: linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px); background-size:28px 28px; -webkit-mask-image:radial-gradient(circle at 50% 34%,black,transparent 70%); mask-image:radial-gradient(circle at 50% 34%,black,transparent 70%); }
        .pxl-rail { background: var(--a2ui-bg-primary); border-right: 1px solid var(--a2ui-border-subtle); }
        .pxl-navbtn { color: var(--a2ui-text-tertiary); border-radius: var(--a2ui-radius-lg); transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); position: relative; }
        .pxl-navbtn:hover { color: var(--a2ui-text-secondary); background: var(--a2ui-bg-hover); }
        .pxl-navbtn[data-active="true"] { color: var(--a2ui-text-primary); background: var(--a2ui-bg-tertiary); }
        .pxl-navbtn[data-active="true"]::before { content:''; position:absolute; left:-8px; top:50%; transform:translateY(-50%); width:2.5px; height:22px; border-radius:2px; background: var(--a2ui-accent); }
        .pxl-secondary { color: var(--a2ui-text-secondary); }
        .pxl-tertiary { color: var(--a2ui-text-tertiary); }
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
      `}</style>

      {/* Primary nav rail */}
      <nav className="pxl-rail flex flex-col items-center w-[72px] py-4 shrink-0">
        <div className="pxl-secondary mb-6"><PixcelMark size={22} /></div>
        <div className="flex flex-col gap-1.5">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={onEnter} data-active={s.id === 'chat'} title={s.label} className="pxl-navbtn flex flex-col items-center gap-1 w-14 py-2">
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

      {/* Main column — the Chat splash */}
      <div className="relative flex-1 flex flex-col min-w-0">
        <div className="pxl-gridbg pointer-events-none absolute inset-0" />

        <div className="relative flex-1 flex flex-col items-center justify-center px-6">
          {/* The universal ask */}
          <h1 style={{ margin: 0, fontSize: 'clamp(28px, 3.6vw, 36px)', fontWeight: 400, letterSpacing: '-0.01em', textAlign: 'center' }}>
            How can I help you today, Brian?
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
              placeholder="Ask me anything, or describe what you want to create…"
              className="pxl-input min-w-0 flex-1 text-[15px] outline-none"
            />
            <button type="submit" className="pxl-send flex h-9 w-9 items-center justify-center shrink-0" title="Send"><Ic name="send" size={16} /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
