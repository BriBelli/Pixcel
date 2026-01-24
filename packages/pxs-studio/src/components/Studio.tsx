'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePXSStore, selectGrid, selectUI, selectActions } from '../store/pxs-store';
import GridCanvas from './GridCanvas';
import ResolutionTab from './ResolutionTab';
import ImageTab from './ImageTab';
import AnimationTab from './AnimationTab';
import { ToastContainer, useToasts, toastManager } from './Toast';
import { useHistoryManager } from '../hooks/useHistoryManager';
import { useAutoSave } from '../hooks/useAutoSave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import historyManager from '../store/history-manager';
import type { GridData } from '../workers/grid.worker';

export default function Studio({ children }: { children?: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridData, setGridData] = useState<GridData | null>(null);

  const grid = usePXSStore(selectGrid);
  const ui = usePXSStore(selectUI);
  const actions = usePXSStore(selectActions);
  
  // History & Auto-save hooks
  const { canUndo, canRedo, undo, redo, hasUnsavedChanges, undoDescription, redoDescription } = useHistoryManager();
  const { formatTimeSinceLastSave, saveNow, isInitialized: autoSaveInitialized } = useAutoSave();
  const { modKey } = useKeyboardShortcuts();
  const { toasts, dismiss: dismissToast } = useToasts();

  // Handle save with toast feedback
  const handleSave = () => {
    const success = saveNow();
    if (success) {
      toastManager.success('Project saved');
    } else {
      toastManager.error('Failed to save project');
    }
  };

  // Handle undo with toast
  const handleUndo = () => {
    if (canUndo) {
      undo();
      toastManager.info(`Undo: ${undoDescription || 'action'}`, 2000);
    }
  };

  // Handle redo with toast
  const handleRedo = () => {
    if (canRedo) {
      redo();
      toastManager.info(`Redo: ${redoDescription || 'action'}`, 2000);
    }
  };

  // Update canvas dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        
        const cellWidth = width / grid.cols;
        const cellHeight = height / grid.rows;
        
        usePXSStore.setState((state) => ({
          grid: {
            ...state.grid,
            cellWidth,
            cellHeight,
          },
        }));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [grid.cols, grid.rows]);

  const handleGridUpdate = (data: GridData) => {
    setGridData(data);
    
    // Update Zustand store
    const cellsMap = new Map();
    data.cells.forEach((cell) => {
      cellsMap.set(`${cell.x}-${cell.y}`, cell);
    });
    
    usePXSStore.setState((state) => ({
      grid: {
        ...state.grid,
        cols: data.cols,
        rows: data.rows,
        cells: cellsMap,
      },
    }));

    // Push to history
    historyManager.push('update', `Updated grid ${data.cols}×${data.rows}`, {
      cols: data.cols,
      rows: data.rows,
      cells: data.cells,
    });
  };

  const handleCreateAnimation = (type: string) => {
    console.log('Creating animation:', type);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background-primary text-text-primary font-sans">
      {/* Top Bar - Undo/Redo & Auto-save Status */}
      <header className="h-10 px-4 bg-background-secondary border-b border-border flex items-center justify-between shrink-0">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`px-2 py-1 rounded text-xs transition-all ${
              canUndo
                ? 'hover:bg-background-overlay text-text-primary'
                : 'text-text-muted opacity-50 cursor-not-allowed'
            }`}
            title={undoDescription ? `Undo: ${undoDescription} (${modKey}+Z)` : 'Nothing to undo'}
          >
            ↩️ Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`px-2 py-1 rounded text-xs transition-all ${
              canRedo
                ? 'hover:bg-background-overlay text-text-primary'
                : 'text-text-muted opacity-50 cursor-not-allowed'
            }`}
            title={redoDescription ? `Redo: ${redoDescription} (${modKey}+Shift+Z)` : 'Nothing to redo'}
          >
            ↪️ Redo
          </button>
        </div>

        {/* Center - Title */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">PXS Studio</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-accent-yellow" title="Unsaved changes"></span>
          )}
        </div>

        {/* Auto-save Status */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {autoSaveInitialized ? `💾 ${formatTimeSinceLastSave()}` : '⏳ Loading...'}
          </span>
          <button
            onClick={handleSave}
            className="px-2 py-1 rounded text-xs hover:bg-background-overlay text-text-primary transition-all"
            title={`Save now (${modKey}+S)`}
          >
            Save
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`flex flex-col bg-background-secondary border-r border-border transition-all duration-300 ${
            ui.sidebarCollapsed ? 'w-12' : 'w-80'
          }`}
        >
          {/* Sidebar Header */}
          <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0">
            {!ui.sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="text-xl">🎨</div>
                <h1 className="font-bold text-lg">PXS Studio</h1>
                <span className="text-xs text-primary font-mono">v4.0</span>
              </div>
            )}
            <button
              onClick={() => actions.toggleSidebar()}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              title="Toggle Sidebar (Tab)"
            >
              {ui.sidebarCollapsed ? '▶' : '◀'}
            </button>
          </div>

          {/* Tabs */}
          {!ui.sidebarCollapsed && (
            <>
              <div className="flex border-b border-border shrink-0">
                {(['resolution', 'image', 'animation'] as const).map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => actions.setActiveTab(tab)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors capitalize ${
                      ui.activeTab === tab
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-text-muted hover:text-text-primary hover:bg-background-overlay'
                    }`}
                    title={`${tab} (${i + 1})`}
                  >
                    {tab === 'resolution' && '📏 '}
                    {tab === 'image' && '🖼️ '}
                    {tab === 'animation' && '🎬 '}
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {ui.activeTab === 'resolution' && (
                  <ResolutionTab onGridUpdate={handleGridUpdate} />
                )}
                {ui.activeTab === 'image' && (
                  <ImageTab onGridUpdate={handleGridUpdate} />
                )}
                {ui.activeTab === 'animation' && (
                  <AnimationTab onCreateAnimation={handleCreateAnimation} />
                )}
              </div>
            </>
          )}

          {/* Footer Stats */}
          {!ui.sidebarCollapsed && (
            <div className="h-10 px-4 border-t border-border flex items-center justify-between text-xs text-text-muted shrink-0">
              <span className="font-mono">
                {grid.cols}×{grid.rows} = {(grid.cols * grid.rows).toLocaleString()} cells
              </span>
              <span className="font-mono text-accent-green">{grid.renderer.toUpperCase()}</span>
            </div>
          )}
        </aside>

        {/* Main Canvas Area */}
        <main ref={containerRef} className="flex-1 relative flex items-center justify-center bg-background-primary overflow-hidden">
          <GridCanvas gridData={gridData} />

          {/* Border Toggle Button */}
          <button
            onClick={() => actions.toggleBorders()}
            className={`absolute bottom-6 right-6 w-12 h-12 rounded-lg flex items-center justify-center transition-all shadow-lg ${
              grid.bordersVisible
                ? 'bg-primary text-white border-2 border-primary'
                : 'bg-background-secondary text-text-muted border-2 border-border hover:border-primary hover:text-primary'
            }`}
            title={`${grid.bordersVisible ? 'Hide' : 'Show'} Borders (B)`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" />
              <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2.5" />
              <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="2.5" />
              <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="2.5" />
              <line x1="15" y1="3" x2="15" y2="21" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </button>

          {/* Performance Badge */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-background-secondary/90 backdrop-blur border border-border text-xs font-mono text-text-muted">
            <span className="text-accent-green">⚡ WORKERS</span> • {grid.cols}×{grid.rows}
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="absolute bottom-6 left-6 px-3 py-1.5 rounded-lg bg-background-secondary/90 backdrop-blur border border-border text-xs text-text-muted">
            <span className="opacity-70">{modKey}+Z Undo</span>
            <span className="mx-2 opacity-30">|</span>
            <span className="opacity-70">B Borders</span>
            <span className="mx-2 opacity-30">|</span>
            <span className="opacity-70">1-3 Tabs</span>
          </div>

          {children}
        </main>

        {/* Right Inspector */}
        {ui.inspectorOpen && (
          <aside className="w-80 bg-background-secondary border-l border-border overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Inspector</h2>
                <button
                  onClick={() => actions.closeInspector()}
                  className="text-text-muted hover:text-text-primary"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-text-muted">
                Inspector panel coming soon...
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
