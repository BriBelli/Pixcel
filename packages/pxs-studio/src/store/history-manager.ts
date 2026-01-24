// History Manager - Figma-style Undo/Redo System
// Tracks state changes and allows time-travel through history

import type { PXSCell } from './pxs-store';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  description: string;
  state: {
    cols: number;
    rows: number;
    cells: PXSCell[];
  };
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number;
  lastSavedIndex: number;
}

class HistoryManager {
  private entries: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxEntries: number = 50;
  private lastSavedIndex: number = -1;
  private listeners: Set<() => void> = new Set();

  constructor(maxEntries: number = 50) {
    this.maxEntries = maxEntries;
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add a new state to history
  push(action: string, description: string, state: { cols: number; rows: number; cells: PXSCell[] }): void {
    // Remove any future entries if we're not at the end
    if (this.currentIndex < this.entries.length - 1) {
      this.entries = this.entries.slice(0, this.currentIndex + 1);
    }

    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      action,
      description,
      state: {
        cols: state.cols,
        rows: state.rows,
        cells: [...state.cells], // Clone cells array
      },
    };

    this.entries.push(entry);
    this.currentIndex = this.entries.length - 1;

    // Enforce max entries limit
    if (this.entries.length > this.maxEntries) {
      const removed = this.entries.length - this.maxEntries;
      this.entries = this.entries.slice(removed);
      this.currentIndex -= removed;
      this.lastSavedIndex = Math.max(-1, this.lastSavedIndex - removed);
    }

    this.notifyListeners();
  }

  // Undo - go back in history
  undo(): HistoryEntry | null {
    if (!this.canUndo()) return null;

    this.currentIndex--;
    this.notifyListeners();
    return this.entries[this.currentIndex];
  }

  // Redo - go forward in history
  redo(): HistoryEntry | null {
    if (!this.canRedo()) return null;

    this.currentIndex++;
    this.notifyListeners();
    return this.entries[this.currentIndex];
  }

  // Jump to specific point in history
  goTo(index: number): HistoryEntry | null {
    if (index < 0 || index >= this.entries.length) return null;

    this.currentIndex = index;
    this.notifyListeners();
    return this.entries[this.currentIndex];
  }

  // Check if undo is possible
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  // Check if redo is possible
  canRedo(): boolean {
    return this.currentIndex < this.entries.length - 1;
  }

  // Get current state
  getCurrent(): HistoryEntry | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.entries.length) {
      return null;
    }
    return this.entries[this.currentIndex];
  }

  // Get all entries
  getEntries(): HistoryEntry[] {
    return [...this.entries];
  }

  // Get current index
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  // Get state info
  getState(): HistoryState {
    return {
      entries: [...this.entries],
      currentIndex: this.currentIndex,
      maxEntries: this.maxEntries,
      lastSavedIndex: this.lastSavedIndex,
    };
  }

  // Mark current state as saved
  markSaved(): void {
    this.lastSavedIndex = this.currentIndex;
    this.notifyListeners();
  }

  // Check if there are unsaved changes
  hasUnsavedChanges(): boolean {
    return this.currentIndex !== this.lastSavedIndex;
  }

  // Clear all history
  clear(): void {
    this.entries = [];
    this.currentIndex = -1;
    this.lastSavedIndex = -1;
    this.notifyListeners();
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Get undo/redo action descriptions
  getUndoDescription(): string | null {
    if (!this.canUndo()) return null;
    return this.entries[this.currentIndex].description;
  }

  getRedoDescription(): string | null {
    if (!this.canRedo()) return null;
    return this.entries[this.currentIndex + 1].description;
  }

  // Get entries count
  getCount(): number {
    return this.entries.length;
  }
}

// Singleton instance
export const historyManager = new HistoryManager(50);

// React hook for using history
export function useHistory() {
  // This will be used with useSyncExternalStore in React
  return historyManager;
}

export default historyManager;
