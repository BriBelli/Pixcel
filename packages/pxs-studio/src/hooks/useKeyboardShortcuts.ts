'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePXSStore } from '../store/pxs-store';
import { useHistoryManager } from './useHistoryManager';
import { useAutoSave } from './useAutoSave';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

// Detect OS for proper modifier key display
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? 'Cmd' : 'Ctrl';

export function useKeyboardShortcuts() {
  const { actions, ui, grid, animation } = usePXSStore();
  const { undo, redo, canUndo, canRedo } = useHistoryManager();
  const { saveNow } = useAutoSave();

  // Define all shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // History
    {
      key: 'z',
      ctrl: true,
      description: `${modKey}+Z: Undo`,
      action: () => {
        if (canUndo) undo();
      },
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      description: `${modKey}+Shift+Z: Redo`,
      action: () => {
        if (canRedo) redo();
      },
    },
    {
      key: 'y',
      ctrl: true,
      description: `${modKey}+Y: Redo (Alt)`,
      action: () => {
        if (canRedo) redo();
      },
    },

    // Save
    {
      key: 's',
      ctrl: true,
      description: `${modKey}+S: Save`,
      action: () => {
        saveNow();
      },
    },

    // Tools
    {
      key: 'p',
      description: 'P: Pen Tool',
      action: () => actions.setActiveTool('pen'),
    },
    {
      key: 'f',
      description: 'F: Fill Tool',
      action: () => actions.setActiveTool('fill'),
    },
    {
      key: 'e',
      description: 'E: Eraser Tool',
      action: () => actions.setActiveTool('eraser'),
    },
    {
      key: 'v',
      description: 'V: Select Tool',
      action: () => actions.setActiveTool('select'),
    },
    {
      key: 'i',
      description: 'I: Eyedropper Tool',
      action: () => actions.setActiveTool('eyedropper'),
    },

    // View
    {
      key: 'b',
      description: 'B: Toggle Borders',
      action: () => actions.toggleBorders(),
    },
    {
      key: 'Tab',
      description: 'Tab: Toggle Sidebar',
      action: () => actions.toggleSidebar(),
    },

    // Tabs
    {
      key: '1',
      description: '1: Resolution Tab',
      action: () => actions.setActiveTab('resolution'),
    },
    {
      key: '2',
      description: '2: Image Tab',
      action: () => actions.setActiveTab('image'),
    },
    {
      key: '3',
      description: '3: Animation Tab',
      action: () => actions.setActiveTab('animation'),
    },

    // Animation Playback
    {
      key: ' ', // Space
      description: 'Space: Play/Pause Animation',
      action: () => {
        if (animation.playing) {
          actions.pauseAnimation();
        } else {
          actions.playAnimation();
        }
      },
    },
    {
      key: 'ArrowLeft',
      description: '←: Previous Frame',
      action: () => actions.prevFrame(),
    },
    {
      key: 'ArrowRight',
      description: '→: Next Frame',
      action: () => actions.nextFrame(),
    },
    {
      key: 'Home',
      description: 'Home: First Frame',
      action: () => actions.goToFrame(0),
    },
    {
      key: 'End',
      description: 'End: Last Frame',
      action: () => actions.goToFrame(animation.frames.length - 1),
    },

    // Duplicate frame
    {
      key: 'd',
      ctrl: true,
      description: `${modKey}+D: Duplicate Frame`,
      action: () => {
        if (animation.frames.length > 0) {
          actions.duplicateFrame(animation.currentFrame);
        }
      },
    },

    // Delete frame
    {
      key: 'Delete',
      description: 'Delete: Remove Frame',
      action: () => {
        if (animation.frames.length > 1) {
          actions.removeFrame(animation.currentFrame);
        }
      },
    },
    {
      key: 'Backspace',
      description: 'Backspace: Remove Frame',
      action: () => {
        if (animation.frames.length > 1) {
          actions.removeFrame(animation.currentFrame);
        }
      },
    },

    // Inspector
    {
      key: 'Escape',
      description: 'Esc: Close Inspector/Modal',
      action: () => {
        if (ui.inspectorOpen) {
          actions.closeInspector();
        }
      },
    },
  ];

  // Handle keyboard events
  // Keep the latest shortcuts in a ref so the keydown handler stays STABLE (no listener churn
  // on every render) while always seeing the current action closures (store/history values).
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const matchedShortcut = shortcutsRef.current.find((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                        event.key === shortcut.key;
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchedShortcut) {
        event.preventDefault();
        matchedShortcut.action();
      }
    },
    []
  );

  // Register keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Return shortcuts for display in UI
  return {
    shortcuts,
    modKey,
  };
}

export default useKeyboardShortcuts;
