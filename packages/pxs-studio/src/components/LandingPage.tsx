'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Pixcel CHAT SPLASH — CONTENT-ONLY (PR-8 persistent shell).
 *
 * The persistent NavRail + DigitalWall now live in the shell (app/page.tsx); this renders ONLY the
 * splash hero over that shell, so the rail + wall never re-mount / fade on splash→chat. The hero is
 * SWAPPABLE: 'logo' = the gold reference (prompt bar tracks the shell wall's wordmark via the
 * `promptY` the shell computes); 'greeting' = the personalized greeting + chips with the prompt bar
 * anchored at the bottom (photolif). Copy + prompt-bar markup are LOCKED — only the outer chrome
 * moved out to the shell.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import SplashGreeting from './SplashGreeting';
import { useSettings } from '../store/settings-store';
import { markResumeThread, type SplashChip } from '../lib/splash-suggestions';

interface Props {
  onEnter: (prompt?: string) => void;
  /** Prompt-bar vertical anchor for the 'logo' hero — the shell computes it from the wall's logo
   *  layout so the bar still tracks the wordmark. */
  promptY: string;
}

/* Prompt-bar glyphs (the only icons that live here now — the rail is the shared <NavRail>). */
type IconName = 'send' | 'plus';
const PATHS: Record<IconName, string[]> = {
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

export default function LandingPage({ onEnter, promptY }: Props) {
  const [draft, setDraft] = useState('');
  const splashStyle = useSettings((s) => s.splashStyle);

  // A greeting chip: resume a specific project (set it active → ChatView restores it) or start fresh.
  const handleChip = (chip: SplashChip) => {
    if (chip.kind === 'resume') {
      if (chip.threadId) markResumeThread(chip.threadId);
      onEnter();
    } else {
      onEnter(chip.prompt || chip.label);
    }
  };

  // The hero prompt bar — shared by both variants (identical markup).
  const promptBar = (
    <form
      onSubmit={(e) => { e.preventDefault(); onEnter(draft.trim() || undefined); }}
      className="pxl-promptbar flex w-full max-w-2xl items-center gap-2 rounded-full px-3.5 py-2.5"
    >
      <button type="button" onClick={() => onEnter()} className="pxl-iconbtn flex h-9 w-9 items-center justify-center shrink-0" title="Attach"><Ic name="plus" size={20} /></button>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Ask me anything…"
        className="pxl-input min-w-0 flex-1 text-[15px] outline-none"
      />
      <button type="submit" className="pxl-send flex h-9 w-9 items-center justify-center shrink-0" title="Send"><Ic name="send" size={16} /></button>
    </form>
  );

  return (
    <div className="pxl-root relative h-full w-full overflow-hidden">
      <style>{`
        /* No background here — the shell's persistent DigitalWall shows through behind the hero. */
        .pxl-root { color: var(--a2ui-text-primary); font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }
        .pxl-root ::selection { background: var(--a2ui-accent-subtle); }
        .pxl-promptbar { background: var(--a2ui-bg-input); border: 1px solid var(--a2ui-border-default); transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast); }
        .pxl-promptbar:focus-within { border-color: var(--a2ui-accent); box-shadow: 0 0 0 3px var(--a2ui-accent-subtle); }
        .pxl-input { background: transparent; color: var(--a2ui-text-primary); }
        .pxl-input::placeholder { color: var(--a2ui-text-tertiary); }
        .pxl-iconbtn { color: var(--a2ui-text-tertiary); border-radius: 9999px; transition: color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); }
        .pxl-iconbtn:hover { color: var(--a2ui-text-secondary); background: var(--a2ui-bg-hover); }
        .pxl-send { background: var(--a2ui-accent); color: var(--a2ui-text-inverse); border-radius: 9999px; transition: background var(--a2ui-transition-fast); }
        .pxl-send:hover { background: var(--a2ui-accent-hover); }
      `}</style>

      {splashStyle === 'logo' ? (
        /* LOGO hero — the prompt bar floats at `promptY`, below the shell wall's wordmark (gold). */
        <div className="relative z-10 h-full" style={{ ['--pxl-prompt-y' as string]: promptY }}>
          <div className="absolute left-0 right-0 flex -translate-y-1/2 justify-center px-6" style={{ top: 'var(--pxl-prompt-y, 70%)' }}>
            {promptBar}
          </div>
        </div>
      ) : (
        /* GREETING hero — greeting + chips centered, prompt bar anchored at the bottom (photolif). */
        <div className="relative z-10 h-full flex flex-col px-6">
          <div className="flex-1 flex flex-col items-center justify-center">
            <SplashGreeting onSelect={handleChip} />
          </div>
          <div className="shrink-0 flex w-full justify-center pb-10">{promptBar}</div>
        </div>
      )}
    </div>
  );
}
