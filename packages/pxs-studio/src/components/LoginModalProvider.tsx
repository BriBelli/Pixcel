'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import LoginModal from './LoginModal';

/* ─────────────────────────────────────────────────────────────────────────────
 * LoginModalProvider — app-level open-state for the custom sign-in modal.
 *
 * Wrapping both the splash (LandingPage) and the Studio means the NavRail's
 * "Sign in" affordance (which lives in both shells) can open ONE modal that
 * overlays whichever shell is on screen. The modal is rendered here, once, at the
 * top of the tree (above page content) so it sits over everything.
 *
 * Use `useLoginModal()` to open/close from anywhere inside the provider.
 * ───────────────────────────────────────────────────────────────────────────── */

interface LoginModalContextValue {
  openLogin: () => void;
  closeLogin: () => void;
  isOpen: boolean;
}

const LoginModalContext = createContext<LoginModalContextValue | null>(null);

export function useLoginModal(): LoginModalContextValue {
  const ctx = useContext(LoginModalContext);
  if (!ctx) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return ctx;
}

export default function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openLogin = useCallback(() => setIsOpen(true), []);
  const closeLogin = useCallback(() => setIsOpen(false), []);

  return (
    <LoginModalContext.Provider value={{ openLogin, closeLogin, isOpen }}>
      {children}
      {isOpen && <LoginModal onClose={closeLogin} />}
    </LoginModalContext.Provider>
  );
}
