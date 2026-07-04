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

// ── Front-door cross-fade lifecycle ─────────────────────────────────────────────
// The splash → chat move is a choreographed CROSS-FADE, not a hard swap: both layers
// stay mounted briefly — the outgoing view eases opacity 1→0 (and recedes a touch),
// the incoming view eases opacity 0→1 — over CROSSFADE_MS on the design entrance
// easing, then the outgoing layer unmounts. The prompt fades and the splash's logo-wall
// recedes as the chat's dormant wall fades in — no "collision of UIs."
//
// NOTE (next evolution): the DigitalWall is still a SEPARATE instance per view (splash's
// logo-wall vs chat's dormant wall), so the cross-fade dissolves one into the other. The
// deliberate LATER increment is to hoist the wall into ONE persistent instance that merely
// re-tunes (logoScale/intensity) across the hand-off — not built yet.
const CROSSFADE_MS = 440;
const CROSSFADE_EASE = 'var(--a2ui-ease-entrance)'; // cubic-bezier(0.22, 1, 0.36, 1)

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

  // Cross-fade state: `outgoing` is the view still fading out on top of `stage` (the
  // incoming view). `entered` flips false→true on the next frame so the incoming layer's
  // CSS transition actually plays (mounts at opacity 0, then eases to 1).
  const [outgoing, setOutgoing] = useState<Stage | null>(null);
  const [entered, setEntered] = useState(true);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear any pending timers on unmount.
  useEffect(() => () => {
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
  }, []);

  // Drive a choreographed hand-off to `next`. Both layers stay mounted for CROSSFADE_MS,
  // then the outgoing layer unmounts. Reduced motion → instant, still correct.
  const transitionTo = useCallback((next: Stage, prompt?: string, keepPrompt = true) => {
    setStage((current) => {
      if (next === current) return current;
      if (prompt !== undefined) setInitialPrompt(prompt);
      else if (!keepPrompt) setInitialPrompt(undefined);

      if (prefersReducedMotion()) {
        // No motion: swap instantly, no overlap layer.
        setOutgoing(null);
        setEntered(true);
        return next;
      }

      // Overlap: the current view keeps rendering as the `outgoing` layer (fading out) while
      // `next` mounts underneath at opacity 0, then eases in on the next frame.
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);

      setOutgoing(current);
      setEntered(false);
      // Flip to entered on the next frame so the incoming transition plays from 0→1.
      rafId.current = requestAnimationFrame(() => {
        rafId.current = requestAnimationFrame(() => setEntered(true));
      });
      unmountTimer.current = setTimeout(() => {
        setOutgoing(null);
        unmountTimer.current = null;
      }, CROSSFADE_MS);
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

  const transitioning = outgoing !== null;

  // The layer wrapper: during a transition each layer is absolutely stacked and opacity/
  // transform are driven by CSS transitions on the design entrance easing. `incoming`
  // starts hidden (opacity 0, translateY 6px) and eases to rest once `entered` flips.
  const layerStyle = (kind: 'incoming' | 'outgoing'): CSSProperties => {
    if (!transitioning) return {}; // steady state — no wrapper styling, view fills naturally.
    const active = kind === 'outgoing' || entered; // outgoing is "at rest" until it starts fading
    const isOutgoing = kind === 'outgoing';
    return {
      position: 'absolute',
      inset: 0,
      transition: `opacity ${CROSSFADE_MS}ms ${CROSSFADE_EASE}, transform ${CROSSFADE_MS}ms ${CROSSFADE_EASE}`,
      opacity: isOutgoing ? 0 : active ? 1 : 0,
      // Gentle, no-bounce recede/settle: outgoing lifts up 8px, incoming rises from 6px.
      transform: isOutgoing
        ? 'translateY(-8px)'
        : active
          ? 'translateY(0)'
          : 'translateY(6px)',
      // Outgoing is on top and non-interactive while it dissolves.
      zIndex: isOutgoing ? 2 : 1,
      pointerEvents: isOutgoing ? 'none' : 'auto',
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
