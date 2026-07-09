'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from '../components/LandingPage';
import ChatView from '../components/ChatView';
import NavRail from '../components/NavRail';
import DigitalWall from '../components/DigitalWall';
import SettingsPanel from '../components/SettingsPanel';
import AuthProvider from '../components/AuthProvider';
import LoginModalProvider from '../components/LoginModalProvider';
import { PixcelMark } from '../components/ui';
import { useSettings } from '../store/settings-store';
import { useChatTurnsStore } from '../store/chat-turns-store';
import { RES } from '../lib/resolutions';

// Dynamically import Studio component (client-side only for Web Workers)
const Studio = dynamic(() => import('../components/Studio'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

// A calm, on-brand boot state: just the Pixcel mark breathing on the app background.
// Replaces the old "PXS Studio / v4.0.0 / Loading WebAssembly…" screen (off-brand clutter).
// Tokens-only, sentence case, no version/architecture copy — the mark IS the identity.
function LoadingScreen() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--a2ui-bg-app)',
      }}
    >
      <style>{`@keyframes pxl-boot { 0%, 100% { opacity: 0.4; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); } }`}</style>
      <PixcelMark
        size={44}
        style={{
          color: 'var(--a2ui-accent)',
          animation: 'pxl-boot 1.6s var(--a2ui-ease-entrance, ease-in-out) infinite',
        }}
      />
    </div>
  );
}

type Stage = 'splash' | 'chat' | 'studio';

// ── Front-door STAGGERED hand-off lifecycle ─────────────────────────────────────
// The splash → chat move is a paced sequence, NOT a hard swap and NOT a simultaneous
// cross-dissolve: the outgoing view (its wall too) eases opacity 1→0 + recedes over OUT_MS,
// THEN — after a beat — the incoming view eases in over IN_MS, revealing the chat + its
// thinking loader (that reveal is the beat). The chat mounts + starts processing during the
// out-fade, so it reveals already working — an intelligent-interface feel, not a fake snap.
//
// NOTE (next evolution): the DigitalWall is still a SEPARATE instance per view (splash's
// logo-wall vs chat's dormant wall), so the cross-fade dissolves one into the other. The
// deliberate LATER increment is to hoist the wall into ONE persistent instance that merely
// re-tunes (logoScale/intensity) across the hand-off — not built yet.
// Paced splash↔chat hand-off — a STAGGERED sequence, not a cross-dissolve: the outgoing view
// (with its wall) eases OUT first, THEN — after a beat — the incoming view eases IN, revealing
// the chat + its thinking loader (that reveal IS the "processing" beat; nothing fake/timed).
const OUT_MS = 320; // outgoing fades + recedes out
const IN_MS = 380; // incoming eases in (starts after OUT_MS)
const EASE = 'var(--a2ui-ease-entrance)'; // cubic-bezier(0.22, 1, 0.36, 1)

// Splash logo → prompt-bar anchor (the shell computes it from the persistent wall's logo layout).
const PROMPT_GAP = '4rem';
const PROMPT_Y_MIN = '52%';
const PROMPT_Y_MAX = '82%';
const DEFAULT_PROMPT_Y = '72%';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  // The front door is now CHAT: splash → chat (the Operator) → optionally the Studio (IDE).
  const [stage, setStage] = useState<Stage>('splash');
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();

  // Staggered hand-off state: `outgoing` = the view fading OUT (top layer); `phase`:
  //   'out'  → outgoing fades/recedes, incoming held hidden
  //   'in'   → outgoing gone, incoming eases in (chat + loader reveal)
  //   null   → steady (no transition)
  const [outgoing, setOutgoing] = useState<Stage | null>(null);
  const [phase, setPhase] = useState<'out' | 'in' | null>(null);
  const outTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // The splash is ALWAYS the front door — a reload lands on the personalized greeting, never
    // silently into an old (often empty) chat. Resuming the last conversation is an explicit choice:
    // the greeting's "Continue where you left off" chip (splash-suggestions) restores it on demand.
    setMounted(true);
  }, []);

  // Clear any pending timers on unmount.
  useEffect(() => () => {
    if (outTimer.current) clearTimeout(outTimer.current);
    if (doneTimer.current) clearTimeout(doneTimer.current);
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
  }, []);

  // Drive the staggered hand-off to `next`: OUT (outgoing fades) → beat → IN (incoming eases in).
  // Reduced motion → instant, still correct.
  const transitionTo = useCallback((next: Stage, prompt?: string, keepPrompt = true) => {
    setStage((current) => {
      if (next === current) return current;
      if (prompt !== undefined) setInitialPrompt(prompt);
      else if (!keepPrompt) setInitialPrompt(undefined);

      if (prefersReducedMotion()) {
        // No motion: swap instantly, no layers.
        setOutgoing(null);
        setPhase(null);
        return next;
      }

      if (outTimer.current) clearTimeout(outTimer.current);
      if (doneTimer.current) clearTimeout(doneTimer.current);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);

      // 1) OUT — the current view (its wall too) fades + recedes out; the incoming view is
      //    mounted underneath but held hidden.
      setOutgoing(current);
      setPhase('out');
      // 2) after OUT_MS — drop the outgoing layer, then (next frame) flip to 'in' so the incoming
      //    view eases in from hidden, revealing the chat + its loader. The beat is that reveal.
      outTimer.current = setTimeout(() => {
        setOutgoing(null);
        rafId.current = requestAnimationFrame(() => setPhase('in'));
      }, OUT_MS);
      // 3) after the full sequence — back to a plain steady layout.
      doneTimer.current = setTimeout(() => setPhase(null), OUT_MS + IN_MS);
      return next;
    });
  }, []);

  // ── PR-8 persistent shell state (nav + wall + settings live here, not in the views) ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptY, setPromptY] = useState(DEFAULT_PROMPT_Y);
  const splashStyle = useSettings((s) => s.splashStyle);
  const theme = useSettings((s) => s.theme);
  const activeMedium = useChatTurnsStore((s) => s.activeMedium);
  const setActiveMedium = useChatTurnsStore((s) => s.setActiveMedium);

  // Theme applies to <html> from the shell, so it holds across splash + chat (not just in-app).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // The persistent wall's logo layout → the splash prompt-bar anchor (logo hero only).
  const handleLogoLayout = useCallback((box: { bottomFrac: number; visible: boolean }) => {
    if (!box.visible) {
      setPromptY(DEFAULT_PROMPT_Y);
      return;
    }
    const belowLogo = `calc(${(box.bottomFrac * 100).toFixed(2)}% + ${PROMPT_GAP})`;
    setPromptY(`clamp(${PROMPT_Y_MIN}, ${belowLogo}, ${PROMPT_Y_MAX})`);
  }, []);

  if (!mounted) {
    return <LoadingScreen />;
  }

  const transitioning = phase !== null;
  const inStudio = stage === 'studio';

  // Nav handlers — the shell owns the ONE persistent rail (stage-aware).
  const navActive = stage === 'chat' ? activeMedium : 'chat';
  const handleNavHome = () => {
    // From a workspace → back to the conversation; from plain chat/splash → the splash.
    if (stage === 'chat' && activeMedium !== 'chat') setActiveMedium('chat');
    else transitionTo('splash', undefined, false);
  };
  const handleNavSection = (id: string) => {
    if (stage === 'splash') { transitionTo('chat'); return; }
    if (id === 'image' || id === 'video') setActiveMedium(id);
    else setActiveMedium('chat');
  };

  // The persistent wall re-tunes by SCENARIO (never disabled): splash+logo = active flare
  // (wordmark); otherwise dormant (subtle, no logo) — present + ready to come alive on intent later.
  const wallLogo = stage === 'splash' && splashStyle === 'logo';

  // Content-only stage for the cross-fading well (studio is a separate full view below).
  const renderContent = (s: Stage) => {
    if (s === 'splash') return <LandingPage onEnter={(p) => transitionTo('chat', p)} promptY={promptY} />;
    if (s === 'chat') return <ChatView initialPrompt={initialPrompt} />;
    return null;
  };

  // Layer styling for the content well. Steady = fill the well; transitioning = staggered fade.
  const layerStyle = (kind: 'incoming' | 'outgoing'): CSSProperties => {
    const fill: CSSProperties = { position: 'absolute', inset: 0 };
    if (!transitioning) return fill;
    if (kind === 'outgoing') {
      return {
        ...fill, zIndex: 2, pointerEvents: 'none',
        transition: `opacity ${OUT_MS}ms ${EASE}, transform ${OUT_MS}ms ${EASE}`,
        opacity: 0,
        transform: 'translateY(-6px) scale(0.995)',
      };
    }
    const shown = phase === 'in';
    return {
      ...fill, zIndex: 1, pointerEvents: shown ? 'auto' : 'none',
      transition: `opacity ${IN_MS}ms ${EASE}, transform ${IN_MS}ms ${EASE}`,
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : 'translateY(12px)',
    };
  };

  // The product's front door: splash ⇄ chat live inside ONE persistent shell (nav + wall never
  // fade; only the center well cross-fades). The Studio is a separate full view (its own chrome).
  return (
    <AuthProvider>
      <LoginModalProvider>
        {inStudio ? (
          <Studio onHome={() => transitionTo('chat')} initialPrompt={initialPrompt} />
        ) : (
          <div
            className="pxs-shell relative isolate flex h-screen overflow-hidden"
            style={{ background: 'var(--a2ui-bg-app)', color: 'var(--a2ui-text-primary)', fontFamily: 'var(--a2ui-font-family)' }}
          >
            {/* BEHIND everything — the ONE persistent DigitalWall (opaque canvas), so it must sit at a
                NEGATIVE z inside the shell's isolate context or it paints OVER the static nav (a
                positioned z-0 element paints above static siblings). Scenario-tuned; never re-mounts. */}
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
              <DigitalWall
                className="absolute inset-0 h-full w-full"
                pixels={RES.retro}
                showLogo={wallLogo}
                logoScale={0.25}
                intensity={wallLogo ? 0.14 : 0.02}
                onLogoLayout={wallLogo ? handleLogoLayout : undefined}
              />
            </div>

            {/* The ONE persistent left NavRail — the anchor, never fades. z-30 keeps its mark +
                avatar ABOVE the wall AND above the content well, so the avatar popover (which
                overhangs the content) stays clickable. `flex` lets the rail stretch to FULL height
                (else the wrapper's a plain block and the rail collapses to content height). */}
            <div className="relative z-30 shrink-0 flex">
              <NavRail
                activeSection={navActive}
                onHome={handleNavHome}
                onSection={handleNavSection}
                onUtility={() => transitionTo('studio')}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </div>

            {/* Content well — ONLY this cross-fades between splash ⇄ chat. */}
            <div className="relative z-10 flex-1 min-w-0 h-full">
              <div key={stage} style={layerStyle('incoming')}>{renderContent(stage)}</div>
              {transitioning && outgoing && outgoing !== 'studio' && (
                <div key={outgoing} style={layerStyle('outgoing')}>{renderContent(outgoing)}</div>
              )}
            </div>

            <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          </div>
        )}
      </LoginModalProvider>
    </AuthProvider>
  );
}
