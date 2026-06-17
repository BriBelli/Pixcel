'use client';

import { create } from 'zustand';
import type { PXSFrame } from './pxs-store';

/**
 * CENTER STAGE — the artist's studio at the center easel. The live drawing AND the artisan
 * workflow (thinking + the studio feed of gestures/reviews) all render here, together, as one
 * experience. The right-side chat is reserved for high-level conversation only. Both engines
 * (Optimized + Comprehensive) write here.
 */
export interface StageFeedItem {
  kind: 'phase' | 'gesture' | 'review' | 'recall' | 'done' | 'user';
  text: string;
  gesture?: number;
  phase?: string;
  approved?: boolean;
}

interface CenterStage {
  active: boolean;
  mode: 'sketch' | 'sculpt' | null;
  frame: PXSFrame | null;
  status: string;
  phase?: string;
  gestures?: number;
  label: string;
  shimmer: boolean;
  thinking: string; // the artist's live reasoning
  feed: StageFeedItem[]; // gestures / reviews / phases — the workflow timeline
  set: (p: Partial<Omit<CenterStage, 'set' | 'clear' | 'addFeed'>>) => void;
  addFeed: (item: StageFeedItem) => void;
  clear: () => void;
}

export const useCenterStage = create<CenterStage>((set) => ({
  active: false,
  mode: null,
  frame: null,
  status: '',
  label: '',
  shimmer: false,
  thinking: '',
  feed: [],
  set: (p) => set(p),
  addFeed: (item) => set((s) => ({ feed: [...s.feed.slice(-119), item] })),
  clear: () =>
    set({ active: false, mode: null, frame: null, status: '', phase: undefined, gestures: undefined, label: '', shimmer: false, thinking: '', feed: [] }),
}));
