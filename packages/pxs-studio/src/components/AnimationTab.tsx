'use client';

import { useState, useRef } from 'react';
import { usePXSStore } from '../store/pxs-store';
import { useAutoSave } from '../hooks/useAutoSave';

interface AnimationTabProps {
  onCreateAnimation: (type: string) => void;
}

export default function AnimationTab({ onCreateAnimation }: AnimationTabProps) {
  const { animation, actions, grid } = usePXSStore();
  const { exportProject, importProject, getBackups, loadBackup } = useAutoSave();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export handlers
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

  // Import handler
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const success = importProject(json);
      if (success) {
        console.log('✅ Project imported successfully');
      } else {
        console.error('❌ Failed to import project');
      }
    };
    reader.readAsText(file);
  };

  // Playback controls
  const handlePlay = () => {
    if (isPlaying) {
      actions.pauseAnimation();
    } else {
      actions.playAnimation();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    actions.stopAnimation();
    setIsPlaying(false);
  };

  const handlePrev = () => {
    actions.prevFrame();
  };

  const handleNext = () => {
    actions.nextFrame();
  };

  // Add current frame
  const handleAddFrame = () => {
    const cells = Array.from(grid.cells.values());
    actions.addFrame({
      cols: grid.cols,
      rows: grid.rows,
      cells,
    });
  };

  // Get backups
  const backups = getBackups();

  return (
    <div className="space-y-6 p-6">
      {/* Export/Import */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-text-primary">💾 Export / Import</h3>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-colors"
            >
              📦 Export JSON
            </button>
            <button
              onClick={handleExportPNG}
              className="px-4 py-2 rounded-lg bg-accent-green/20 hover:bg-accent-green/30 border border-accent-green/30 text-accent-green text-sm font-medium transition-colors"
            >
              🖼️ Export PNG
            </button>
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors"
          >
            📂 Import Project...
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </section>

      {/* Backups */}
      <section>
        <button
          onClick={() => setShowBackups(!showBackups)}
          className="flex items-center justify-between w-full text-sm font-semibold text-text-primary mb-3"
        >
          <span>🕐 Recent Backups ({backups.length})</span>
          <span className="text-xs text-text-muted">{showBackups ? '▲' : '▼'}</span>
        </button>
        
        {showBackups && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {backups.length === 0 ? (
              <p className="text-xs text-text-muted p-2">No backups yet</p>
            ) : (
              backups.map((backup, index) => (
                <button
                  key={backup.id}
                  onClick={() => loadBackup(index)}
                  className="w-full px-3 py-2 rounded-lg bg-background-overlay hover:bg-border text-left text-xs transition-colors"
                >
                  <div className="text-text-primary font-medium">
                    {backup.grid.cols}×{backup.grid.rows} Grid
                  </div>
                  <div className="text-text-muted">
                    {new Date(backup.timestamp).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </section>

      <hr className="border-border" />

      {/* Create Animation */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-text-primary">✨ Create Animation</h3>
        <div className="space-y-2">
          <button
            onClick={handleAddFrame}
            className="w-full px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
          >
            ➕ Add Current Grid as Frame
          </button>
          <button
            onClick={() => onCreateAnimation('random')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors"
          >
            🎲 Generate Random Animation (10 frames)
          </button>
          <button
            onClick={() => onCreateAnimation('gradient')}
            className="w-full px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors"
          >
            🌈 Generate Gradient Animation (30 frames)
          </button>
        </div>
      </section>

      {/* Animation Info */}
      {animation.frames.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3 text-text-primary">📊 Animation Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background-overlay">
              <div className="text-2xl font-bold text-primary">{animation.frames.length}</div>
              <div className="text-xs text-text-muted">Frames</div>
            </div>
            <div className="p-3 rounded-lg bg-background-overlay">
              <div className="text-2xl font-bold text-primary">{animation.fps}</div>
              <div className="text-xs text-text-muted">FPS</div>
            </div>
            <div className="p-3 rounded-lg bg-background-overlay">
              <div className="text-lg font-mono text-accent-green">{animation.currentFrame + 1}</div>
              <div className="text-xs text-text-muted">Current Frame</div>
            </div>
            <div className="p-3 rounded-lg bg-background-overlay">
              <div className="text-lg font-mono text-accent-green">
                {(animation.frames.length / animation.fps).toFixed(2)}s
              </div>
              <div className="text-xs text-text-muted">Duration</div>
            </div>
          </div>
        </section>
      )}

      {/* Playback Controls */}
      {animation.frames.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3 text-text-primary">🎬 Playback</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePlay}
              className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
            >
              {isPlaying ? '⏸ Pause' : '▶️ Play'}
            </button>
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-lg bg-background-overlay hover:bg-border text-text-primary transition-colors"
            >
              ⏹
            </button>
          </div>
          
          <div className="flex gap-2 mt-2">
            <button
              onClick={handlePrev}
              className="flex-1 px-3 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors"
            >
              ⏮ Prev
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-3 py-2 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors"
            >
              ⏭ Next
            </button>
          </div>
        </section>
      )}

      {/* Frame Deck */}
      {animation.frames.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3 text-text-primary">🎞️ Frame Timeline</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {animation.frames.map((frame, index) => (
              <button
                key={index}
                onClick={() => actions.goToFrame(index)}
                className={`flex-shrink-0 w-16 h-12 rounded-lg border-2 transition-all ${
                  animation.currentFrame === index
                    ? 'border-primary bg-primary/20'
                    : 'border-border bg-background-overlay hover:border-primary/50'
                }`}
              >
                <div className="text-xs font-mono text-center pt-3 text-text-muted">
                  {index + 1}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Info */}
      {animation.frames.length === 0 && (
        <div className="p-4 rounded-lg bg-accent-purple/10 border border-accent-purple/20">
          <div className="text-sm space-y-2">
            <p className="font-semibold text-accent-purple">🎬 Animations</p>
            <p className="text-text-secondary text-xs">
              Create multi-frame animations with smooth playback. Add the current grid as a frame, or generate procedural animations!
            </p>
            <p className="text-text-muted text-xs mt-2">
              💡 Keyboard: Space=Play, ←/→=Frames
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
