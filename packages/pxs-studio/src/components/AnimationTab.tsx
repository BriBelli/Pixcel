'use client';

import { useState, useRef, useEffect } from 'react';
import { usePXSStore } from '../store/pxs-store';
import { useAutoSave } from '../hooks/useAutoSave';
import FrameInspector, { InspectorData } from './FrameInspector';

interface AnimationTabProps {
  onCreateAnimation: (type: string) => void;
}

export default function AnimationTab({ onCreateAnimation }: AnimationTabProps) {
  const { animation, actions, grid } = usePXSStore();
  const { exportProject, importProject } = useAutoSave();
  const [isPlaying, setIsPlaying] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setIsPlaying(animation.playing);
  }, [animation.playing]);

  useEffect(() => {
    if (animation.playing && animation.frames.length > 0) {
      animationIntervalRef.current = window.setInterval(() => {
        actions.nextFrame();
      }, 1000 / animation.fps);
      
      return () => {
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current);
        }
      };
    }
  }, [animation.playing, animation.fps, animation.frames.length, actions]);

  const handleExportJSON = () => {
    const json = exportProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pxs-project-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `pxs-artwork-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      importProject(json);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePlay = () => {
    if (isPlaying) {
      actions.pauseAnimation();
    } else {
      actions.playAnimation();
    }
  };

  const handleAddFrame = () => {
    const cells = Array.from(grid.cells.values());
    if (cells.length === 0) return;
    actions.addFrame({
      cols: grid.cols,
      rows: grid.rows,
      cells,
      metadata: { timestamp: Date.now(), source: 'user' },
    });
  };

  const handleOpenInspector = () => {
    setInspectorData({ mode: 'animation' });
    setInspectorOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Export */}
      <section>
        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Export</span>
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <button
            onClick={handleExportJSON}
            className="py-2 rounded text-[10px] font-medium bg-primary hover:bg-primary-dark text-white transition-colors"
          >
            JSON
          </button>
          <button
            onClick={handleExportPNG}
            className="py-2 rounded text-[10px] font-medium bg-accent-green/20 hover:bg-accent-green/30 text-accent-green transition-colors"
          >
            PNG
          </button>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full mt-1.5 py-2 rounded text-[10px] bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-colors"
        >
          Import...
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </section>

      {/* Animation */}
      <section>
        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Animation</span>
        
        {/* Stats */}
        {animation.frames.length > 0 && (
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="font-mono text-primary">{animation.frames.length} frames</span>
            <span className="text-text-muted">{animation.fps} fps</span>
          </div>
        )}

        {/* Playback */}
        {animation.frames.length > 0 && (
          <div className="flex gap-1 mt-2">
            <button
              onClick={actions.prevFrame}
              className="w-8 h-8 rounded flex items-center justify-center bg-background-overlay hover:bg-border text-text-primary transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button
              onClick={handlePlay}
              className={`flex-1 h-8 rounded text-xs font-medium transition-colors ${
                isPlaying 
                  ? 'bg-accent-orange text-white' 
                  : 'bg-primary hover:bg-primary-dark text-white'
              }`}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={actions.stopAnimation}
              className="w-8 h-8 rounded flex items-center justify-center bg-background-overlay hover:bg-border text-text-primary transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
            </button>
            <button
              onClick={actions.nextFrame}
              className="w-8 h-8 rounded flex items-center justify-center bg-background-overlay hover:bg-border text-text-primary transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>
        )}

        {/* Create */}
        <div className="mt-3 space-y-1.5">
          <button
            onClick={handleAddFrame}
            className="w-full py-2 rounded text-[10px] font-medium bg-primary hover:bg-primary-dark text-white transition-colors"
          >
            + Add Frame
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onCreateAnimation('random')}
              className="py-2 rounded text-[10px] bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-colors"
            >
              Random
            </button>
            <button
              onClick={() => onCreateAnimation('gradient')}
              className="py-2 rounded text-[10px] bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-colors"
            >
              Gradient
            </button>
          </div>
        </div>
      </section>

      {/* Inspector */}
      {animation.frames.length > 0 && (
        <button
          onClick={handleOpenInspector}
          className="w-full py-2 rounded text-[10px] font-medium bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple transition-colors"
        >
          Inspect Animation
        </button>
      )}

      {/* Empty State */}
      {animation.frames.length === 0 && (
        <div className="text-center py-6 text-text-muted">
          <div className="text-xs">No frames yet</div>
          <div className="text-[10px] mt-1 opacity-60">Add current grid or generate</div>
        </div>
      )}

      <FrameInspector
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        data={inspectorData}
      />
    </div>
  );
}
