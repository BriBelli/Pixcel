'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * ChatView — the chat-orchestrator front door (PR-4a: design-true shell).
 *
 * The splash prompt lands HERE (the Operator conversation), rendered ABOVE the
 * persistent <DigitalWall> (z-0) so the same LED-wall backdrop continues behind the
 * chat. Each turn is composed on the PR-2 primitives via <MessageTurn>: the user
 * bubble, the assistant identity badge ("Opus 4.8"), the pre-text plan rows, the
 * streamed text + a blinking block cursor, the stub A2UI options (Button/Card), and
 * follow-up suggestion chips. A <Composer> at the bottom sends follow-up turns.
 *
 * Rebuilt to the Claude Design standard (PR-4a): the bespoke CHAT_CSS promptbar /
 * option / chip / user-bubble rules are gone — everything routes through the
 * tokens-only primitives. The chat column is HARD-CAPPED at --a2ui-chat-max-width
 * (rule #8, never full-bleed); the wall stays full-bleed behind at z-0.
 *
 * PR-4a wires the bones only: option choices that pick a medium enter the full
 * Studio; other choices / suggestions continue the chat. DB persistence + edit /
 * delete / regenerate land in PR-4b.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import NavRail from './NavRail';
import SettingsPanel from './SettingsPanel';
import { useChatTurnsStore } from '../store/chat-turns-store';
import { useSettings } from '../store/settings-store';
import { Composer, type ComposerAttachment } from './ui';
import { MessageTurn } from './chat/MessageTurn';
import { ImageStage, type StageImage } from './chat/ImageStage';

interface Props {
  /** The prompt typed on the splash (front door). Auto-sent once on mount. */
  initialPrompt?: string;
  /** Enter the full Studio (the art IDE) — e.g. from a nav item or an option choice. */
  onEnterStudio: (prompt?: string) => void;
  /** Back to the splash. */
  onHome?: () => void;
}

const ROOT_CSS = `
.pxc-root { background: var(--a2ui-bg-app); color: var(--a2ui-text-primary);
  font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }
.pxc-root ::selection { background: var(--a2ui-accent-subtle); }

/* Chat backdrop — a clean solid charcoal (the root bg) with a BARELY-perceptible
   ambient drift: two faint accent-tinted radial glows that slowly breathe + rise.
   Tasteful, almost-not-there — no LED lattice, no frozen frame. Reduced-motion → still. */
.pxc-ambient {
  background:
    radial-gradient(58% 46% at 50% 6%,  color-mix(in srgb, var(--a2ui-accent) 5%,   transparent), transparent 70%),
    radial-gradient(52% 42% at 84% 96%, color-mix(in srgb, var(--a2ui-accent) 3.5%, transparent), transparent 66%);
  animation: pxc-ambient-breathe 26s ease-in-out infinite alternate;
  will-change: opacity, transform;
}
@keyframes pxc-ambient-breathe {
  from { opacity: 0.5;  transform: translate3d(0, 0, 0)     scale(1); }
  to   { opacity: 1;    transform: translate3d(0, -1.2%, 0) scale(1.06); }
}
@media (prefers-reduced-motion: reduce) {
  .pxc-ambient { animation: none; opacity: 0.7; }
}
`;

/** The chat column cap (rule #8 — capped, never full-bleed). */
const COLUMN_STYLE = { maxWidth: 'var(--a2ui-chat-max-width)' } as const;

export default function ChatView({ initialPrompt, onEnterStudio, onHome }: Props) {
  const turns = useChatTurnsStore((s) => s.turns);
  const activeMedium = useChatTurnsStore((s) => s.activeMedium);
  const activeFrame = useChatTurnsStore((s) => s.activeFrame);
  const setActiveMedium = useChatTurnsStore((s) => s.setActiveMedium);
  const send = useChatTurnsStore((s) => s.send);
  const loadThread = useChatTurnsStore((s) => s.loadThread);
  const deleteTurn = useChatTurnsStore((s) => s.deleteTurn);
  const reset = useChatTurnsStore((s) => s.reset);

  const [draft, setDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  // Settings the chat honors directly (the two WIRED fields):
  //  • theme       → applied to <html data-theme> below (tokens.css swaps dark/light)
  //  • showActions → gates the MessageActions footer per turn
  const theme = useSettings((st) => st.theme);
  const showActions = useSettings((st) => st.showActions);

  // Apply the persisted theme to <html> on mount + whenever it changes.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // On mount, run exactly once (sent-once ref):
  //  • a splash prompt present → send it (a NEW conversation).
  //  • otherwise, if a thread id was persisted last session → RESTORE it from the SQLite store,
  //    so a plain reload / reopening chat brings the last conversation back.
  useEffect(() => {
    if (sentInitial.current) return;
    const p = initialPrompt?.trim();
    if (p) {
      // Fresh conversation from the splash → reset first so this starts a NEW thread
      // (never appends onto a thread left over from an earlier chat this session).
      sentInitial.current = true;
      reset();
      send(p);
      return;
    }
    if (typeof window === 'undefined') return;
    const storedId = window.localStorage.getItem('pxs-chat-thread');
    if (storedId) {
      sentInitial.current = true;
      void loadThread(storedId);
    }
  }, [initialPrompt, send, loadThread, reset]);

  // Keep the conversation scrolled to the latest as it streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const submit = useCallback(
    (text: string, attachments?: ComposerAttachment[]) => {
      const t = text.trim();
      const refs = attachments?.map((a) => a.dataUrl).filter(Boolean) ?? [];
      if (!t && refs.length === 0) return;
      send(t, refs);
      setDraft('');
    },
    [send]
  );

  // The workspace surface is on whenever a specialist medium is active (Image/Video). It's entered
  // by a TRANSFER, a transfer CTA click, or the nav Image/Video item — never a dead-end.
  const inWorkspace = activeMedium !== 'chat';
  const workspaceMedium: 'image' | 'video' = activeMedium === 'video' ? 'video' : 'image';

  // Every generated image across the conversation, newest first — the workspace stage's content.
  const stageImages: StageImage[] = [...turns]
    .reverse()
    .flatMap((t) => t.images.map((img) => ({ ...img, turnId: t.id })));
  const generating = turns.some((t) => t.generating);

  const openWorkflow = useCallback(
    (medium: 'image' | 'video') => setActiveMedium(medium),
    [setActiveMedium]
  );

  // Home / Chat from WITHIN a workspace returns to the conversation column; from the plain chat it
  // goes all the way home (the splash). So the front door never traps you in a specialist surface.
  const handleHome = useCallback(() => {
    if (inWorkspace) setActiveMedium('chat');
    else onHome?.();
  }, [inWorkspace, setActiveMedium, onHome]);

  // The conversation (scrollable turns + composer) — shared by the chat column and the workspace's
  // right pane. `capped` centers it under the chat-width cap (chat home); the pane fills its column.
  const conversation = (capped: boolean) => (
    <div className="relative z-10 flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className={capped ? 'mx-auto w-full px-6 py-8' : 'w-full px-5 py-6'} style={capped ? COLUMN_STYLE : undefined}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--a2ui-space-6)' }}>
            {turns.map((t, i) => {
              const isLast = i === turns.length - 1;
              const isDone = t.status === 'done';
              // Delete + regenerate act on the LAST turn only. Delete additionally
              // requires a persisted turn (has an interactionId). Copy is on every done turn.
              const canDelete = isLast && isDone && Boolean(t.interactionId);
              const canRegenerate = isLast && isDone && Boolean(t.userPrompt);
              return (
                <MessageTurn
                  key={t.id}
                  turn={t}
                  showActions={showActions}
                  onSuggestion={submit}
                  onOpenWorkflow={openWorkflow}
                  // Copy the assistant text to the clipboard (silent on failure).
                  onCopy={() => navigator.clipboard.writeText(t.text).catch(() => {})}
                  // Regenerate = re-send this turn's userPrompt → appends a fresh turn.
                  // NOTE: this SPENDS a model call (expected for a regenerate button).
                  onRegenerate={canRegenerate ? () => send(t.userPrompt) : undefined}
                  onDelete={canDelete ? () => deleteTurn(t.interactionId!) : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Composer — the PR-2 primitive, column-capped in chat, pane-width in the workspace. */}
      <div className={capped ? 'shrink-0 px-6 pb-6 pt-2' : 'shrink-0 px-5 pb-5 pt-2'}>
        <div className={capped ? 'mx-auto w-full' : 'w-full'} style={capped ? COLUMN_STYLE : undefined}>
          {/* Attach references only in the workspace (the Image agent consumes them); the chat
              front door doesn't route references yet. */}
          <Composer value={draft} onChange={setDraft} onSubmit={submit} attachEnabled={!capped} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="pxc-root flex h-screen overflow-hidden">
      <style>{ROOT_CSS}</style>

      <NavRail
        activeSection={activeMedium}
        onHome={handleHome}
        onSection={(id) =>
          id === 'image' || id === 'video'
            ? setActiveMedium(id)
            : setActiveMedium('chat')
        }
        onUtility={() => onEnterStudio()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {inWorkspace ? (
        /* ── WORKSPACE surface — the transfer lands here: center stage (generated images LARGE) +
              the conversation continuing in a right pane. This is what makes a transfer read as a
              WORKFLOW, not a dead-end in the chat scroll. ── */
        <div className="relative flex-1 flex min-w-0">
          <ImageStage
            images={stageImages}
            generating={generating}
            medium={workspaceMedium}
            contextLabel={activeFrame?.subject || activeFrame?.goal}
          />
          <aside
            className="w-[400px] shrink-0 flex flex-col min-h-0"
            style={{ borderLeft: '1px solid var(--a2ui-border-subtle)', background: 'var(--a2ui-bg-app)' }}
          >
            {conversation(false)}
          </aside>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col min-w-0">
          {/* z-0 — the Pixcel digital wall, full-bleed BEHIND the chat, but DORMANT here: the logo is
              OFF (showLogo=false — logoScale can't remove it, it floors to native width) and intensity
              is very low, so it's ambient texture that never competes with the conversation. This is
              the settled END-STATE; the animated hand-off that eases the wall into it is lifecycle work. */}
          {/* Chat backdrop — solid charcoal (the root) + a barely-there ambient drift (.pxc-ambient).
              Replaces the frozen low-res LED wall that read as static grey blotches. */}
          <div className="pxc-ambient pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
          {conversation(true)}
        </div>
      )}
    </div>
  );
}
