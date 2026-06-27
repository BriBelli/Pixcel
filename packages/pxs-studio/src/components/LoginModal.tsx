'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { loginWithCredentials, resetPassword } from '../lib/credentials-auth';

/* ─────────────────────────────────────────────────────────────────────────────
 * LoginModal — the CUSTOM in-app sign-in modal (NOT Auth0's hosted page).
 *
 * Ported in structure from photolif's Lit `a2ui-login` and restyled to OUR
 * charcoal/blue design system (DS tokens only — `--a2ui-*`, accent
 * `var(--a2ui-accent)`; IBM Plex; alpha borders; radii scale; Lucide SVG;
 * sentence case).
 *
 * Three views: `login` (email/password → ROPG via credentials-auth), `forgot`
 * (email → resetPassword, confirm state). `signup` and Google both hand off to
 * the Auth0 SDK redirect flow (the SDK owns PKCE redirects; ROPG only covers the
 * direct email/password path).
 *
 * Accessible: role=dialog/aria-modal, labelled by the heading, Esc closes, the
 * email field is focused on open, overlay click closes.
 * ───────────────────────────────────────────────────────────────────────────── */

type ViewMode = 'login' | 'forgot';

const MODAL_CSS = `
  .pxl-login-overlay {
    position: fixed; inset: 0;
    z-index: var(--a2ui-z-modal);
    display: flex; align-items: center; justify-content: center;
    padding: var(--a2ui-space-4);
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    animation: pxlLoginOverlayIn 0.2s ease;
    font-family: var(--a2ui-font-family);
    -webkit-font-smoothing: antialiased;
  }
  @keyframes pxlLoginOverlayIn { from { opacity: 0; } to { opacity: 1; } }

  .pxl-login-modal {
    position: relative;
    width: 100%; max-width: 380px;
    box-sizing: border-box;
    padding: var(--a2ui-space-8);
    background: var(--a2ui-glass-menu, var(--a2ui-bg-elevated));
    border: 1px solid var(--a2ui-border-default);
    border-radius: var(--a2ui-radius-xl);
    box-shadow: var(--a2ui-shadow-xl);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    animation: pxlLoginModalIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes pxlLoginModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .pxl-login-close {
    position: absolute; top: var(--a2ui-space-4); right: var(--a2ui-space-4);
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    background: none; border: none; cursor: pointer;
    color: var(--a2ui-text-tertiary);
    border-radius: var(--a2ui-radius-full);
    transition: background var(--a2ui-transition-fast), color var(--a2ui-transition-fast);
  }
  .pxl-login-close:hover { background: var(--a2ui-bg-hover); color: var(--a2ui-text-primary); }

  .pxl-login-header { text-align: center; margin-bottom: var(--a2ui-space-6); }
  .pxl-login-header h2 {
    margin: 0 0 var(--a2ui-space-1) 0;
    font-size: var(--a2ui-text-xl); font-weight: var(--a2ui-font-medium);
    color: var(--a2ui-text-primary);
  }
  .pxl-login-header p {
    margin: 0; font-size: var(--a2ui-text-sm); color: var(--a2ui-text-secondary);
  }

  .pxl-login-field { margin-bottom: var(--a2ui-space-4); }
  .pxl-login-field label {
    display: block; margin-bottom: var(--a2ui-space-1);
    font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-medium);
    color: var(--a2ui-text-secondary);
  }
  .pxl-login-field input {
    width: 100%; box-sizing: border-box;
    padding: var(--a2ui-space-3);
    background: var(--a2ui-bg-input);
    border: 1px solid var(--a2ui-border-default);
    border-radius: var(--a2ui-radius-md);
    color: var(--a2ui-text-primary);
    font-size: var(--a2ui-text-md); font-family: var(--a2ui-font-family);
    transition: border-color var(--a2ui-transition-fast), background var(--a2ui-transition-fast);
  }
  .pxl-login-field input:focus {
    outline: none; border-color: var(--a2ui-accent);
    background: var(--a2ui-bg-input-focus, var(--a2ui-bg-input));
  }
  .pxl-login-field input::placeholder { color: var(--a2ui-text-disabled); }
  .pxl-login-field input:disabled { opacity: 0.5; }

  .pxl-login-forgot { text-align: right; margin-bottom: var(--a2ui-space-3); }

  .pxl-login-primary {
    width: 100%; margin-top: var(--a2ui-space-2);
    padding: var(--a2ui-space-3);
    background: var(--a2ui-accent); color: var(--a2ui-text-inverse);
    border: none; border-radius: var(--a2ui-radius-md);
    font-size: var(--a2ui-text-md); font-weight: var(--a2ui-font-medium);
    font-family: var(--a2ui-font-family); cursor: pointer;
    transition: background var(--a2ui-transition-fast);
  }
  .pxl-login-primary:hover:not(:disabled) { background: var(--a2ui-accent-hover); }
  .pxl-login-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .pxl-login-link {
    background: none; border: none; padding: 0;
    color: var(--a2ui-accent); cursor: pointer;
    font-size: var(--a2ui-text-sm); font-family: var(--a2ui-font-family);
    transition: color var(--a2ui-transition-fast);
  }
  .pxl-login-link:hover { color: var(--a2ui-accent-hover); text-decoration: underline; }
  .pxl-login-link:disabled { opacity: 0.5; cursor: not-allowed; }

  .pxl-login-footer {
    text-align: center; margin-top: var(--a2ui-space-4);
    font-size: var(--a2ui-text-sm); color: var(--a2ui-text-secondary);
  }

  .pxl-login-divider {
    display: flex; align-items: center; gap: var(--a2ui-space-3);
    margin: var(--a2ui-space-5) 0;
    color: var(--a2ui-text-tertiary); font-size: var(--a2ui-text-sm);
  }
  .pxl-login-divider::before, .pxl-login-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--a2ui-border-subtle);
  }

  .pxl-login-google {
    width: 100%; padding: var(--a2ui-space-3);
    display: flex; align-items: center; justify-content: center; gap: var(--a2ui-space-2);
    background: var(--a2ui-bg-secondary);
    border: 1px solid var(--a2ui-border-default);
    border-radius: var(--a2ui-radius-md);
    color: var(--a2ui-text-primary);
    font-size: var(--a2ui-text-md); font-family: var(--a2ui-font-family); cursor: pointer;
    transition: background var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast);
  }
  .pxl-login-google:hover { background: var(--a2ui-bg-tertiary); border-color: var(--a2ui-border-strong); }
  .pxl-login-google:disabled { opacity: 0.5; cursor: not-allowed; }

  .pxl-login-error {
    margin-bottom: var(--a2ui-space-4);
    padding: var(--a2ui-space-3);
    background: var(--a2ui-error-bg);
    border: 1px solid var(--a2ui-error);
    border-radius: var(--a2ui-radius-md);
    color: var(--a2ui-error); font-size: var(--a2ui-text-sm);
  }

  .pxl-login-confirm { text-align: center; }
  .pxl-login-confirm .pxl-login-confirm-icon {
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto var(--a2ui-space-3);
    width: 48px; height: 48px; border-radius: var(--a2ui-radius-full);
    background: var(--a2ui-success-bg); color: var(--a2ui-success);
  }
  .pxl-login-confirm h2 { color: var(--a2ui-text-primary); }
  .pxl-login-confirm p {
    color: var(--a2ui-text-secondary); font-size: var(--a2ui-text-sm);
    line-height: var(--a2ui-leading-relaxed); margin: var(--a2ui-space-2) 0;
  }
  .pxl-login-confirm .pxl-login-hint { color: var(--a2ui-text-tertiary); font-size: var(--a2ui-text-xs); }
`;

function CloseIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const { loginWithRedirect } = useAuth0();

  const [view, setView] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  // Focus the email field on open / on view switch back to a form.
  useEffect(() => {
    if (!resetSent) emailRef.current?.focus();
  }, [view, resetSent]);

  // Esc closes the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchView = (next: ViewMode) => {
    setView(next);
    setError(null);
    setResetSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (view === 'login') {
        await loginWithCredentials(email, password);
        onClose();
      } else {
        await resetPassword(email);
        setResetSent(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('Wrong email or password') || msg.includes('invalid_grant')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = () =>
    loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });

  const handleGoogle = () =>
    loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } });

  const heading =
    view === 'login'
      ? { h: 'Welcome back', p: 'Sign in to Pixcel' }
      : { h: 'Reset your password', p: 'Enter your email to receive a reset link' };

  const showConfirm = view === 'forgot' && resetSent;

  return (
    <div
      className="pxl-login-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{MODAL_CSS}</style>
      <div
        className="pxl-login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pxl-login-heading"
      >
        <button type="button" className="pxl-login-close" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>

        {showConfirm ? (
          <div className="pxl-login-confirm">
            <div className="pxl-login-confirm-icon"><MailIcon /></div>
            <h2 id="pxl-login-heading">Check your email</h2>
            <p>
              We&apos;ve sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="pxl-login-hint">
              Didn&apos;t receive it? Check your spam folder or try again.
            </p>
            <button
              type="button"
              className="pxl-login-primary"
              onClick={() => switchView('login')}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="pxl-login-header">
              <h2 id="pxl-login-heading">{heading.h}</h2>
              <p>{heading.p}</p>
            </div>

            {error && <div className="pxl-login-error" role="alert">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="pxl-login-field">
                <label htmlFor="pxl-login-email">Email</label>
                <input
                  id="pxl-login-email"
                  ref={emailRef}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {view === 'login' && (
                <div className="pxl-login-field">
                  <label htmlFor="pxl-login-password">Password</label>
                  <input
                    id="pxl-login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              )}

              {view === 'login' && (
                <div className="pxl-login-forgot">
                  <button
                    type="button"
                    className="pxl-login-link"
                    disabled={isLoading}
                    onClick={() => switchView('forgot')}
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              <button type="submit" className="pxl-login-primary" disabled={isLoading}>
                {isLoading
                  ? 'Please wait…'
                  : view === 'login'
                    ? 'Sign in'
                    : 'Send reset link'}
              </button>
            </form>

            <div className="pxl-login-footer">
              {view === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" className="pxl-login-link" disabled={isLoading} onClick={handleSignup}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Remember your password?{' '}
                  <button type="button" className="pxl-login-link" disabled={isLoading} onClick={() => switchView('login')}>
                    Back to sign in
                  </button>
                </>
              )}
            </div>

            {view === 'login' && (
              <>
                <div className="pxl-login-divider"><span>or</span></div>
                <button type="button" className="pxl-login-google" disabled={isLoading} onClick={handleGoogle}>
                  <GoogleIcon />
                  Continue with Google
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
