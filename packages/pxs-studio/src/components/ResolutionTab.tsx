'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useGridWorker } from '../hooks/useGridWorker';
import { usePXSStore } from '../store/pxs-store';
import type { GridData } from '../workers/grid.worker';

// Simple 12 presets from low to high res
const MAIN_PRESETS = [
  { label: '8×8', cols: 8, rows: 8 },
  { label: '16×16', cols: 16, rows: 16 },
  { label: '32×32', cols: 32, rows: 32 },
  { label: '48×48', cols: 48, rows: 48 },
  { label: '64×48', cols: 64, rows: 48 },
  { label: '64×64', cols: 64, rows: 64 },
  { label: '96×72', cols: 96, rows: 72 },
  { label: '128×96', cols: 128, rows: 96 },
  { label: '160×120', cols: 160, rows: 120 },
  { label: '200×150', cols: 200, rows: 150 },
  { label: '256×192', cols: 256, rows: 192 },
  { label: '320×240', cols: 320, rows: 240 },
];

const EXTRA_PRESETS = [
  { label: '400×300', cols: 400, rows: 300 },
  { label: '480×360', cols: 480, rows: 360 },
  { label: '512×384', cols: 512, rows: 384 },
  { label: '640×480', cols: 640, rows: 480 },
];

interface ResolutionTabProps {
  onGridUpdate: (gridData: GridData) => void;
}

export default function ResolutionTab({ onGridUpdate }: ResolutionTabProps) {
  const { grid, actions } = usePXSStore();
  const gridWorker = useGridWorker();
  const animationRef = useRef<number | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [activeEffect, setActiveEffect] = useState<string | null>(null);

  // Stop animation
  const stopAnimation = useCallback(() => {
    setActiveEffect(null);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Run effect animation using latest grid dimensions
  const startEffect = useCallback((type: string, cols: number, rows: number) => {
    if (!gridWorker.isReady) return;
    
    // Clear previous animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setActiveEffect(type);
    const startTime = performance.now();

    const animate = async () => {
      const time = (performance.now() - startTime) / 1000;
      
      try {
        let gridData: GridData;
        
        switch (type) {
          case 'spiral':
            gridData = await gridWorker.spiral(cols, rows, time, 0.8);
            break;
          case 'radialPulse':
            gridData = await gridWorker.radialPulse(cols, rows, time);
            break;
          case 'plasma':
            gridData = await gridWorker.plasma(cols, rows, time);
            break;
          case 'pixelBurst':
            gridData = await gridWorker.pixelBurst(cols, rows, time);
            break;
          default:
            return;
        }

        onGridUpdate(gridData);
        animationRef.current = requestAnimationFrame(animate);
      } catch (error) {
        console.error('Animation error:', error);
        setActiveEffect(null);
      }
    };

    animate();
  }, [gridWorker, onGridUpdate]);

  // Change resolution - resume animation with new dimensions
  const changeResolution = useCallback(async (cols: number, rows: number) => {
    if (!gridWorker.isReady) return;
    
    const wasActive = activeEffect;
    
    // Stop current animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    try {
      actions.createGrid(cols, rows);
      const gridData = await gridWorker.createGrid(cols, rows);
      onGridUpdate(gridData);
      
      // Resume animation with new dimensions
      if (wasActive) {
        // Small delay to let grid update settle
        setTimeout(() => {
          startEffect(wasActive, cols, rows);
        }, 16);
      }
    } catch (error) {
      console.error('Failed to change resolution:', error);
    }
  }, [gridWorker, activeEffect, actions, onGridUpdate, startEffect]);

  // Start effect with current grid dimensions
  const runEffect = (type: string) => {
    startEffect(type, grid.cols, grid.rows);
  };

  // Apply static pattern
  const applyPattern = async (type: string) => {
    if (!gridWorker.isReady) return;
    stopAnimation();

    try {
      let gridData: GridData;

      switch (type) {
        case 'horizontal':
          gridData = await gridWorker.horizontalGradient(grid.cols, grid.rows, '#58a6ff', '#bc8cff');
          break;
        case 'radial':
          gridData = await gridWorker.radialGradient(grid.cols, grid.rows, '#58a6ff', '#0d1117');
          break;
        case 'diagonal':
          gridData = await gridWorker.diagonalGradient(grid.cols, grid.rows, '#ff7b72', '#d2a8ff');
          break;
        case 'noise':
          gridData = await gridWorker.noise(grid.cols, grid.rows);
          break;
        default:
          return;
      }

      onGridUpdate(gridData);
    } catch (error) {
      console.error('Failed to apply pattern:', error);
    }
  };

  const allPresets = showMore ? [...MAIN_PRESETS, ...EXTRA_PRESETS] : MAIN_PRESETS;

  return (
    <div className="p-4 space-y-5">
      {/* Grid Info - Minimal */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-primary font-semibold">{grid.cols}×{grid.rows}</span>
        <span className="text-text-muted">{(grid.cols * grid.rows).toLocaleString()}</span>
      </div>

      {/* Resolution Grid */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Size</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {allPresets.map((preset) => {
            const isActive = grid.cols === preset.cols && grid.rows === preset.rows;
            return (
              <button
                key={preset.label}
                onClick={() => changeResolution(preset.cols, preset.rows)}
                className={`py-2 px-1 rounded text-[11px] font-mono transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full mt-2 py-1.5 text-[10px] text-text-muted hover:text-primary transition-colors"
        >
          {showMore ? '− Less' : '+ More sizes'}
        </button>
      </section>

      {/* Live Effects */}
      <section>
        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Live Effects</span>
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <button
            onClick={() => runEffect('spiral')}
            className={`group relative py-2.5 px-3 rounded text-xs font-medium transition-all overflow-hidden ${
              activeEffect === 'spiral' 
                ? 'bg-primary text-white' 
                : 'bg-background-overlay hover:bg-border text-text-primary'
            }`}
          >
            <span className="relative z-10">Spiral</span>
            {activeEffect === 'spiral' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </button>
          <button
            onClick={() => runEffect('radialPulse')}
            className={`group relative py-2.5 px-3 rounded text-xs font-medium transition-all overflow-hidden ${
              activeEffect === 'radialPulse' 
                ? 'bg-primary text-white' 
                : 'bg-background-overlay hover:bg-border text-text-primary'
            }`}
          >
            <span className="relative z-10">Pulse</span>
            {activeEffect === 'radialPulse' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </button>
          <button
            onClick={() => runEffect('plasma')}
            className={`group relative py-2.5 px-3 rounded text-xs font-medium transition-all overflow-hidden ${
              activeEffect === 'plasma' 
                ? 'bg-primary text-white' 
                : 'bg-background-overlay hover:bg-border text-text-primary'
            }`}
          >
            <span className="relative z-10">Plasma</span>
            {activeEffect === 'plasma' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </button>
          <button
            onClick={() => runEffect('pixelBurst')}
            className={`group relative py-2.5 px-3 rounded text-xs font-medium transition-all overflow-hidden ${
              activeEffect === 'pixelBurst' 
                ? 'bg-primary text-white' 
                : 'bg-background-overlay hover:bg-border text-text-primary'
            }`}
          >
            <span className="relative z-10">Pixel Burst</span>
            {activeEffect === 'pixelBurst' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </button>
        </div>
      </section>

      {/* Patterns */}
      <section>
        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Patterns</span>
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          <button
            onClick={() => applyPattern('horizontal')}
            className="py-2 rounded text-[10px] bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-all"
          >
            Linear
          </button>
          <button
            onClick={() => applyPattern('radial')}
            className="py-2 rounded text-[10px] bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-all"
          >
            Radial
          </button>
          <button
            onClick={() => applyPattern('diagonal')}
            className="py-2 rounded text-[10px] bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-all"
          >
            Diagonal
          </button>
          <button
            onClick={() => applyPattern('noise')}
            className="py-2 rounded text-[10px] bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-all"
          >
            Noise
          </button>
        </div>
      </section>

      {/* Stop Button */}
      {activeEffect && (
        <button
          onClick={stopAnimation}
          className="w-full py-2 rounded text-xs font-medium bg-accent-red/10 hover:bg-accent-red/20 text-accent-red border border-accent-red/20 transition-all"
        >
          Stop Effect
        </button>
      )}
    </div>
  );
}
