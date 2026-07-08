'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SettingsPanel — the right-side slide-over "dump" for user setting options.
 *
 * Modeled on photolif's a2ui-settings-panel (look-identical), rebuilt as OUR clean
 * tokens-only, Claude-Design React version:
 *   • 380px slide-over (max 100vw); backdrop fade + panel slide on our entrance easing.
 *   • header (title + close) · tab bar (structured for more tabs, one active today) ·
 *     scrollable body of sections → fields (label + description · control).
 *
 * Adaptations from photolif:
 *   • Model is LOCKED (Opus 4.8, managed) — shown READ-ONLY, no model dropdown, no
 *     temperature / smart-routing (all managed, per the product decision).
 *   • ONE "Settings" tab for now; Media/Video/Data-sources/Dashboard tabs are DEFERRED
 *     (they arrive with the generation PRs — see TABS below to drop them in).
 *
 * State lives in the persisted settings-store (localStorage['pxs-settings']). Two
 * fields are WIRED (theme, showActions); the rest persist for the generation PRs.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { useSettings } from '../store/settings-store';
import { modelDisplayName, DEFAULT_MODEL_ID } from './chat/model-identity';
import { Icon } from './ui';
import { Toggle } from './ui/Toggle';
import { Select } from './ui/Select';
import { NumberField } from './ui/NumberField';

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

/* The tab bar is structured as data so the deferred tabs (Media / Video / Data
   sources / Dashboard) drop in here when their generation PRs land — add an entry
   and route it in the body. Only "settings" exists today. */
type SettingsTab = 'settings';
const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'settings', label: 'Settings' },
  // FUTURE: { id: 'media', label: 'Media' }, { id: 'video', label: 'Video' },
  //         { id: 'data', label: 'Data sources' }, { id: 'dashboard', label: 'Dashboard' }
];

const CSS = `
.a2-settings-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0, 0, 0, 0.4);
  animation: a2-settings-fade 0.2s ease;
}
.a2-settings-panel {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 201;
  width: 380px; max-width: 100vw;
  display: flex; flex-direction: column;
  background: var(--a2ui-bg-primary);
  border-left: 1px solid var(--a2ui-border-subtle);
  box-shadow: var(--a2ui-shadow-xl);
  animation: a2-settings-slide 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes a2-settings-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes a2-settings-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) {
  .a2-settings-backdrop, .a2-settings-panel { animation: none; }
}

.a2-settings-header {
  display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
  padding: var(--a2ui-space-5) var(--a2ui-space-6);
  border-bottom: 1px solid var(--a2ui-border-subtle);
}
.a2-settings-title {
  margin: 0; font-size: var(--a2ui-text-lg); font-weight: var(--a2ui-font-semibold);
  color: var(--a2ui-text-primary);
}
.a2-settings-close {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: none; border: none; border-radius: var(--a2ui-radius-md);
  color: var(--a2ui-text-secondary); cursor: pointer;
  transition: background var(--a2ui-transition-fast), color var(--a2ui-transition-fast);
}
.a2-settings-close:hover { background: var(--a2ui-bg-hover); color: var(--a2ui-text-primary); }
.a2-settings-close:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }

.a2-settings-tabs {
  display: flex; gap: var(--a2ui-space-1); flex-shrink: 0;
  padding: 0 var(--a2ui-space-6);
  border-bottom: 1px solid var(--a2ui-border-subtle);
}
.a2-settings-tab {
  display: flex; align-items: center; gap: var(--a2ui-space-2);
  padding: var(--a2ui-space-3);
  background: none; border: none; border-bottom: 2px solid transparent;
  font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-medium);
  color: var(--a2ui-text-tertiary); cursor: pointer; white-space: nowrap;
  transition: color var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast);
}
.a2-settings-tab:hover { color: var(--a2ui-text-primary); }
.a2-settings-tab[data-active="true"] { color: var(--a2ui-accent); border-bottom-color: var(--a2ui-accent); }
.a2-settings-tab:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); border-radius: var(--a2ui-radius-sm); }

.a2-settings-body { flex: 1; overflow-y: auto; padding: var(--a2ui-space-6); }

.a2-settings-section { margin-bottom: var(--a2ui-space-8); }
.a2-settings-section:last-child { margin-bottom: 0; }
.a2-settings-section-label {
  margin: 0 0 var(--a2ui-space-4); font-size: 11px; font-weight: var(--a2ui-font-semibold);
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--a2ui-text-tertiary);
}
.a2-settings-section-hint {
  margin: -8px 0 var(--a2ui-space-4); font-size: 12px; line-height: 1.45; color: var(--a2ui-text-tertiary);
}

.a2-settings-field { margin-bottom: var(--a2ui-space-5); }
.a2-settings-field:last-child { margin-bottom: 0; }
.a2-settings-field-row {
  display: flex; align-items: center; justify-content: space-between; gap: var(--a2ui-space-3);
}
.a2-settings-field-info { flex: 1; min-width: 0; }
.a2-settings-field-label {
  margin: 0 0 2px; font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-medium);
  color: var(--a2ui-text-primary);
}
.a2-settings-field-desc {
  margin: 0; font-size: var(--a2ui-text-xs); line-height: 1.4; color: var(--a2ui-text-tertiary);
}

.a2-settings-divider { height: 1px; background: var(--a2ui-border-subtle); margin: var(--a2ui-space-6) 0; }

/* Read-only model row — the locked, managed model (no control). */
.a2-settings-model {
  display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px;
  background: var(--a2ui-bg-tertiary); border-radius: var(--a2ui-radius-sm);
  font-size: var(--a2ui-text-sm); color: var(--a2ui-text-secondary);
}
.a2-settings-model img { width: 14px; height: 14px; border-radius: 2px; display: block; flex-shrink: 0; }
`;

/* Reusable field row: left = label + description, right = the control. */
function Field({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="a2-settings-field">
      <div className="a2-settings-field-row">
        <div className="a2-settings-field-info">
          <p className="a2-settings-field-label">{label}</p>
          <p className="a2-settings-field-desc">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const s = useSettings();
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Focus the panel on open, restore focus to the trigger on close. Esc closes.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="a2-settings-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="a2-settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="a2-settings-header">
          <h2 className="a2-settings-title">Settings</h2>
          <button className="a2-settings-close" onClick={onClose} aria-label="Close settings">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Tab bar — one tab today; structured for the deferred generation tabs. */}
        <div className="a2-settings-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="a2-settings-tab"
              role="tab"
              aria-selected={true}
              data-active={true}
              type="button"
            >
              <Icon name="settings" size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="a2-settings-body">
          {/* ── Model (read-only, locked/managed) ── */}
          <div className="a2-settings-section">
            <p className="a2-settings-section-label">Model</p>
            <Field label="Active model" description="Managed for you.">
              <span className="a2-settings-model">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/provider-icons/anthropic.ico" alt="" width={14} height={14} />
                {modelDisplayName(DEFAULT_MODEL_ID)}
              </span>
            </Field>
          </div>

          <div className="a2-settings-divider" />

          {/* ── Appearance ── [wire: theme] ── */}
          <div className="a2-settings-section">
            <p className="a2-settings-section-label">Appearance</p>
            <Field label="Theme" description="Color theme for the studio.">
              <Select
                label="Theme"
                value={s.theme}
                onChange={(v) => s.setTheme(v as 'dark' | 'light')}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
              />
            </Field>
            <Field label="Splash hero" description="The splash landing — a personalized greeting or the logo wall.">
              <Select
                label="Splash hero"
                value={s.splashStyle}
                onChange={(v) => s.setSplashStyle(v as 'greeting' | 'logo')}
                options={[
                  { value: 'greeting', label: 'Greeting' },
                  { value: 'logo', label: 'Logo wall' },
                ]}
              />
            </Field>
          </div>

          <div className="a2-settings-divider" />

          {/* ── Chat display ── [wire: showActions] ── */}
          <div className="a2-settings-section">
            <p className="a2-settings-section-label">Chat display</p>
            <Field label="Action bar" description="Copy, regenerate, and feedback buttons.">
              <Toggle label="Action bar" checked={s.showActions} onChange={s.setShowActions} />
            </Field>
            <Field label="Stream response" description="Show AI text progressively as it generates.">
              <Toggle label="Stream response" checked={s.streaming} onChange={s.setStreaming} />
            </Field>
            <Field label="Suggestions" description="Show follow-up suggestion chips.">
              <Toggle
                label="Suggestions"
                checked={s.showSuggestions}
                onChange={s.setShowSuggestions}
              />
            </Field>
          </div>

          <div className="a2-settings-divider" />

          {/* ── Conversation ── */}
          <div className="a2-settings-section">
            <p className="a2-settings-section-label">Conversation</p>
            <Field label="History" description="Include previous messages for context.">
              <Toggle
                label="History"
                checked={s.conversationHistory}
                onChange={s.setConversationHistory}
              />
            </Field>
            <Field label="Max messages" description="Maximum previous messages to include.">
              <NumberField
                label="Max messages"
                value={s.maxMessages}
                onChange={s.setMaxMessages}
                min={0}
                max={100}
              />
            </Field>
          </div>
        </div>
      </aside>
    </>
  );
}

export default SettingsPanel;
