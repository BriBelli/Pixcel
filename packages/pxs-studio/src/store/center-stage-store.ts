'use client';

import { create } from 'zustand';
import type { PXSFrame } from './pxs-store';

/**
 * CENTER STAGE — the single "what's on the easel right now" source. BOTH engines write here:
 * Sketch (fast) and Sculpt (full cascade). The Studio center renders this — a unified live
 * experience, two performance tiers. `shimmer` shows the diffusion-style loading when there's
 * no frame yet (the model is thinking between updates).
 */
interface CenterStage {
  active: boolean;
  mode: 'sketch' | 'sculpt' | null;
  frame: PXSFrame | null;
  status: string; // 'running' | 'done' | 'paused' | 'error' | 'cancelled'
  phase?: string;
  gestures?: number;
  label: string; // a short status line
  shimmer: boolean; // render the diffusion shimmer instead of a frame
  set: (p: Partial<Omit<CenterStage, 'set' | 'clear'>>) => void;
  clear: () => void;
}

export const useCenterStage = create<CenterStage>((set) => ({
  active: false,
  mode: null,
  frame: null,
  status: '',
  label: '',
  shimmer: false,
  set: (p) => set(p),
  clear: () =>
    set({ active: false, mode: null, frame: null, status: '', phase: undefined, gestures: undefined, label: '', shimmer: false }),
}));
