'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePXSStore, selectGrid, selectUI, selectActions, selectAnimation, PXSCell, PXSFrame } from '../store/pxs-store';
import GridCanvas, { GridCanvasHandle } from './GridCanvas';
import ResolutionTab from './ResolutionTab';
import ImageTab from './ImageTab';
import AnimationTab from './AnimationTab';
import FrameDeck from './FrameDeck';
import FrameInspector, { InspectorData } from './FrameInspector';
import { ToastContainer, useToasts, toastManager } from './Toast';
import { useHistoryManager } from '../hooks/useHistoryManager';
import { useAutoSave } from '../hooks/useAutoSave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import historyManager from '../store/history-manager';
import type { GridData } from '../workers/grid.worker';
import pixcelLogo from '../data/defaults/pixcel-logo.json';
import ArtGalleryTab from './ArtGalleryTab';
import { applyGalleryFrame } from '../lib/apply-gallery-frame';

export default function Studio({ children }: { children?: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHandleRef = useRef<GridCanvasHandle>(null);
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null);
  const [selectedColor, setSelectedColor] = useState('#58a6ff');
  const [exportOpen, setExportOpen] = useState(false);

  const grid = usePXSStore(selectGrid);
  const ui = usePXSStore(selectUI);
  const animation = usePXSStore(selectAnimation);
  const actions = usePXSStore(selectActions);
  
  // History & Auto-save hooks
  const { canUndo, canRedo, undo, redo, hasUnsavedChanges, undoDescription, redoDescription } = useHistoryManager();
  const { formatTimeSinceLastSave, saveNow, isInitialized: autoSaveInitialized } = useAutoSave();
  const { modKey } = useKeyboardShortcuts();
  const { toasts, dismiss: dismissToast } = useToasts();

  // Handle save with toast feedback
  const handleSave = async () => {
    const success = await saveNow();
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

  // Sync animation frame to grid display
  useEffect(() => {
    if (animation.frames.length > 0 && animation.currentFrame < animation.frames.length) {
      const frame = animation.frames[animation.currentFrame];
      if (frame) {
        setGridData({
          cols: frame.cols,
          rows: frame.rows,
          cells: frame.cells,
          totalCells: frame.cells.length,
          creationTime: 0,
        });
      }
    }
  }, [animation.currentFrame, animation.frames]);

  // On first ready: either render the autosave-restored project, or paint the
  // default PixcE landing-page logo so the canvas is never empty.
  useEffect(() => {
    if (!autoSaveInitialized) return;
    if (gridData) return;

    const state = usePXSStore.getState();
    const storeCells = Array.from(state.grid.cells.values());

    if (storeCells.length > 0) {
      setGridData({
        cols: state.grid.cols,
        rows: state.grid.rows,
        cells: storeCells,
        totalCells: storeCells.length,
        creationTime: 0,
      });
      return;
    }

    const logoGrid = applyGalleryFrame(
      pixcelLogo as PXSFrame,
      'Loaded Pixcel logo'
    );
    setGridData(logoGrid);
    // Treat the default logo as the baseline so autosave doesn't persist it
    // over your latest JSON edits on reload.
    historyManager.markSaved();
  }, [autoSaveInitialized, gridData]);

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

  // Handle cell click - paint with selected color
  const handleCellClick = useCallback((x: number, y: number, cell: PXSCell | null) => {
    if (!gridData) return;
    
    // Update the cell with selected color
    const newCells = gridData.cells.map(c => 
      c.x === x && c.y === y 
        ? { ...c, color: selectedColor }
        : c
    );
    
    const newGridData = { ...gridData, cells: newCells };
    setGridData(newGridData);
    
    // Update store
    actions.updateCell(x, y, selectedColor);
    
    // Toast for feedback
    toastManager.info(`Painted (${x}, ${y})`, 1500);
  }, [gridData, selectedColor, actions]);

  // Handle cell double-click - open color picker
  const handleCellDoubleClick = useCallback((x: number, y: number, cell: PXSCell | null) => {
    if (!cell) return;
    
    setInspectorData({
      mode: 'cell',
      cell: { x, y, color: cell.color },
    });
    setInspectorOpen(true);
  }, []);

  // Handle cell color change from inspector
  const handleCellColorChange = useCallback((x: number, y: number, color: string) => {
    if (!gridData) return;
    
    const newCells = gridData.cells.map(c =>
      c.x === x && c.y === y
        ? { ...c, color }
        : c
    );
    
    const newGridData = { ...gridData, cells: newCells };
    setGridData(newGridData);
    actions.updateCell(x, y, color);
    
    toastManager.success(`Updated cell (${x}, ${y})`);
    setInspectorOpen(false);
  }, [gridData, actions]);

  // Handle frame select from FrameDeck
  const handleFrameSelect = useCallback((index: number) => {
    actions.goToFrame(index);
  }, [actions]);

  // Handle frame edit from FrameDeck
  const handleFrameEdit = useCallback((index: number) => {
    setInspectorData({
      mode: 'frame',
      frameIndex: index,
    });
    setInspectorOpen(true);
  }, []);

  const handleCreateAnimation = async (type: string) => {
    console.log('Creating animation:', type);
    
    const { cols, rows } = grid;
    const totalCells = cols * rows;
    
    // Warn for large grids
    if (totalCells > 10000) {
      toastManager.warning(`Large grid (${totalCells.toLocaleString()} cells) - animation may be slow`, 3000);
    }
    
    // Limit frames based on grid size to prevent crashes
    const maxFrames = totalCells > 50000 ? 3 : totalCells > 10000 ? 5 : totalCells > 2500 ? 10 : 30;
    
    const frames: Array<{ cols: number; rows: number; cells: Array<{ x: number; y: number; color: string; opacity: number }> }> = [];
    
    try {
      if (type === 'random') {
        const numFrames = Math.min(10, maxFrames);
        for (let f = 0; f < numFrames; f++) {
          const cells = [];
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const r = Math.floor(Math.random() * 256);
              const g = Math.floor(Math.random() * 256);
              const b = Math.floor(Math.random() * 256);
              cells.push({ x, y, color: `rgb(${r}, ${g}, ${b})`, opacity: 1 });
            }
          }
          frames.push({ cols, rows, cells });
        }
        toastManager.success(`Generated ${numFrames} random frames!`);
      } else if (type === 'gradient') {
        const numFrames = Math.min(30, maxFrames);
        for (let f = 0; f < numFrames; f++) {
          const cells = [];
          const hueOffset = (f / numFrames) * 360;
          
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const hue = (hueOffset + (x / cols) * 120 + (y / rows) * 60) % 360;
              const sat = 70 + Math.sin((f / numFrames) * Math.PI * 2) * 20;
              const light = 50 + Math.sin((f / numFrames) * Math.PI * 2 + x / cols * Math.PI) * 15;
              const { r, g, b } = hslToRgb(hue / 360, sat / 100, light / 100);
              cells.push({ x, y, color: `rgb(${r}, ${g}, ${b})`, opacity: 1 });
            }
          }
          frames.push({ cols, rows, cells });
        }
        toastManager.success(`Generated ${numFrames} gradient frames!`);
      }
      
      if (frames.length > 0) {
        actions.loadAnimation({
          fps: 30,
          frames,
          metadata: { loop: true },
        });
        
        setGridData({
          cols,
          rows,
          cells: frames[0].cells,
          totalCells: frames[0].cells.length,
          creationTime: 0,
        });
      }
    } catch (error) {
      console.error('Animation generation failed:', error);
      toastManager.error('Animation generation failed - grid may be too large');
    }
  };
  
  // HSL to RGB helper
  const hslToRgb = (h: number, s: number, l: number) => {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background-primary text-text-primary font-sans">
      {/* Top Bar - Clean minimal header */}
      <header className="h-9 px-3 bg-background-secondary border-b border-border flex items-center justify-between shrink-0">
        {/* Undo/Redo - Icon only */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-all ${
              canUndo
                ? 'hover:bg-background-overlay text-text-primary'
                : 'text-text-muted/40 cursor-not-allowed'
            }`}
            title={undoDescription ? `Undo: ${undoDescription} (${modKey}+Z)` : 'Nothing to undo'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-all ${
              canRedo
                ? 'hover:bg-background-overlay text-text-primary'
                : 'text-text-muted/40 cursor-not-allowed'
            }`}
            title={redoDescription ? `Redo: ${redoDescription} (${modKey}+Shift+Z)` : 'Nothing to redo'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
          </button>
        </div>

        {/* Center - Title + Status */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-text-primary">PXS</span>
          {hasUnsavedChanges && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow" title="Unsaved changes"></span>
          )}
          
          {/* Brush Color */}
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border border-border/50 bg-transparent"
              title="Brush color"
            />
          </div>
        </div>

        {/* Right - Save */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted/60">
            {autoSaveInitialized ? formatTimeSinceLastSave() : '...'}
          </span>
          <button
            onClick={handleSave}
            className="px-2.5 py-1 rounded text-[10px] font-medium bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-all"
            title={`Save (${modKey}+S)`}
          >
            Save
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`flex flex-col bg-background-secondary border-r border-border transition-all duration-300 ${
            ui.sidebarCollapsed ? 'w-10' : 'w-64'
          }`}
        >
          {/* Sidebar Header */}
          <div className="h-9 px-2 border-b border-border flex items-center justify-between shrink-0">
            {!ui.sidebarCollapsed && (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-black text-white">P</span>
                </div>
                <span className="text-xs font-semibold text-text-primary">Studio</span>
              </div>
            )}
            <button
              onClick={() => actions.toggleSidebar()}
              className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-background-overlay transition-colors"
              title="Toggle Sidebar"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {ui.sidebarCollapsed ? <path d="M9 18l6-6-6-6"/> : <path d="M15 18l-6-6 6-6"/>}
              </svg>
            </button>
          </div>

          {/* Tabs */}
          {!ui.sidebarCollapsed && (
            <>
              <div className="flex border-b border-border shrink-0">
                {(['resolution', 'image', 'animation', 'gallery'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => actions.setActiveTab(tab)}
                    className={`flex-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      ui.activeTab === tab
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tab === 'resolution'
                      ? 'Grid'
                      : tab === 'image'
                        ? 'Image'
                        : tab === 'animation'
                          ? 'Anim'
                          : 'Art'}
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
                {ui.activeTab === 'gallery' && (
                  <ArtGalleryTab onGridUpdate={handleGridUpdate} />
                )}
              </div>
            </>
          )}
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 flex flex-col relative bg-background-primary overflow-hidden">
          {/* Canvas Container */}
          <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden">
            <GridCanvas
              ref={canvasHandleRef}
              gridData={gridData}
              onCellClick={handleCellClick}
              onCellDoubleClick={handleCellDoubleClick}
            />

            {/* Canvas Toolbar (top-right) */}
            <CanvasToolbar
              bordersVisible={grid.bordersVisible}
              onToggleBorders={() => actions.toggleBorders()}
              onZoomIn={() => canvasHandleRef.current?.zoomIn()}
              onZoomOut={() => canvasHandleRef.current?.zoomOut()}
              onFit={() => canvasHandleRef.current?.fit()}
              onExport={() => setExportOpen(true)}
            />

            {/* Performance Badge */}
            <div className="absolute top-4 left-4 px-2 py-1 rounded bg-background-secondary/90 backdrop-blur border border-border text-[10px] font-mono text-text-muted">
              <span className="text-accent-green">⚡</span> {grid.cols}×{grid.rows}
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="absolute bottom-4 left-4 px-2 py-1 rounded bg-background-secondary/90 backdrop-blur border border-border text-[10px] text-text-muted">
              <span className="opacity-70">{modKey}+Z</span>
              <span className="mx-1.5 opacity-30">•</span>
              <span className="opacity-70">B</span>
              <span className="mx-1.5 opacity-30">•</span>
              <span className="opacity-70">Space+drag pan</span>
              <span className="mx-1.5 opacity-30">•</span>
              <span className="opacity-70">{modKey}+wheel zoom</span>
            </div>
          </div>

          {/* Frame Deck - Bottom Panel */}
          {animation.frames.length > 0 && (
            <div className="h-32 px-4 py-2 bg-background-secondary border-t border-border shrink-0">
              <FrameDeck 
                onFrameSelect={handleFrameSelect}
                onFrameEdit={handleFrameEdit}
              />
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Frame Inspector Modal */}
      <FrameInspector
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        data={inspectorData}
        onCellColorChange={handleCellColorChange}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={exportOpen}
        cols={grid.cols}
        rows={grid.rows}
        onClose={() => setExportOpen(false)}
        onExport={(scale) => {
          canvasHandleRef.current?.exportPNG(scale);
          setExportOpen(false);
          toastManager.success(`Exported PNG at ${scale}× (${grid.cols * scale}×${grid.rows * scale})`);
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

interface CanvasToolbarProps {
  bordersVisible: boolean;
  onToggleBorders: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onExport: () => void;
}

function CanvasToolbar({
  bordersVisible,
  onToggleBorders,
  onZoomIn,
  onZoomOut,
  onFit,
  onExport,
}: CanvasToolbarProps) {
  const buttonClass =
    'w-10 h-10 rounded-md flex items-center justify-center transition-all text-text-muted hover:text-text-primary hover:bg-background-overlay';
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-1 p-1 rounded-lg bg-background-secondary/95 backdrop-blur border border-border shadow-lg">
      <button onClick={onZoomIn} className={buttonClass} title="Zoom In (Cmd/Ctrl+Wheel)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
          <line x1="20" y1="20" x2="16.5" y2="16.5" />
        </svg>
      </button>
      <button onClick={onZoomOut} className={buttonClass} title="Zoom Out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="8" y1="11" x2="14" y2="11" />
          <line x1="20" y1="20" x2="16.5" y2="16.5" />
        </svg>
      </button>
      <button onClick={onFit} className={buttonClass} title="Fit to Screen / Reset View">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9V5a1 1 0 0 1 1-1h4" />
          <path d="M20 9V5a1 1 0 0 0-1-1h-4" />
          <path d="M4 15v4a1 1 0 0 0 1 1h4" />
          <path d="M20 15v4a1 1 0 0 1-1 1h-4" />
        </svg>
      </button>
      <div className="h-px bg-border my-0.5" />
      <button
        onClick={onToggleBorders}
        className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${
          bordersVisible
            ? 'bg-primary text-white'
            : 'text-text-muted hover:text-text-primary hover:bg-background-overlay'
        }`}
        title={`${bordersVisible ? 'Hide' : 'Show'} Borders (B)`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2.5" />
          <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="2.5" />
          <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="2.5" />
          <line x1="15" y1="3" x2="15" y2="21" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </button>
      <div className="h-px bg-border my-0.5" />
      <button onClick={onExport} className={buttonClass} title="Export PNG">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  );
}

interface ExportDialogProps {
  isOpen: boolean;
  cols: number;
  rows: number;
  onClose: () => void;
  onExport: (scale: number) => void;
}

function ExportDialog({ isOpen, cols, rows, onClose, onExport }: ExportDialogProps) {
  const [scale, setScale] = useState(8);
  if (!isOpen) return null;
  const presets = [1, 2, 4, 8, 16, 32];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[360px] rounded-lg bg-background-secondary border border-border shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Export PNG</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="text-[11px] text-text-muted mb-2">Pixel scale (1 grid cell = N×N pixels)</div>
        <div className="grid grid-cols-6 gap-1 mb-3">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setScale(p)}
              className={`py-1.5 rounded text-xs font-medium transition-all ${
                scale === p
                  ? 'bg-primary text-white'
                  : 'bg-background-overlay text-text-secondary hover:text-text-primary'
              }`}
            >
              {p}×
            </button>
          ))}
        </div>
        <div className="text-[11px] text-text-muted mb-4">
          Output: <span className="text-text-secondary font-mono">{cols * scale} × {rows * scale}</span> px
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs bg-background-overlay hover:bg-border text-text-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => onExport(scale)}
            className="px-3 py-1.5 rounded text-xs bg-primary hover:bg-primary/80 text-white font-medium"
          >
            Export PNG
          </button>
        </div>
      </div>
    </div>
  );
}
