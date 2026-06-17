'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GALLERY_ENTRIES } from '../data/gallery';
import type { GalleryEntry } from '../store/gallery-store';
import { useGalleryStore } from '../store/gallery-store';
import { applyGalleryFrame } from '../lib/apply-gallery-frame';
import type { GridData } from '../workers/grid.worker';
import FramePreview from './FramePreview';
import { toastManager } from './Toast';

interface ArtGalleryTabProps {
  onGridUpdate: (gridData: GridData) => void;
}

export default function ArtGalleryTab({ onGridUpdate }: ArtGalleryTabProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const userPieces = useGalleryStore((s) => s.userPieces);
  const favorites = useGalleryStore((s) => s.favorites);
  const hidden = useGalleryStore((s) => s.hidden);
  const toggleFavorite = useGalleryStore((s) => s.toggleFavorite);
  const setFavorite = useGalleryStore((s) => s.setFavorite);
  const deletePiece = useGalleryStore((s) => s.deletePiece);
  const restorePiece = useGalleryStore((s) => s.restorePiece);
  const hideBuiltin = useGalleryStore((s) => s.hideBuiltin);
  const unhideBuiltin = useGalleryStore((s) => s.unhideBuiltin);

  // Merge built-ins + user pieces, drop hidden, sort favorites first.
  const entries = useMemo(() => {
    const merged: GalleryEntry[] = [...userPieces, ...GALLERY_ENTRIES];
    return merged
      .filter((e) => !hidden.includes(e.id))
      .sort((a, b) => {
        const fa = favorites.includes(a.id) ? 1 : 0;
        const fb = favorites.includes(b.id) ? 1 : 0;
        return fb - fa;
      });
  }, [userPieces, hidden, favorites]);

  const loadEntry = (entry: GalleryEntry) => {
    const gridData = applyGalleryFrame(entry.frame, `Gallery: ${entry.title}`);
    onGridUpdate(gridData);
    setActiveId(entry.id);
  };

  // Delete (user piece) or hide (built-in) with an Undo toast — never a one-click loss.
  const removeEntry = (entry: GalleryEntry) => {
    const wasFav = favorites.includes(entry.id);
    if (activeId === entry.id) setActiveId(null);

    if (entry.builtin) {
      hideBuiltin(entry.id);
      toastManager.show(`Hid “${entry.title}”`, 'info', 6000, {
        label: 'Undo',
        onClick: () => {
          unhideBuiltin(entry.id);
          if (wasFav) setFavorite(entry.id, true);
        },
      });
    } else {
      const index = userPieces.findIndex((p) => p.id === entry.id);
      deletePiece(entry.id);
      toastManager.show(`Deleted “${entry.title}”`, 'info', 6000, {
        label: 'Undo',
        onClick: () => {
          restorePiece(entry, index < 0 ? 0 : index);
          if (wasFav) setFavorite(entry.id, true);
        },
      });
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div>
        <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
          AI Gallery
        </h3>
        <p className="mt-1 text-[10px] text-text-muted leading-relaxed">
          Click a piece to load it on the canvas. Generate new art in the{' '}
          <span className="text-accent-purple">✦ Pixcel AI</span> panel — pieces are saved
          here automatically.
        </p>
      </div>

      <ul className="space-y-1.5">
        {entries.map((entry) => {
          const isActive = activeId === entry.id;
          const isFav = favorites.includes(entry.id);
          const { cols, rows } = entry.frame;
          return (
            <li key={entry.id}>
              <div
                className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background-tertiary hover:border-border-hover hover:bg-background-overlay'
                }`}
              >
                <button
                  type="button"
                  onClick={() => loadEntry(entry)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <span className="shrink-0 w-8 h-8 rounded bg-background-primary flex items-center justify-center overflow-hidden">
                    <FramePreview frame={entry.frame} size={28} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-text-primary truncate">
                        {entry.title}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted shrink-0">
                        {cols}×{rows}
                      </span>
                    </span>
                    <span className="block text-[9px] text-text-muted truncate">
                      {entry.builtin ? 'built-in' : entry.model ? `AI · ${entry.model.replace('claude-', '')}` : 'AI'}
                    </span>
                  </span>
                </button>

                {/* Actions: overflow menu (delete, hover/focus-revealed) + persistent heart */}
                <div className="shrink-0 flex items-center gap-0.5">
                  <RowMenu
                    builtin={!!entry.builtin}
                    onRemove={() => removeEntry(entry)}
                  />

                  {/* Heart — always visible: it communicates favorite state, not just an action */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(entry.id)}
                    className={`shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors ${
                      isFav ? 'text-accent-red' : 'text-text-muted hover:text-text-primary'
                    }`}
                    aria-pressed={isFav}
                    aria-label={isFav ? `Unfavorite ${entry.title}` : `Favorite ${entry.title}`}
                    title={isFav ? 'Unfavorite' : 'Favorite'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
                    </svg>
                  </button>
                </div>
              </div>
              {isActive && entry.session && entry.session.transcript.length > 0 && (
                <div className="mt-1 ml-1 rounded-md border border-border bg-background-tertiary/60 p-2 space-y-1">
                  <div className="text-[8px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                    <span className="text-accent-purple">✦</span> studio conversation · {entry.session.mode === 'sculpt' ? 'comprehensive' : 'optimized'}
                  </div>
                  {entry.prompt && (
                    <div className="text-[9px] text-text-secondary">
                      <span className="text-primary">you →</span> {entry.prompt}
                    </div>
                  )}
                  <div className="max-h-44 overflow-y-auto space-y-0.5">
                    {entry.session.transcript.map((line, i) => (
                      <div key={i} className="text-[9px] leading-snug text-text-muted">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Per-row overflow ("⋮") menu. Houses the destructive action so it stays out of
 * the way while skimming — revealed on hover OR keyboard focus, and the menu is
 * fully keyboard-operable (Enter/Space to open, Escape to close & restore focus).
 */
function RowMenu({ builtin, onRemove }: { builtin: boolean; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (open) itemRef.current?.focus();
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        title="More actions"
        className={`w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-background-overlay transition-all ${
          open
            ? 'opacity-100 text-text-primary'
            : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Piece actions"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close(true);
            }
          }}
          className="absolute right-0 top-7 z-20 min-w-[130px] rounded-md border border-border bg-background-overlay shadow-lg py-1"
        >
          <button
            ref={itemRef}
            role="menuitem"
            type="button"
            onClick={() => {
              close(false);
              onRemove();
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-accent-red hover:bg-accent-red/10 focus:bg-accent-red/10 focus:outline-none transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
            {builtin ? 'Hide built-in' : 'Delete piece'}
          </button>
        </div>
      )}
    </div>
  );
}
