'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from '../components/LandingPage';
import ChatView from '../components/ChatView';
import AuthProvider from '../components/AuthProvider';
import LoginModalProvider from '../components/LoginModalProvider';

// Dynamically import Studio component (client-side only for Web Workers)
const Studio = dynamic(() => import('../components/Studio'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="text-6xl mb-4">⬢</div>
        
        {/* Title */}
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary-light to-accent-purple bg-clip-text text-transparent">
          PXS Studio
        </h1>
        
        {/* Version Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background-elevated border border-border">
          <span className="text-sm text-text-secondary">v4.0.0</span>
          <span className="text-xs text-text-muted">•</span>
          <span className="text-sm text-primary">Production Architecture</span>
        </div>
        
        {/* Loading Indicator */}
        <div className="flex items-center gap-3 justify-center mt-8">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        <p className="text-sm text-text-muted mt-4">
          Loading WebAssembly + Web Workers...
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  // The front door is now CHAT: splash → chat (the Pixcel Agent) → optionally the Studio (IDE).
  const [stage, setStage] = useState<'splash' | 'chat' | 'studio'>('splash');
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingScreen />;
  }

  // The product's front door: splash → the chat-orchestrator (Pixcel Agent) conversation. The
  // Studio (the art IDE, with LiveArtisanPanel etc.) stays reachable — entered from chat (a
  // medium choice / nav item). AuthProvider wraps all three so they share the Auth0 session.
  return (
    <AuthProvider>
      <LoginModalProvider>
        {stage === 'splash' ? (
          // The splash routes its prompt into CHAT (the front door), not straight into the Studio.
          <LandingPage onEnter={(p) => { setInitialPrompt(p); setStage('chat'); }} />
        ) : stage === 'chat' ? (
          <ChatView
            initialPrompt={initialPrompt}
            onEnterStudio={(p) => { if (p) setInitialPrompt(p); setStage('studio'); }}
            onHome={() => setStage('splash')}
          />
        ) : (
          <Studio onHome={() => setStage('chat')} initialPrompt={initialPrompt} />
        )}
      </LoginModalProvider>
    </AuthProvider>
  );
}
