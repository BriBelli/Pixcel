'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePXSStore, PXSFrame } from '../store/pxs-store';

interface FrameDeckProps {
  onFrameSelect?: (index: number) => void;
  onFrameEdit?: (index: number) => void;
}

export default function FrameDeck({ onFrameSelect, onFrameEdit }: FrameDeckProps) {
  const { animation, actions } = usePXSStore();
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  // Render thumbnails
  useEffect(() => {
    animation.frames.forEach((frame, index) => {
      const canvas = canvasRefs.current.get(index);
      if (!canvas || !frame.cells.length) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const cellWidth = canvas.width / frame.cols;
      const cellHeight = canvas.height / frame.rows;
      
      // Clear
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw cells
      frame.cells.forEach(cell => {
        ctx.fillStyle = cell.color;
        ctx.fillRect(
          Math.floor(cell.x * cellWidth),
          Math.floor(cell.y * cellHeight),
          Math.ceil(cellWidth) + 1,
          Math.ceil(cellHeight) + 1
        );
      });
    });
  }, [animation.frames]);

  // Scroll current frame into view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    const frameElement = container.children[animation.currentFrame] as HTMLElement;
    if (frameElement) {
      frameElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [animation.currentFrame]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (dragIndex !== null && dragIndex !== dropIndex) {
      // Reorder frames
      const frames = [...animation.frames];
      const [removed] = frames.splice(dragIndex, 1);
      frames.splice(dropIndex, 0, removed);
      
      // Update store with reordered frames
      actions.loadAnimation({
        fps: animation.fps,
        frames,
        metadata: { loop: animation.loop },
      });
    }
    
    setDragIndex(null);
    setDropTarget(null);
  }, [dragIndex, animation.frames, animation.fps, animation.loop, actions]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropTarget(null);
  }, []);

  if (animation.frames.length === 0) {
    return (
      <div className="h-24 bg-background-overlay/50 rounded-lg border border-border/50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-text-muted text-xs">No frames yet</div>
          <div className="text-text-muted/50 text-[10px] mt-1">Add frames from the Animation tab</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-text-muted">
          Frame {animation.currentFrame + 1} of {animation.frames.length}
        </div>
        <div className="text-xs text-text-muted">
          {animation.fps} FPS • {(animation.frames.length / animation.fps).toFixed(2)}s
        </div>
      </div>

      {/* Scrollable Frame Strip */}
      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin' }}
      >
        {animation.frames.map((frame, index) => {
          const isActive = animation.currentFrame === index;
          const isDragging = dragIndex === index;
          const isDropTarget = dropTarget === index && dragIndex !== index;
          
          return (
            <div
              key={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                actions.goToFrame(index);
                onFrameSelect?.(index);
              }}
              onDoubleClick={() => onFrameEdit?.(index)}
              className={`
                relative flex-shrink-0 cursor-pointer group transition-all duration-150
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isDropTarget ? 'ml-8' : ''}
              `}
            >
              {/* Frame Container */}
              <div className={`
                relative rounded-lg overflow-hidden transition-all
                ${isActive 
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-primary' 
                  : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background-primary'
                }
              `}>
                {/* Thumbnail Canvas */}
                <canvas
                  ref={(el) => { if (el) canvasRefs.current.set(index, el); }}
                  width={64}
                  height={48}
                  className="bg-background-tertiary"
                />
                
                {/* Playing indicator */}
                {animation.playing && isActive && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-primary animate-ping" />
                  </div>
                )}
                
                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.duplicateFrame(index);
                    }}
                    className="w-6 h-6 rounded bg-white/20 hover:bg-white/30 text-xs"
                    title="Duplicate"
                  >
                    📋
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.removeFrame(index);
                    }}
                    className="w-6 h-6 rounded bg-red-500/40 hover:bg-red-500/60 text-xs"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {/* Frame Number */}
              <div className={`
                text-center text-[10px] mt-1 font-mono
                ${isActive ? 'text-primary font-bold' : 'text-text-muted'}
              `}>
                {index + 1}
              </div>
            </div>
          );
        })}
        
        {/* Add Frame Button */}
        <div className="flex-shrink-0 flex items-center">
          <button
            onClick={() => {
              // Add empty frame or duplicate current
              if (animation.frames.length > 0) {
                actions.duplicateFrame(animation.currentFrame);
              }
            }}
            className="w-16 h-12 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
            title="Add new frame"
          >
            <span className="text-lg text-text-muted">+</span>
          </button>
        </div>
      </div>

      {/* Playback Progress Bar */}
      <div className="h-1 bg-background-overlay rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-100"
          style={{ 
            width: `${((animation.currentFrame + 1) / animation.frames.length) * 100}%` 
          }}
        />
      </div>
    </div>
  );
}
