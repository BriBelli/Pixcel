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
import { useChatTurnsStore, a2uiSurface, type A2UIReferencesBlock, type A2UIBuilderBlock } from '../store/chat-turns-store';
import { useSettings } from '../store/settings-store';
import { Composer, type ComposerAttachment } from './ui';
import { MessageTurn } from './chat/MessageTurn';
import { ImageStage, type StageImage } from './chat/ImageStage';
import { PromptGuidePanel } from './chat/PromptGuidePanel';
import { BuilderPanel } from './chat/BuilderPanel';

interface Props {
  /** The prompt typed on the splash (front door). Auto-sent once on mount. */
  initialPrompt?: string;
}

/** The chat column cap (rule #8 — capped, never full-bleed). */
const COLUMN_STYLE = { maxWidth: 'var(--a2ui-chat-max-width)' } as const;

/* CONTENT-ONLY (PR-8): the persistent NavRail + DigitalWall + SettingsPanel live in the shell
   (app/page.tsx). This renders only the conversation / workspace over that shell; the shell's
   dormant wall shows behind (no local backdrop). */
export default function ChatView({ initialPrompt }: Props) {
  const turns = useChatTurnsStore((s) => s.turns);
  const activeMedium = useChatTurnsStore((s) => s.activeMedium);
  const activeFrame = useChatTurnsStore((s) => s.activeFrame);
  const setActiveMedium = useChatTurnsStore((s) => s.setActiveMedium);
  const send = useChatTurnsStore((s) => s.send);
  const loadThread = useChatTurnsStore((s) => s.loadThread);
  const deleteTurn = useChatTurnsStore((s) => s.deleteTurn);
  const reset = useChatTurnsStore((s) => s.reset);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  // showActions gates the MessageActions footer per turn. (Theme is applied to <html> by the shell.)
  const showActions = useSettings((st) => st.showActions);

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

  // SLOTS-NOT-SCREENS: the latest 'controls'-surface block (the model/reference guide) is lifted
  // out of the message scroll into the workspace's Prompt Guide panel. Scan newest-first so the
  // panel always reflects the CURRENT pass. Only references blocks route to controls today.
  const controlsBlock = [...turns]
    .reverse()
    .map((t) => t.a2ui)
    .find((b): b is A2UIReferencesBlock => b != null && a2uiSurface(b) === 'controls') ?? null;

  // The center Prompt Builder (canvas surface) — the latest structured consult + its source turn (so
  // a new consult remounts the panel with fresh shaping state). PR-10a.
  const builder = (() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const b = turns[i].a2ui;
      if (b && b.kind === 'builder' && a2uiSurface(b) === 'canvas') {
        return { block: b as A2UIBuilderBlock, turnId: turns[i].id };
      }
    }
    return null;
  })();

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
                  // In the workspace (uncapped) the controls card is lifted to the Prompt Guide
                  // panel, so suppress it inline. Chat home (capped) has no panel → render inline.
                  renderControlsInline={capped}
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
    <div
      className="relative flex min-w-0 h-full w-full"
      style={{ color: 'var(--a2ui-text-primary)', fontFamily: 'var(--a2ui-font-family)' }}
    >
      {inWorkspace ? (
        /* ── WORKSPACE surface — the transfer lands here: center stage (generated images LARGE) +
              the conversation continuing in a right pane. This is what makes a transfer read as a
              WORKFLOW, not a dead-end in the chat scroll. ── */
        <div className="relative flex-1 flex min-w-0">
          {/* Center stage — one slot, two view templates: the Prompt Builder while SHAPING (a
              structured consult exists and nothing's rendered yet), the image gallery once Render
              fires and tiles stream. */}
          {builder && stageImages.length === 0 && !generating ? (
            <BuilderPanel
              key={builder.turnId}
              block={builder.block}
              busy={generating}
              onRender={(prompt, references) => send(prompt, references)}
            />
          ) : (
            <ImageStage
              images={stageImages}
              generating={generating}
              medium={workspaceMedium}
              contextLabel={activeFrame?.subject || activeFrame?.goal}
            />
          )}
          <aside
            className="w-[400px] shrink-0 flex flex-col min-h-0"
            style={{ borderLeft: '1px solid var(--a2ui-border-subtle)', background: 'var(--a2ui-bg-app)' }}
          >
            {/* CONTROLS slot — the Prompt Guide, pinned above the conversation (out of the scroll).
                Shows the current pass's model/reference guide; collapsible to reclaim height. */}
            {controlsBlock && <PromptGuidePanel block={controlsBlock} />}
            {conversation(false)}
          </aside>
        </div>
      ) : (
        /* Chat column — floats over the shell's dormant DigitalWall (no local backdrop). */
        <div className="relative flex-1 flex flex-col min-w-0">{conversation(true)}</div>
      )}
    </div>
  );
}
