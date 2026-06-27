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
import { useLiveArtStore } from '../store/live-art-store';
import type { GridData } from '../workers/grid.worker';
import pixcelLogo from '../data/defaults/pixcel-logo.json';
import ArtGalleryTab from './ArtGalleryTab';
import LiveArtisanPanel from './LiveArtisanPanel';
import FramePreview from './FramePreview';
import { useGenJobsStore } from '../store/gen-jobs-store';
import { useCenterStage } from '../store/center-stage-store';
import DiffusionShimmer from './DiffusionShimmer';
import MaterializeFrame from './MaterializeFrame';
import MatrixArtStage from './MatrixArtStage';
import { applyGalleryFrame } from '../lib/apply-gallery-frame';
import NavRail from './NavRail';

/* ── Living-canvas chrome styling (Claude Design handoff §5 + §3.13) ──
   Glass floating chrome: rgba(18,18,22,0.82) + blur(20px) + 1px white-8% border +
   --a2ui-shadow-lg. Graceful glide/fade via the entrance easing on geometry props.
   `.lc-glass` = the frosted float surface; `.lc-anim` = position/size glide on the
   floating overlays; `.lc-accordion` = the right panel's width transition. Tokens
   only — no new hex beyond the handoff-specified glass tint. */
const LIVING_CANVAS_CSS = `
  .lc-glass {
    background: rgba(18, 18, 22, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: var(--a2ui-shadow-lg);
  }
  .lc-anim {
    transition: left 300ms cubic-bezier(0.22, 1, 0.36, 1),
                right 300ms cubic-bezier(0.22, 1, 0.36, 1),
                width 300ms cubic-bezier(0.22, 1, 0.36, 1),
                opacity 200ms ease;
  }
  .lc-accordion {
    transition: width 300ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: width;
  }
`;

export default function Studio({ children, onHome, initialPrompt }: { children?: React.ReactNode; onHome?: () => void; initialPrompt?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHandleRef = useRef<GridCanvasHandle>(null);
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null);
  const [selectedColor, setSelectedColor] = useState('#58a6ff');
  const [exportOpen, setExportOpen] = useState(false);

  // Theme toggle (DS: dark is canonical). Flips data-theme on <html>; tokens.css does the rest.
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pxs-theme');
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('pxs-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const grid = usePXSStore(selectGrid);
  const ui = usePXSStore(selectUI);
  const animation = usePXSStore(selectAnimation);
  const actions = usePXSStore(selectActions);
  const genRunning = useGenJobsStore((s) => s.jobs.filter((j) => j.state === 'running').length);
  const stage = useCenterStage();

  // Keep the live thinking + the studio feed scrolled to the latest as they stream in, so the
  // user can actually follow the artist's reasoning and the stroke log without manual scrolling.
  const stageThinkRef = useRef<HTMLDivElement>(null);
  const stageFeedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stageThinkRef.current?.scrollTo({ top: stageThinkRef.current.scrollHeight });
  }, [stage.thinking]);
  useEffect(() => {
    stageFeedRef.current?.scrollTo({ top: stageFeedRef.current.scrollHeight });
  }, [stage.feed.length]);

  // Right AI panel: a collapsible ACCORDION docked far-right, floating over the canvas.
  // `chatPanelOpen` (store) = expanded vs. collapsed-to-rail. `panelWidth` = expanded width.
  const [panelWidth, setPanelWidth] = useState(320);
  const panelWidthRef = useRef(320);
  const resizingRef = useRef(false);
  // Width of the collapsed accordion handle/rail (a thin always-present strip).
  const RIGHT_RAIL_W = 44;
  useEffect(() => {
    try {
      const s = localStorage.getItem('pxs-ai-panel-width');
      if (s) {
        const w = Math.min(720, Math.max(280, parseInt(s) || 320));
        panelWidthRef.current = w;
        setPanelWidth(w);
      }
    } catch {
      /* ignore */
    }
    const move = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const w = Math.min(720, Math.max(280, window.innerWidth - e.clientX));
      panelWidthRef.current = w;
      setPanelWidth(w);
    };
    const up = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.userSelect = '';
      try {
        localStorage.setItem('pxs-ai-panel-width', String(panelWidthRef.current));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);
  
  // History & Auto-save hooks
  const { canUndo, canRedo, undo, redo, hasUnsavedChanges, undoDescription, redoDescription } = useHistoryManager();
  const { versions, versionIdx, loadVersion } = useLiveArtStore(); // the CURRENT piece's revision chain (per-piece)
  const [histOpen, setHistOpen] = useState(false); // per-piece version-history dropdown (next to the canvas-size chip)
  const { formatTimeSinceLastSave, saveNow, isInitialized: autoSaveInitialized } = useAutoSave();
  const { modKey } = useKeyboardShortcuts();
  const { toasts, dismiss: dismissToast } = useToasts();

  // The right edge reserved by the always-present AI accordion (expanded width when
  // open, the thin rail width when collapsed). The canvas + floating chrome inset to it.
  const chatPanelOpenStyleRight = ui.chatPanelOpen ? panelWidth : RIGHT_RAIL_W;

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

  const handleGridUpdate = (data: GridData, label?: string) => {
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
    historyManager.push('update', label || `Updated grid ${data.cols}×${data.rows}`, {
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

  // Primary nav rail routing. The rail = app-feature switcher; for the creative sections
  // that the Studio already hosts (Image / Anim) we just switch the existing inner tab so
  // the section's content stays where it is. Export / Assets / Assistant map to the studio's
  // existing affordances. Chat (active item) + the X mark go home (handled by NavRail → onHome).
  const handleRailSection = (id: string) => {
    if (id === 'image') { if (ui.sidebarCollapsed) actions.toggleSidebar(); actions.setActiveTab('image'); }
    else if (id === 'anim') { if (ui.sidebarCollapsed) actions.toggleSidebar(); actions.setActiveTab('animation'); }
    // 'art' is the current section (active) — no-op; 'video' has no studio home yet → ignore.
  };
  const handleRailUtility = (id: string) => {
    if (id === 'export') setExportOpen(true);
    else if (id === 'assets') { if (ui.sidebarCollapsed) actions.toggleSidebar(); actions.setActiveTab('gallery'); }
    else if (id === 'assistant') { if (!ui.chatPanelOpen) actions.toggleChatPanel(); }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background-primary text-text-primary font-sans">
      {/* ───────────────────────────────────────────────────────────────────────
          LIVING-CANVAS LAYOUT (first structural pass)

          z-0   : the canvas / MatrixArtStage — full-bleed, fills the whole viewport,
                  "breathing" behind every other surface, never interrupted.
          left  : NavRail — fixed left column, persistent, over the canvas.
          right : LiveArtisanPanel — a collapsible ACCORDION docked far-right.
          z>0   : the studio chrome (top bar, gallery sidebar, zoom tools) become
                  glass floating panels overlaying the canvas EDGES.

          Glass chrome rules (Claude Design handoff §5): rgba(18,18,22,0.82) +
          backdrop-filter blur(20px) + 1px rgba(255,255,255,0.08) border +
          --a2ui-shadow-lg. Entrance easing cubic-bezier(0.22,1,0.36,1); flat ease
          for hovers; durations 150/200/300; DS tokens only.
          ─────────────────────────────────────────────────────────────────────── */}
      <style>{LIVING_CANVAS_CSS}</style>

      {/* ── z-0 BACKGROUND: the canvas is the entire art board, full-bleed ──
          Absolutely positioned to fill the gap between the left rail and the right
          accordion; nothing clips it. The GridCanvas + the live MatrixArtStage show
          (stage.active overlay) both live here. */}
      <main
        ref={containerRef}
        className="absolute inset-y-0 z-0 flex flex-col bg-background-primary overflow-hidden lc-anim"
        style={{ left: 72, right: chatPanelOpenStyleRight }}
      >
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <GridCanvas
            ref={canvasHandleRef}
            gridData={gridData}
            onCellClick={handleCellClick}
            onCellDoubleClick={handleCellDoubleClick}
          />

          {/* Performance badge + version history — floats over the canvas, top-left
              (clear of the floating top bar). */}
          <div className="absolute top-16 left-4 flex items-center gap-1.5 z-20">
            <div className="px-2 py-1 rounded bg-background-secondary/90 backdrop-blur border border-border text-[10px] font-mono text-text-muted">
              <span className="text-accent-green">⚡</span> {grid.cols}×{grid.rows}
            </div>
            {versions.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setHistOpen((o) => !o)}
                  title="Version history — this piece's revisions; click one to load it"
                  className="px-2 py-1 rounded bg-background-secondary/90 backdrop-blur border border-border text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l3 2" /></svg>
                  History<span className="text-text-muted/60">· {versionIdx + 1}/{versions.length}</span>
                </button>
                {histOpen && (
                  <div className="absolute top-full mt-1 left-0 w-60 max-h-72 overflow-y-auto rounded-md bg-background-secondary border border-border shadow-lg p-1 z-30">
                    {versions.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => { loadVersion(i); setHistOpen(false); toastManager.info(`Loaded: ${v.label}`, 2000); }}
                        className={`w-full text-left px-2 py-1.5 rounded text-[10px] flex items-center justify-between gap-2 transition-colors ${i === versionIdx ? 'bg-primary/15 text-text-primary' : 'text-text-secondary hover:bg-background-tertiary'}`}
                      >
                        <span className="truncate">{i === 0 ? `${v.label} · original` : v.label}</span>
                        {i === versionIdx && <span className="text-primary text-[9px] shrink-0">● current</span>}
                      </button>
                    )).reverse()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint — floats bottom-left over the canvas. */}
          <div className="absolute bottom-4 left-4 px-2 py-1 rounded bg-background-secondary/90 backdrop-blur border border-border text-[10px] text-text-muted z-20">
            <span className="opacity-70">{modKey}+Z</span>
            <span className="mx-1.5 opacity-30">•</span>
            <span className="opacity-70">B</span>
            <span className="mx-1.5 opacity-30">•</span>
            <span className="opacity-70">Space+drag pan</span>
            <span className="mx-1.5 opacity-30">•</span>
            <span className="opacity-70">{modKey}+wheel zoom</span>
          </div>

          {/* Center easel — the artist's studio: the live drawing + its thoughts + the workflow feed.
              SCULPT mode is the immersive full-bleed live show — MatrixArtStage FILLS this z-0 layer
              edge-to-edge (the art centered inside it). The supporting chrome (status, thinking, feed)
              floats at the EDGES so the central art focal region stays clear. Other modes keep the
              centered framed preview. */}
          {stage.active && (
            <div className="absolute inset-0 z-30 bg-background-primary overflow-hidden">
              <button
                onClick={() => stage.clear()}
                className="absolute top-4 right-4 z-40 px-2 py-1 rounded-md bg-background-secondary/90 border border-border text-[11px] text-text-muted hover:text-text-primary"
                title="Dismiss the live preview"
              >
                ✕ Dismiss
              </button>

              {stage.mode === 'sculpt' ? (
                // THE LIVE SHOW — full-bleed immersive blue canvas, art centered, char-sea ambient.
                <div className="absolute inset-0">
                  <MatrixArtStage />
                </div>
              ) : (
                // Optimized / shimmer modes — centered framed preview (unchanged).
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="rounded-xl border border-border bg-background-secondary/40 p-4 shadow-2xl shadow-black/40">
                    {stage.frame && !stage.shimmer ? (
                      <MaterializeFrame frame={stage.frame} size={Math.min(400, (grid?.cols ?? 32) * 12)} />
                    ) : (
                      <DiffusionShimmer size={Math.min(360, (grid?.cols ?? 32) * 11)} />
                    )}
                  </div>
                </div>
              )}

              {/* status line — floats top-center, clear of the art's body */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 text-xs font-mono pointer-events-none">
                {stage.status === 'running' ? (
                  <span className="inline-flex items-center gap-1.5 text-accent-purple rounded-md bg-background-primary/60 backdrop-blur px-2 py-1">
                    <span className="w-2 h-2 rounded-full bg-accent-purple animate-pulse" />
                    {stage.mode === 'sculpt' ? 'Comprehensive' : 'Optimized'} · {stage.label || 'working…'}
                  </span>
                ) : stage.status === 'done' ? (
                  <span className="text-accent-purple rounded-md bg-background-primary/60 backdrop-blur px-2 py-1">● The artist says it&apos;s done — Save it or Iterate in the panel →</span>
                ) : stage.status === 'paused' ? (
                  <span className="text-accent-yellow rounded-md bg-background-primary/60 backdrop-blur px-2 py-1">⏸ Paused</span>
                ) : (
                  <span className="text-text-muted rounded-md bg-background-primary/60 backdrop-blur px-2 py-1">{stage.label || stage.status}</span>
                )}
              </div>

              {/* the artist's thoughts — floats down the LEFT margin, clear of the centered art */}
              {stage.status === 'running' && stage.thinking && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-60 max-h-[42vh] rounded-lg border border-accent-purple/30 bg-background-primary/70 backdrop-blur px-3 py-2 overflow-hidden flex flex-col">
                  <div className="text-[9px] uppercase tracking-wider text-accent-purple mb-1 flex items-center gap-1 shrink-0">
                    <span className="w-1 h-1 rounded-full bg-accent-purple animate-pulse" /> thinking
                  </div>
                  <div ref={stageThinkRef} className="text-[11px] text-text-secondary italic leading-relaxed overflow-y-auto whitespace-pre-wrap">{stage.thinking}</div>
                </div>
              )}

              {/* the studio feed — floats as a bottom strip, clear of the centered art */}
              {stage.feed.length > 0 && (
                <div ref={stageFeedRef} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(90%,42rem)] max-h-40 rounded-lg border border-border bg-background-primary/70 backdrop-blur px-3 py-2 overflow-y-auto space-y-0.5">
                  {stage.feed.slice(-60).map((f, i) => (
                    <div key={i} className="text-[10px] leading-snug">
                      {f.kind === 'user' ? (
                        <span className="text-text-primary"><span className="text-primary font-semibold">you →</span> {f.text}</span>
                      ) : f.kind === 'phase' ? (
                        <span className="text-primary font-semibold">◆ {f.text}</span>
                      ) : f.kind === 'gesture' ? (
                        <span className="text-text-secondary"><span className="text-text-muted">✎</span> {f.text}</span>
                      ) : f.kind === 'recall' ? (
                        <span className="text-accent-yellow">↩ {f.text}</span>
                      ) : f.kind === 'done' ? (
                        <span className="text-accent-green">✓ {f.text}</span>
                      ) : (
                        <span className={f.approved ? 'text-accent-green' : 'text-accent-yellow'}>👁 {f.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Frame Deck — floats as a bottom strip over the canvas (only with frames). */}
        {animation.frames.length > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-32 px-4 py-2 lc-glass border-t border-border z-20 lc-anim">
            <FrameDeck
              onFrameSelect={handleFrameSelect}
              onFrameEdit={handleFrameEdit}
            />
          </div>
        )}

        {children}
      </main>

      {/* ── LEFT ANCHOR: the primary nav rail — fixed, persistent, over the canvas. ── */}
      <div className="absolute inset-y-0 left-0 z-30">
        <NavRail
          activeSection="art"
          onHome={onHome}
          onSection={handleRailSection}
          onUtility={handleRailUtility}
        />
      </div>

      {/* ── FLOATING TOP BAR (glass) — overlays the top edge of the canvas. ── */}
      <header className="absolute top-3 z-30 h-10 px-3 lc-glass rounded-xl flex items-center justify-between lc-anim" style={{ left: 72 + 12, right: chatPanelOpenStyleRight + 12 }}>
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

        {/* Center - Title + save-state dot (DS §3d) */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-text-primary">Pixcel Art · Studio</span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: hasUnsavedChanges ? 'var(--a2ui-warning)' : 'var(--a2ui-success)' }}
            title={hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          ></span>

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

        {/* Right - Save + AI panel toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted/60">
            {autoSaveInitialized ? formatTimeSinceLastSave() : '...'}
          </span>
          {/* Theme toggle — self-evident moon/sun glyph (DS §3d), dark is canonical. */}
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-background-overlay transition-all"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            )}
          </button>
          <button
            onClick={handleSave}
            className="px-2.5 py-1 rounded text-[10px] font-medium bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-all"
            title={`Save (${modKey}+S)`}
          >
            Save
          </button>
          <button
            onClick={() => actions.toggleChatPanel()}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
              ui.chatPanelOpen
                ? 'bg-primary/15 text-primary'
                : 'bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary'
            }`}
            title="Toggle Pixcel AI panel"
          >
            <span className="inline-flex items-center gap-1">
              ✦ AI
              {genRunning > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-1.5 text-[9px] text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {genRunning}
                </span>
              )}
            </span>
          </button>
        </div>
      </header>

      {/* ── FLOATING GALLERY / LIBRARY SIDEBAR (glass) — left-edge overlay, docked
          beside the nav rail. Collapses to nothing (the rail's section buttons
          re-open it). Floats over the canvas; glides in/out. ── */}
      {!ui.sidebarCollapsed && (
        <aside
          className="absolute z-30 flex flex-col lc-glass rounded-xl overflow-hidden lc-anim"
          style={{ left: 72 + 12, top: 60, bottom: 12, width: 256 }}
        >
          {/* Sidebar header */}
          <div className="h-9 px-2.5 border-b border-border flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-text-primary">Library</span>
            <button
              onClick={() => actions.toggleSidebar()}
              className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-background-overlay transition-colors"
              title="Collapse library"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {(['gallery', 'resolution', 'image', 'animation'] as const).map((tab) => (
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

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {ui.activeTab === 'resolution' && <ResolutionTab onGridUpdate={handleGridUpdate} />}
            {ui.activeTab === 'image' && <ImageTab onGridUpdate={handleGridUpdate} />}
            {ui.activeTab === 'animation' && <AnimationTab onCreateAnimation={handleCreateAnimation} />}
            {ui.activeTab === 'gallery' && <ArtGalleryTab onGridUpdate={handleGridUpdate} />}
          </div>
        </aside>
      )}

      {/* Collapsed-library handle — a thin floating affordance to re-open the library. */}
      {ui.sidebarCollapsed && (
        <button
          onClick={() => actions.toggleSidebar()}
          title="Open library"
          className="absolute z-30 w-8 h-8 flex items-center justify-center lc-glass rounded-lg text-text-muted hover:text-text-primary lc-anim"
          style={{ left: 72 + 12, top: 60 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      )}

      {/* ── FLOATING ZOOM / TOOL CONTROLS (glass) — corner overlay near the canvas
          top-right, clear of the right accordion. ── */}
      <div className="absolute z-30 lc-anim" style={{ top: 60, right: chatPanelOpenStyleRight + 12 }}>
        <CanvasToolbar
          bordersVisible={grid.bordersVisible}
          onToggleBorders={() => actions.toggleBorders()}
          onZoomIn={() => canvasHandleRef.current?.zoomIn()}
          onZoomOut={() => canvasHandleRef.current?.zoomOut()}
          onFit={() => canvasHandleRef.current?.fit()}
          onExport={() => setExportOpen(true)}
        />
      </div>

      {/* ── RIGHT ANCHOR: the Pixcel AI panel as a collapsible ACCORDION docked
          far-right, floating over the canvas. Collapsed = a thin rail/handle;
          expanded = the full LiveArtisanPanel. Smooth width transition. ── */}
      <aside
        style={{ width: ui.chatPanelOpen ? panelWidth : RIGHT_RAIL_W }}
        className="absolute inset-y-0 right-0 z-40 flex flex-col bg-background-secondary border-l border-border lc-accordion"
      >
        {ui.chatPanelOpen ? (
          <>
            {/* drag-to-resize handle (only meaningful when expanded) */}
            <div
              onMouseDown={() => {
                resizingRef.current = true;
                document.body.style.userSelect = 'none';
              }}
              className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-col-resize hover:bg-primary/40 z-20"
              title="Drag to resize"
            />
            <div className="h-10 px-3 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-accent-purple">✦</span>
                <span className="text-xs font-semibold text-text-primary">Pixcel AI</span>
              </div>
              <button
                onClick={() => actions.toggleChatPanel()}
                className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-background-overlay transition-colors"
                title="Collapse panel"
              >
                {/* chevron-right = collapse the accordion to its rail */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <LiveArtisanPanel onGridUpdate={handleGridUpdate} initialPrompt={initialPrompt} />
            </div>
          </>
        ) : (
          // Collapsed: a thin vertical rail/handle — click to expand the accordion.
          <button
            onClick={() => actions.toggleChatPanel()}
            title="Open Pixcel AI"
            className="flex flex-col items-center gap-2 h-full w-full pt-3 text-text-muted hover:text-text-primary hover:bg-background-overlay transition-colors"
          >
            <span className="text-[13px] text-accent-purple">✦</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            <span
              className="text-[10px] font-semibold tracking-wide text-text-secondary mt-1"
              style={{ writingMode: 'vertical-rl' }}
            >
              Pixcel AI
            </span>
            {genRunning > 0 && (
              <span className="mt-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[9px] text-primary">
                {genRunning}
              </span>
            )}
          </button>
        )}
      </aside>

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
    <div className="flex flex-col gap-1 p-1 rounded-xl lc-glass">
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
