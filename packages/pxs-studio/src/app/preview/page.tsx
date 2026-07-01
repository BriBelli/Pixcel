'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * /preview — UI primitives review surface (PR-2).
 * Renders EVERY primitive in all 7 interactive states + the Composer, PixcelMark
 * and a strip of Icons. ADDITIVE / not wired into the app — this is the page Brian
 * eyeballs to sign off the library. Dark, IBM Plex, tokens-only.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Composer,
  Icon,
  IconButton,
  Input,
  PixcelMark,
  Tooltip,
  type IconName,
} from '../../components/ui';

const ICON_NAMES: IconName[] = [
  'send', 'paperclip', 'plus', 'x', 'check', 'chevron-down', 'search', 'settings',
  'copy', 'trash-2', 'image', 'message-square', 'user', 'sparkles', 'info',
  'refresh-cw', 'thumbs-up', 'thumbs-down', 'eye', 'download',
];

const PAGE_CSS = `
.pv-root { min-height: 100vh; background: var(--a2ui-bg-app); color: var(--a2ui-text-primary);
  font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased;
  padding: var(--a2ui-space-10) var(--a2ui-space-8) var(--a2ui-space-16); }
.pv-wrap { max-width: 920px; margin: 0 auto; }
.pv-h1 { font-size: var(--a2ui-text-3xl); font-weight: var(--a2ui-font-bold); letter-spacing: -0.01em;
  margin: 0 0 var(--a2ui-space-2); display: flex; align-items: center; gap: var(--a2ui-space-3); }
.pv-sub { color: var(--a2ui-text-secondary); font-size: var(--a2ui-text-md); margin: 0 0 var(--a2ui-space-10); }
.pv-section { margin-bottom: var(--a2ui-space-12); }
.pv-section > h2 { font-size: var(--a2ui-text-xl); font-weight: var(--a2ui-font-semibold);
  margin: 0 0 var(--a2ui-space-2); }
.pv-section > .pv-note { color: var(--a2ui-text-tertiary); font-size: var(--a2ui-text-sm);
  margin: 0 0 var(--a2ui-space-5); }
.pv-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2ui-space-4);
  margin-bottom: var(--a2ui-space-4); }
.pv-cell { display: flex; flex-direction: column; align-items: flex-start; gap: var(--a2ui-space-2); }
.pv-label { font-family: var(--a2ui-font-mono); font-size: var(--a2ui-text-xs);
  color: var(--a2ui-text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; }
.pv-hr { height: 1px; background: var(--a2ui-border-subtle); border: 0; margin: var(--a2ui-space-8) 0; }
.pv-icongrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: var(--a2ui-space-3); }
.pv-iconcell { display: flex; flex-direction: column; align-items: center; gap: var(--a2ui-space-2);
  padding: var(--a2ui-space-3); border-radius: var(--a2ui-radius-md); color: var(--a2ui-text-secondary); }
.pv-iconcell span { font-family: var(--a2ui-font-mono); font-size: 10px; color: var(--a2ui-text-tertiary); }
.pv-grid2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--a2ui-space-4); }
.pv-composer { max-width: 640px; }
`;

/** A labeled column wrapping one state of a component. */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pv-cell">
      <span className="pv-label">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="pv-section">
      <h2>{title}</h2>
      {note && <p className="pv-note">{note}</p>}
      {children}
    </section>
  );
}

export default function PreviewPage() {
  const [composer, setComposer] = useState('');
  const [composerBusy, setComposerBusy] = useState('');
  const [input, setInput] = useState('');

  // The 7 canonical states each interactive component must cover.
  const STATES = ['default', 'hover', 'focus', 'active', 'disabled', 'loading', 'error'] as const;

  return (
    <div className="pv-root">
      <style>{PAGE_CSS}</style>
      <div className="pv-wrap">
        <h1 className="pv-h1">
          <PixcelMark size={30} style={{ color: 'var(--a2ui-accent)' }} />
          UI primitives
        </h1>
        <p className="pv-sub">
          The shared token-driven library — every interactive component in all seven states. Additive; not yet wired
          into the app. Hover, tab-focus, and press the live cells to verify the halo, elevation, and no scale-pop.
        </p>

        {/* PixcelMark */}
        <Section title="Pixcel mark" note="currentColor-tintable; inline <use> so color cascades.">
          <div className="pv-row">
            <Cell label="18"><PixcelMark size={18} /></Cell>
            <Cell label="24"><PixcelMark size={24} /></Cell>
            <Cell label="40"><PixcelMark size={40} /></Cell>
            <Cell label="accent"><PixcelMark size={40} style={{ color: 'var(--a2ui-accent)' }} /></Cell>
            <Cell label="secondary"><PixcelMark size={40} style={{ color: 'var(--a2ui-text-secondary)' }} /></Cell>
          </div>
        </Section>

        {/* Icons */}
        <Section title="Icons" note="Lucide line glyphs — viewBox 0 0 24 24, stroke=currentColor, stroke-width 2, no fills.">
          <div className="pv-icongrid">
            {ICON_NAMES.map((n) => (
              <div key={n} className="pv-iconcell">
                <Icon name={n} size={22} />
                <span>{n}</span>
              </div>
            ))}
          </div>
        </Section>

        <hr className="pv-hr" />

        {/* Button — every variant across all 7 states */}
        <Section title="Button" note="primary / secondary / ghost — fill/hover/press are token overlays (no scale-pop), focus is a 2px halo.">
          {(['primary', 'secondary', 'ghost'] as const).map((variant) => (
            <div key={variant} style={{ marginBottom: 20 }}>
              <p className="pv-label" style={{ marginBottom: 8 }}>{variant}</p>
              <div className="pv-row">
                {STATES.map((s) => (
                  <Cell key={s} label={s}>
                    <Button
                      variant={variant}
                      disabled={s === 'disabled'}
                      loading={s === 'loading'}
                      error={s === 'error'}
                    >
                      Continue
                    </Button>
                  </Cell>
                ))}
              </div>
            </div>
          ))}
          <p className="pv-note" style={{ marginTop: 4 }}>
            (hover / focus / active are live — mouse over, tab to, and press the default cell above.)
          </p>
        </Section>

        <hr className="pv-hr" />

        {/* IconButton */}
        <Section title="Icon button" note="square, ghost by default — 7 states; press uses bg-active, focus a halo.">
          {(['ghost', 'subtle', 'primary'] as const).map((variant) => (
            <div key={variant} style={{ marginBottom: 16 }}>
              <p className="pv-label" style={{ marginBottom: 8 }}>{variant}</p>
              <div className="pv-row">
                {STATES.map((s) => (
                  <Cell key={s} label={s}>
                    <IconButton
                      icon="settings"
                      label="Settings"
                      variant={variant}
                      disabled={s === 'disabled'}
                      loading={s === 'loading'}
                      error={s === 'error'}
                      active={s === 'active'}
                    />
                  </Cell>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <hr className="pv-hr" />

        {/* Input */}
        <Section title="Input" note="bg-input, alpha border; focus shifts border to accent + 2px halo (never outline).">
          <div className="pv-grid2">
            {STATES.map((s) => (
              <Cell key={s} label={s}>
                <Input
                  placeholder="Type something…"
                  defaultValue={s === 'active' || s === 'focus' ? 'A charcoal draft' : undefined}
                  value={s === 'default' ? input : undefined}
                  onChange={s === 'default' ? (e) => setInput(e.target.value) : undefined}
                  disabled={s === 'disabled'}
                  loading={s === 'loading'}
                  error={s === 'error'}
                  errorMessage={s === 'error' ? 'Invalid value. Please try again.' : undefined}
                />
              </Cell>
            ))}
          </div>
        </Section>

        <hr className="pv-hr" />

        {/* Chip */}
        <Section title="Chip" note="full radius; default + selected(active) + hover/press/focus states.">
          <div className="pv-row">
            <Cell label="default"><Chip>All models</Chip></Cell>
            <Cell label="active"><Chip active>Fast</Chip></Cell>
            <Cell label="with icon"><Chip><Icon name="sparkles" size={14} />Sparkle</Chip></Cell>
            <Cell label="disabled"><Chip disabled>Locked</Chip></Cell>
          </div>
          <p className="pv-note" style={{ marginTop: 4 }}>(hover / focus / active-press are live on the cells above.)</p>
        </Section>

        <hr className="pv-hr" />

        {/* Card */}
        <Section title="Card" note="bg-tertiary, 12px radius, 20px pad — NO border/shadow default; interactive earns border + shadow-sm on hover.">
          <div className="pv-grid2">
            <Cell label="static">
              <Card style={{ width: '100%' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Reference sheet</div>
                <div style={{ color: 'var(--a2ui-text-secondary)', fontSize: 13 }}>
                  A reusable, multi-angle asset. Static surface — no hover treatment.
                </div>
              </Card>
            </Cell>
            <Cell label="interactive (hover / focus / press)">
              <Card interactive style={{ width: '100%' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Open in Studio</div>
                <div style={{ color: 'var(--a2ui-text-secondary)', fontSize: 13 }}>
                  Hover, tab to, or press me — I earn a border and soft shadow.
                </div>
              </Card>
            </Cell>
          </div>
        </Section>

        <hr className="pv-hr" />

        {/* Avatar */}
        <Section title="Avatar" note="round, image or initial/glyph fallback; interactive gains hover border + focus halo.">
          <div className="pv-row">
            <Cell label="glyph fallback"><Avatar size={40} /></Cell>
            <Cell label="initial"><Avatar size={40} name="Brian" /></Cell>
            <Cell label="interactive"><Avatar size={40} name="Pixcel" interactive /></Cell>
            <Cell label="28"><Avatar size={28} name="A" /></Cell>
          </div>
        </Section>

        <hr className="pv-hr" />

        {/* Tooltip */}
        <Section title="Tooltip" note="glass float chrome (blur + 8% white border + shadow-lg); shows on hover AND focus.">
          <div className="pv-row">
            <Cell label="top">
              <Tooltip label="Regenerate" side="top">
                <IconButton icon="refresh-cw" label="Regenerate" variant="subtle" />
              </Tooltip>
            </Cell>
            <Cell label="right">
              <Tooltip label="Download frame" side="right">
                <IconButton icon="download" label="Download" variant="subtle" />
              </Tooltip>
            </Cell>
            <Cell label="bottom">
              <Tooltip label="Delete — cannot be undone" side="bottom">
                <IconButton icon="trash-2" label="Delete" variant="subtle" error />
              </Tooltip>
            </Cell>
          </div>
        </Section>

        <hr className="pv-hr" />

        {/* Composer */}
        <Section
          title="Composer"
          note="The reusable prompt bar (matched to the splash prompt bar). Attach · growing textarea · send. No model picker / quality pill / footer — deferred."
        >
          <div className="pv-composer" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Cell label="default (Enter submits, Shift+Enter newline)">
              <Composer
                value={composer}
                onChange={setComposer}
                onSubmit={(v) => setComposer(`submitted: ${v}`)}
                mode="chat"
              />
            </Cell>
            <Cell label="busy (loading)">
              <Composer value={composerBusy} onChange={setComposerBusy} onSubmit={() => {}} busy />
            </Cell>
            <Cell label="disabled">
              <Composer value="" onChange={() => {}} onSubmit={() => {}} disabled placeholder="Sign in to compose" />
            </Cell>
            <Cell label="error">
              <Composer value="over the limit" onChange={() => {}} onSubmit={() => {}} error />
            </Cell>
          </div>
        </Section>
      </div>
    </div>
  );
}
