import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PXSFrame } from './pxs-store';

/** A gallery piece — built-in (seeded JSON) or AI/user-generated at runtime. */
export interface GalleryEntry {
  id: string;
  title: string;
  prompt: string;
  /** Who wrote the prompt vs who composed the pixels. */
  promptBy: 'human' | 'ai-composer';
  composedBy: 'human' | 'ai-composer';
  frame: PXSFrame;
  /** True for the seeded built-ins shipped in src/data/gallery. */
  builtin?: boolean;
  createdAt?: number;
  model?: string;
}

interface GalleryStore {
  /** AI/user-generated pieces (built-ins live in src/data/gallery). */
  userPieces: GalleryEntry[];
  /** Favorited ids (built-in or user). */
  favorites: string[];
  /** "Deleted" built-in ids — hidden, never destroyed. */
  hidden: string[];

  addPiece: (entry: GalleryEntry) => void;
  deletePiece: (id: string) => void;
  /** Re-insert a deleted user piece at its original index (undo of deletePiece). */
  restorePiece: (entry: GalleryEntry, index: number) => void;
  toggleFavorite: (id: string) => void;
  setFavorite: (id: string, value: boolean) => void;
  hideBuiltin: (id: string) => void;
  /** Reveal a hidden built-in (undo of hideBuiltin). */
  unhideBuiltin: (id: string) => void;
}

/**
 * Local-first persistence (docs/AI-GALLERY.md). Frames are small (16–32px) so
 * localStorage is sufficient; the shape leaves room for a DynamoDB sync hook later.
 */
export const useGalleryStore = create<GalleryStore>()(
  persist(
    (set) => ({
      userPieces: [],
      favorites: [],
      hidden: [],

      addPiece: (entry) =>
        set((s) => ({ userPieces: [entry, ...s.userPieces] })),

      deletePiece: (id) =>
        set((s) => ({
          userPieces: s.userPieces.filter((p) => p.id !== id),
          favorites: s.favorites.filter((f) => f !== id),
        })),

      restorePiece: (entry, index) =>
        set((s) => {
          if (s.userPieces.some((p) => p.id === entry.id)) return s;
          const userPieces = [...s.userPieces];
          userPieces.splice(Math.max(0, Math.min(index, userPieces.length)), 0, entry);
          return { userPieces };
        }),

      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),

      setFavorite: (id, value) =>
        set((s) => ({
          favorites: value
            ? s.favorites.includes(id)
              ? s.favorites
              : [...s.favorites, id]
            : s.favorites.filter((f) => f !== id),
        })),

      hideBuiltin: (id) =>
        set((s) => ({
          hidden: s.hidden.includes(id) ? s.hidden : [...s.hidden, id],
          favorites: s.favorites.filter((f) => f !== id),
        })),

      unhideBuiltin: (id) =>
        set((s) => ({ hidden: s.hidden.filter((h) => h !== id) })),
    }),
    {
      name: 'pxs-ai-gallery',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
