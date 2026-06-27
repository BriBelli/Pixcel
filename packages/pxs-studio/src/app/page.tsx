'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from '../components/LandingPage';
import AuthProvider from '../components/AuthProvider';

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
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingScreen />;
  }

  // The product's front door: a landing/splash page → launch into the Studio (the IDE).
  // AuthProvider wraps both so LandingPage + Studio (and thus NavRail/useCurrentUser)
  // share the same Auth0 session context.
  return (
    <AuthProvider>
      {!entered ? (
        <LandingPage onEnter={() => setEntered(true)} />
      ) : (
        <Studio onHome={() => setEntered(false)} />
      )}
    </AuthProvider>
  );
}
