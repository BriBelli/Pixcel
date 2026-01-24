'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useGridWorker } from '../hooks/useGridWorker';
import { usePXSStore } from '../store/pxs-store';
import type { GridData } from '../workers/grid.worker';

const RESOLUTION_PRESETS = [
  { name: '8-bit', quality: 'Micro', cols: 8, rows: 8 },
  { name: '16-bit', quality: 'Tiny', cols: 16, rows: 16 },
  { name: '32-bit', quality: 'Retro', cols: 32, rows: 24 },
  { name: '40×30', quality: 'Retro', cols: 40, rows: 30 },
  { name: '64×48', quality: 'SD', cols: 64, rows: 48 },
  { name: '128×96', quality: 'HD', cols: 128, rows: 96 },
  { name: 'QQVGA', quality: 'HD+', cols: 160, rows: 120 },
  { name: '256×192', quality: '4K', cols: 256, rows: 192 },
  { name: 'QVGA', quality: 'UHD', cols: 320, rows: 240 },
];

interface ResolutionTabProps {
  onGridUpdate: (gridData: GridData) => void;
}

export default function ResolutionTab({ onGridUpdate }: ResolutionTabProps) {
  const { grid, actions } = usePXSStore();
  const gridWorker = useGridWorker();
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  // Stop any running animation
  const stopAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAnimation();
  }, [stopAnimation]);

  const createGrid = async (cols: number, rows: number) => {
    if (!gridWorker.isReady) return;
    stopAnimation();

    try {
      actions.createGrid(cols, rows);
      const gridData = await gridWorker.createGrid(cols, rows);
      onGridUpdate(gridData);
    } catch (error) {
      console.error('Failed to create grid:', error);
    }
  };

  // Animation methods
  const runAnimation = useCallback(async (
    animationType: 'diagonalPulse' | 'wave' | 'spiral',
    baseHue?: number
  ) => {
    if (!gridWorker.isReady) return;
    
    stopAnimation();
    isAnimatingRef.current = true;
    const startTime = performance.now();

    const animate = async () => {
      if (!isAnimatingRef.current) return;

      const time = (performance.now() - startTime) / 1000;
      
      try {
        let gridData: GridData;
        
        switch (animationType) {
          case 'diagonalPulse':
            gridData = await gridWorker.diagonalPulse(grid.cols, grid.rows, time, baseHue);
            break;
          case 'wave':
            gridData = await gridWorker.wave(grid.cols, grid.rows, time, baseHue);
            break;
          case 'spiral':
            gridData = await gridWorker.spiral(grid.cols, grid.rows, time, baseHue);
            break;
        }

        if (isAnimatingRef.current) {
          onGridUpdate(gridData);
          animationRef.current = requestAnimationFrame(animate);
        }
      } catch (error) {
        console.error('Animation error:', error);
        stopAnimation();
      }
    };

    animate();
  }, [gridWorker, grid.cols, grid.rows, stopAnimation, onGridUpdate]);

  const animate = async (type: string) => {
    switch (type) {
      case 'diagonal':
        runAnimation('diagonalPulse', 0.6);
        break;
      case 'wave':
        runAnimation('wave', 0.55);
        break;
      case 'spiral':
        runAnimation('spiral', 0.8);
        break;
      case 'random':
        if (!gridWorker.isReady) return;
        stopAnimation();
        const gridData = await gridWorker.randomBurst(grid.cols, grid.rows);
        onGridUpdate(gridData);
        break;
    }
  };

  const applyPattern = async (type: string) => {
    if (!gridWorker.isReady) return;
    stopAnimation();

    try {
      let gridData: GridData;

      switch (type) {
        case 'gradient-linear':
          gridData = await gridWorker.horizontalGradient(grid.cols, grid.rows, '#58a6ff', '#bc8cff');
          break;
        case 'gradient-vertical':
          gridData = await gridWorker.verticalGradient(grid.cols, grid.rows, '#58a6ff', '#3fb950');
          break;
        case 'gradient-radial':
          gridData = await gridWorker.radialGradient(grid.cols, grid.rows, '#58a6ff', '#0d1117');
          break;
        case 'gradient-diagonal':
          gridData = await gridWorker.diagonalGradient(grid.cols, grid.rows, '#ff7b72', '#d2a8ff');
          break;
        case 'checkerboard':
          gridData = await gridWorker.checkerboard(grid.cols, grid.rows, '#1a1f2e', '#2d3548');
          break;
        default:
          return;
      }

      onGridUpdate(gridData);
    } catch (error) {
      console.error('Failed to apply pattern:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Resolution Presets */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-text-primary">📏 Resolution Presets</h3>
        <div className="grid grid-cols-3 gap-2">
          {RESOLUTION_PRESETS.map((preset) => (
            <button
              key={`${preset.cols}x${preset.rows}`}
              onClick={() => createGrid(preset.cols, preset.rows)}
              className={`p-2 rounded-lg text-xs transition-all ${
                grid.cols === preset.cols && grid.rows === preset.rows
                  ? 'bg-primary text-white border-2 border-primary'
                  : 'bg-background-overlay hover:bg-border border-2 border-transparent text-text-primary'
              }`}
            >
              <div className="font-semibold">{preset.name}</div>
              <div className="text-[10px] opacity-70">({preset.quality})</div>
              <div className="text-[9px] opacity-50">{preset.cols}×{preset.rows}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Grid Stats */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-text-primary">📊 Grid Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-background-overlay">
            <div className="text-2xl font-bold text-primary">{grid.cols}</div>
            <div className="text-xs text-text-muted">Columns</div>
          </div>
          <div className="p-3 rounded-lg bg-background-overlay">
            <div className="text-2xl font-bold text-primary">{grid.rows}</div>
            <div className="text-xs text-text-muted">Rows</div>
          </div>
          <div className="p-3 rounded-lg bg-background-overlay">
            <div className="text-2xl font-bold text-primary">{(grid.cols * grid.rows).toLocaleString()}</div>
            <div className="text-xs text-text-muted">Total Cells</div>
          </div>
          <div className="p-3 rounded-lg bg-background-overlay">
            <div className="text-xs font-mono text-accent-green uppercase">{grid.renderer}</div>
            <div className="text-xs text-text-muted">Renderer</div>
          </div>
        </div>
      </section>

      {/* Animations */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-text-primary">🎬 Animations</h3>
        <div className="space-y-2">
          <button
            onClick={() => animate('diagonal')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors flex items-center gap-2"
          >
            <span className="text-lg">↗️</span>
            <span>Diagonal Pulse</span>
          </button>
          <button
            onClick={() => animate('wave')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors flex items-center gap-2"
          >
            <span className="text-lg">🌊</span>
            <span>Wave Effect</span>
          </button>
          <button
            onClick={() => animate('spiral')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors flex items-center gap-2"
          >
            <span className="text-lg">🌀</span>
            <span>Spiral Glow</span>
          </button>
          <button
            onClick={() => animate('random')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors flex items-center gap-2"
          >
            <span className="text-lg">🎲</span>
            <span>Random Burst</span>
          </button>
        </div>
      </section>

      {/* Patterns */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-text-primary">🎨 Patterns</h3>
        <div className="space-y-2">
          <button
            onClick={() => applyPattern('gradient-linear')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors flex items-center gap-2"
          >
            <span className="text-lg">➡️</span>
            <span>Linear Gradient</span>
          </button>
          <button
            onClick={() => applyPattern('gradient-radial')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors flex items-center gap-2"
          >
            <span className="text-lg">⭕</span>
            <span>Radial Gradient</span>
          </button>
          <button
            onClick={() => applyPattern('gradient-diagonal')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors flex items-center gap-2"
          >
            <span className="text-lg">↘️</span>
            <span>Diagonal Gradient</span>
          </button>
          <button
            onClick={() => applyPattern('checkerboard')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors flex items-center gap-2"
          >
            <span className="text-lg">🏁</span>
            <span>Checkerboard</span>
          </button>
        </div>
      </section>

      {/* Actions */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-text-primary">🔧 Actions</h3>
        <div className="space-y-2">
          <button
            onClick={stopAnimation}
            className="w-full px-4 py-2 rounded-lg bg-accent-red/10 hover:bg-accent-red/20 border border-accent-red/30 text-sm text-accent-red transition-colors flex items-center justify-center gap-2"
          >
            <span>⏹</span>
            <span>Stop Animations</span>
          </button>
          <button
            onClick={() => createGrid(grid.cols, grid.rows)}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>Reset Grid</span>
          </button>
        </div>
      </section>
    </div>
  );
}
