'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ─────────────────────────────────────────────────────────────────────────────
 * THE SETTINGS STORE — user preferences for the studio shell.
 *
 * A tokens-only "dump" for user setting options, modeled on photolif's
 * a2ui-settings-panel (which split ai/ui config into `localStorage['a2ui_settings']`).
 * Our version is a single flat, typed shape persisted to `localStorage['pxs-settings']`
 * via zustand's `persist` middleware (same idiom as gallery-store).
 *
 * Two fields are WIRED into the app today (the rest persist for the generation PRs):
 *   • theme       → applied to <html data-theme> (tokens.css swaps dark/light)
 *   • showActions → hides the MessageActions footer (copy/regenerate/feedback) when off
 *
 * SSR-safe: `persist` skips hydration on the server; `useSettings` returns the
 * defaults below until the client rehydrates, so a server render never touches
 * localStorage. (The studio is client-only anyway — app/page.tsx dynamic ssr:false.)
 * ───────────────────────────────────────────────────────────────────────────── */

export type Theme = 'dark' | 'light';
/** The splash hero — a swappable UI element. 'greeting' = personalized greeting + suggestion chips;
 *  'logo' = the digital-wall logo. */
export type SplashStyle = 'greeting' | 'logo';

/** The thinking-indicator experience — ONE setting (constructive-not-destructive: cover the personas
 *  without two confusing axes; Stack was dropped — its auto-jump reflowed the text and broke the calm).
 *   • simple   — a spinner + "Loading…" + elapsed seconds (also the non-SSE / streaming-off state).
 *   • detailed — the single-row SLOT MACHINE: one active step, rolls one out / one in, never reflows.
 *                An expand affordance opens a scrollable box to read the whole thought history. */
export type LoadingMode = 'simple' | 'detailed';

export interface SettingsState {
  /** [wire] Color theme — applied to <html data-theme>, tokens.css does the rest. Default dark. */
  theme: Theme;
  /** [wire] The splash hero variant (swappable). Default the personalized greeting. */
  splashStyle: SplashStyle;
  /** [wire] Show the assistant action bar (copy · regenerate · feedback). Default on. */
  showActions: boolean;
  /** Stream the AI response progressively as it generates. Persist-only (Slice 1). */
  streaming: boolean;
  /** Show follow-up suggestion chips under a response. Persist-only. */
  showSuggestions: boolean;
  /** Include previous messages for context. Persist-only. */
  conversationHistory: boolean;
  /** Maximum previous messages to include (0–100). Persist-only. */
  maxMessages: number;
  /** [wire] The thinking-indicator experience. Default detailed (the slot machine). */
  loadingMode: LoadingMode;
}

export interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setSplashStyle: (v: SplashStyle) => void;
  setShowActions: (v: boolean) => void;
  setStreaming: (v: boolean) => void;
  setShowSuggestions: (v: boolean) => void;
  setConversationHistory: (v: boolean) => void;
  /** Clamps to 0–100 (photolif's Max Messages range). */
  setMaxMessages: (v: number) => void;
  setLoadingMode: (v: LoadingMode) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const DEFAULTS: SettingsState = {
  theme: 'dark',
  splashStyle: 'greeting',
  showActions: true,
  streaming: true,
  showSuggestions: true,
  conversationHistory: true,
  maxMessages: 20,
  loadingMode: 'detailed',
};

const clampMax = (v: number): number => {
  if (!Number.isFinite(v)) return DEFAULTS.maxMessages;
  return Math.max(0, Math.min(100, Math.round(v)));
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setTheme: (theme) => set({ theme }),
      setSplashStyle: (splashStyle) => set({ splashStyle }),
      setShowActions: (showActions) => set({ showActions }),
      setStreaming: (streaming) => set({ streaming }),
      setShowSuggestions: (showSuggestions) => set({ showSuggestions }),
      setConversationHistory: (conversationHistory) => set({ conversationHistory }),
      setMaxMessages: (v) => set({ maxMessages: clampMax(v) }),
      setLoadingMode: (loadingMode) => set({ loadingMode }),
    }),
    {
      name: 'pxs-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist the state fields, never the action functions.
      partialize: (s): SettingsState => ({
        theme: s.theme,
        splashStyle: s.splashStyle,
        showActions: s.showActions,
        streaming: s.streaming,
        showSuggestions: s.showSuggestions,
        conversationHistory: s.conversationHistory,
        maxMessages: s.maxMessages,
        loadingMode: s.loadingMode,
      }),
    }
  )
);
