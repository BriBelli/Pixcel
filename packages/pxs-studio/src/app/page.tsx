'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from '../components/LandingPage';
import ChatView from '../components/ChatView';
import AuthProvider from '../components/AuthProvider';
import LoginModalProvider from '../components/LoginModalProvider';
import { PixcelMark } from '../components/ui';

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

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  // The front door is now CHAT: splash → chat (the Pixcel Agent) → optionally the Studio (IDE).
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
    // Reload restores the last conversation: if a chat thread was persisted, boot straight
    // into chat (ChatView hydrates it from the SQLite store); otherwise land on the splash
    // front door. DECISION (flip if reload should ALWAYS show the splash): returning users
    // with an active conversation resume it; first-time / no-history users see the splash.
    if (typeof window !== 'undefined' && window.localStorage.getItem('pxs-chat-thread')) {
      setStage('chat');
    }
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

  if (!mounted) {
    return <LoadingScreen />;
  }

  // Render a single stage into a cross-fade layer. The incoming (top) layer mounts at
  // opacity 0 / translateY and eases to rest; the outgoing layer eases to opacity 0 and
  // recedes a touch. During a transition both layers are absolutely stacked (inset 0).
  const renderStage = (s: Stage) => {
    switch (s) {
      case 'splash':
        // The splash routes its prompt into CHAT (the front door), not straight into the Studio.
        return <LandingPage onEnter={(p) => transitionTo('chat', p)} />;
      case 'chat':
        return (
          <ChatView
            initialPrompt={initialPrompt}
            onEnterStudio={(p) => transitionTo('studio', p)}
            onHome={() => transitionTo('splash', undefined, false)}
          />
        );
      case 'studio':
        return <Studio onHome={() => transitionTo('chat')} initialPrompt={initialPrompt} />;
    }
  };

  const transitioning = phase !== null;

  // Staggered layer styling. OUTGOING: fades opacity 1→0 + lifts, over OUT_MS, on top. INCOMING:
  // held hidden (opacity 0, sunk 12px) during 'out', then eases to rest over IN_MS once phase='in'.
  const layerStyle = (kind: 'incoming' | 'outgoing'): CSSProperties => {
    if (!transitioning) return {}; // steady state — plain, view fills naturally.
    if (kind === 'outgoing') {
      return {
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        transition: `opacity ${OUT_MS}ms ${EASE}, transform ${OUT_MS}ms ${EASE}`,
        opacity: 0, // was 1 (steady, keyed element) → transitions out
        transform: 'translateY(-6px) scale(0.995)',
      };
    }
    const shown = phase === 'in';
    return {
      position: 'absolute', inset: 0, zIndex: 1, pointerEvents: shown ? 'auto' : 'none',
      transition: `opacity ${IN_MS}ms ${EASE}, transform ${IN_MS}ms ${EASE}`,
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : 'translateY(12px)',
    };
  };

  // The product's front door: splash → the chat-orchestrator (Pixcel Agent) conversation. The
  // Studio (the art IDE, with LiveArtisanPanel etc.) stays reachable — entered from chat (a
  // medium choice / nav item). AuthProvider wraps all three so they share the Auth0 session.
  return (
    <AuthProvider>
      <LoginModalProvider>
        {/* During a hand-off the container is positioned so the two layers can stack (inset 0);
            at rest it's a plain full-height passthrough. */}
        <div style={transitioning ? { position: 'relative', height: '100vh', overflow: 'hidden' } : undefined}>
          {/* Keyed by stage so React PRESERVES each view's instance across the hand-off —
              the outgoing view keeps its already-mounted state (wall, entrance) and simply
              fades out, instead of re-mounting and replaying its intro while it dissolves. */}
          <div key={stage} style={layerStyle('incoming')}>{renderStage(stage)}</div>
          {transitioning && outgoing && (
            <div key={outgoing} style={layerStyle('outgoing')}>{renderStage(outgoing)}</div>
          )}
        </div>
      </LoginModalProvider>
    </AuthProvider>
  );
}
