'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import historyManager, { type HistoryEntry, type HistoryState } from '../store/history-manager';
import { usePXSStore } from '../store/pxs-store';

// Hook to use the history manager with React
export function useHistoryManager() {
  // Track state with simple useState instead of useSyncExternalStore
  const [, forceUpdate] = useState({});
  const stateRef = useRef<HistoryState>(historyManager.getState());

  // Subscribe to history changes
  useEffect(() => {
    const unsubscribe = historyManager.subscribe(() => {
      stateRef.current = historyManager.getState();
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  // Push current state to history
  const pushState = useCallback(
    (action: string, description: string) => {
      const { grid } = usePXSStore.getState();
      const cells = Array.from(grid.cells.values());
      
      historyManager.push(action, description, {
        cols: grid.cols,
        rows: grid.rows,
        cells,
      });
    },
    []
  );

  // Apply a history entry to the current state
  const applyHistoryEntry = useCallback((entry: HistoryEntry) => {
    const cellsMap = new Map();
    entry.state.cells.forEach((cell) => {
      cellsMap.set(`${cell.x}-${cell.y}`, cell);
    });

    usePXSStore.setState((state) => ({
      grid: {
        ...state.grid,
        cols: entry.state.cols,
        rows: entry.state.rows,
        cells: cellsMap,
      },
    }));
  }, []);

  // Undo action
  const undo = useCallback(() => {
    const entry = historyManager.undo();
    if (entry) {
      applyHistoryEntry(entry);
    }
    return entry;
  }, [applyHistoryEntry]);

  // Redo action
  const redo = useCallback(() => {
    const entry = historyManager.redo();
    if (entry) {
      applyHistoryEntry(entry);
    }
    return entry;
  }, [applyHistoryEntry]);

  // Jump to specific history point
  const goTo = useCallback((index: number) => {
    const entry = historyManager.goTo(index);
    if (entry) {
      applyHistoryEntry(entry);
    }
    return entry;
  }, [applyHistoryEntry]);

  return {
    // State
    entries: stateRef.current.entries,
    currentIndex: stateRef.current.currentIndex,
    canUndo: historyManager.canUndo(),
    canRedo: historyManager.canRedo(),
    hasUnsavedChanges: historyManager.hasUnsavedChanges(),
    undoDescription: historyManager.getUndoDescription(),
    redoDescription: historyManager.getRedoDescription(),
    count: stateRef.current.entries.length,

    // Actions
    pushState,
    undo,
    redo,
    goTo,
    markSaved: historyManager.markSaved.bind(historyManager),
    clear: historyManager.clear.bind(historyManager),
  };
}

export default useHistoryManager;
