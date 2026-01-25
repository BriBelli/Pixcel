'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePXSStore, PXSFrame, PXSCell } from '../store/pxs-store';

export type InspectorMode = 'animation' | 'frame' | 'cell';

export interface InspectorData {
  mode: InspectorMode;
  frameIndex?: number;
  cell?: { x: number; y: number; color: string };
}

interface FrameInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  data: InspectorData | null;
  onCellColorChange?: (x: number, y: number, color: string) => void;
}

export default function FrameInspector({ isOpen, onClose, data, onCellColorChange }: FrameInspectorProps) {
  const { animation, grid, actions } = usePXSStore();
  const [activeTab, setActiveTab] = useState<'metadata' | 'code' | 'cells'>('metadata');
  const [editColor, setEditColor] = useState('#58a6ff');
  const codeRef = useRef<HTMLPreElement>(null);

  // Get the data to inspect based on mode
  const getInspectData = useCallback(() => {
    if (!data) return null;
    
    if (data.mode === 'animation') {
      return {
        title: animation.frames[0]?.metadata?.name || 'Animation',
        subtitle: `${animation.frames.length} frames • ${animation.fps} FPS`,
        icon: '🎬',
        data: {
          fps: animation.fps,
          frames: animation.frames,
          metadata: { name: 'Animation', loop: animation.loop },
        },
      };
    }
    
    if (data.mode === 'frame' && data.frameIndex !== undefined) {
      const frame = animation.frames[data.frameIndex];
      if (!frame) return null;
      return {
        title: `Frame ${data.frameIndex + 1}`,
        subtitle: `${frame.cols}×${frame.rows} • ${frame.cells.length} cells`,
        icon: '🖼️',
        data: frame,
      };
    }
    
    if (data.mode === 'cell' && data.cell) {
      return {
        title: `Cell (${data.cell.x}, ${data.cell.y})`,
        subtitle: `Color: ${data.cell.color}`,
        icon: '🎨',
        data: data.cell,
      };
    }
    
    return null;
  }, [data, animation]);

  const inspectData = getInspectData();

  // Reset tab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab('metadata');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleCopyCode = () => {
    if (!inspectData) return;
    const json = JSON.stringify(inspectData.data, null, 2);
    navigator.clipboard.writeText(json);
  };

  const handleDownload = () => {
    if (!inspectData) return;
    const json = JSON.stringify(inspectData.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pxs-${data?.mode}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleColorChange = (x: number, y: number, color: string) => {
    if (onCellColorChange) {
      onCellColorChange(x, y, color);
    }
  };

  if (!isOpen || !inspectData) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="w-full max-w-3xl max-h-[85vh] bg-background-secondary rounded-xl border border-border overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-background-tertiary border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-base">
              {inspectData.icon}
            </div>
            <div>
              <div className="font-semibold text-text-primary text-sm">{inspectData.title}</div>
              <div className="text-xs text-text-muted">{inspectData.subtitle}</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-border text-text-muted hover:text-text-primary transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-4 bg-background-tertiary border-b border-border">
          {['metadata', 'code', 'cells'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {tab === 'metadata' ? '📊 Metadata' : tab === 'code' ? '{ } Code' : '🎨 ' + (data?.mode === 'animation' ? 'Frames' : 'Cells')}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-auto max-h-[60vh]">
          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <MetadataPanel data={inspectData.data} mode={data?.mode || 'frame'} />
          )}

          {/* Code Tab */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>
                  {JSON.stringify(inspectData.data).length.toLocaleString()} bytes • JSON
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1 rounded bg-background-overlay hover:bg-border text-text-primary text-xs font-medium transition-colors"
                  >
                    💾 Download
                  </button>
                </div>
              </div>
              <pre
                ref={codeRef}
                className="p-4 rounded-lg bg-background-primary border border-border text-xs font-mono text-text-secondary overflow-auto max-h-80"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              >
                {JSON.stringify(inspectData.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Cells/Frames Tab */}
          {activeTab === 'cells' && (
            <div className="space-y-4">
              {data?.mode === 'animation' ? (
                <FramePreviewGrid 
                  frames={animation.frames} 
                  onSelectFrame={(index) => {
                    actions.goToFrame(index);
                  }} 
                  currentFrame={animation.currentFrame}
                />
              ) : data?.mode === 'frame' && data.frameIndex !== undefined ? (
                <CellGrid 
                  frame={animation.frames[data.frameIndex]} 
                  onSelectCell={(x, y) => {
                    // Could open cell editor
                  }}
                />
              ) : data?.mode === 'cell' && data.cell ? (
                <CellEditor 
                  cell={data.cell}
                  editColor={editColor}
                  setEditColor={setEditColor}
                  onApply={(color) => handleColorChange(data.cell!.x, data.cell!.y, color)}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Metadata panel component
function MetadataPanel({ data, mode }: { data: any; mode: InspectorMode }) {
  if (mode === 'animation') {
    const duration = data.frames?.length > 0 ? ((data.frames.length / data.fps) * 1000).toFixed(0) : 0;
    const totalCells = data.frames?.[0]?.cells?.length || 0;
    const dimensions = data.frames?.[0] ? `${data.frames[0].cols}×${data.frames[0].rows}` : 'N/A';
    
    return (
      <div className="grid grid-cols-3 gap-3">
        <MetaCard label="Frames" value={data.frames?.length || 0} />
        <MetaCard label="FPS" value={data.fps} />
        <MetaCard label="Duration" value={`${duration}ms`} />
        <MetaCard label="Dimensions" value={dimensions} small />
        <MetaCard label="Cells/Frame" value={totalCells.toLocaleString()} />
        <MetaCard label="Loop" value={data.metadata?.loop ? '✓ Yes' : '✗ No'} />
      </div>
    );
  }
  
  if (mode === 'frame') {
    const uniqueColors = new Set(data.cells?.map((c: PXSCell) => c.color) || []).size;
    return (
      <div className="grid grid-cols-3 gap-3">
        <MetaCard label="Dimensions" value={`${data.cols}×${data.rows}`} />
        <MetaCard label="Total Cells" value={data.cells?.length?.toLocaleString() || 0} />
        <MetaCard label="Unique Colors" value={uniqueColors} />
        <MetaCard label="Source" value={data.metadata?.source || 'Generated'} small />
        <MetaCard label="Timestamp" value={data.metadata?.timestamp ? new Date(data.metadata.timestamp).toLocaleDateString() : 'N/A'} small />
        <MetaCard label="Version" value={data.metadata?.version || '3.0'} small />
      </div>
    );
  }
  
  if (mode === 'cell') {
    return (
      <div className="grid grid-cols-3 gap-3">
        <MetaCard label="Position" value={`(${data.x}, ${data.y})`} />
        <MetaCard label="Color" value={data.color} small />
        <div className="p-4 rounded-lg bg-background-overlay">
          <div className="w-full h-8 rounded" style={{ backgroundColor: data.color }} />
        </div>
      </div>
    );
  }
  
  return null;
}

function MetaCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-background-overlay">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`font-bold ${small ? 'text-sm' : 'text-xl'} text-primary`}>{value}</div>
    </div>
  );
}

// Frame preview grid
function FramePreviewGrid({ 
  frames, 
  onSelectFrame, 
  currentFrame 
}: { 
  frames: PXSFrame[]; 
  onSelectFrame: (index: number) => void;
  currentFrame: number;
}) {
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    frames.forEach((frame, index) => {
      const canvas = canvasRefs.current.get(index);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const cellWidth = canvas.width / frame.cols;
      const cellHeight = canvas.height / frame.rows;
      
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      frame.cells.forEach(cell => {
        ctx.fillStyle = cell.color;
        ctx.fillRect(
          cell.x * cellWidth,
          cell.y * cellHeight,
          Math.ceil(cellWidth),
          Math.ceil(cellHeight)
        );
      });
    });
  }, [frames]);

  return (
    <div>
      <div className="text-xs text-text-muted mb-3">Click any frame to jump to it</div>
      <div className="flex flex-wrap gap-3">
        {frames.map((frame, index) => (
          <button
            key={index}
            onClick={() => onSelectFrame(index)}
            className={`text-center transition-all ${
              currentFrame === index ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-secondary' : ''
            }`}
          >
            <canvas
              ref={(el) => { if (el) canvasRefs.current.set(index, el); }}
              width={48}
              height={36}
              className="rounded border border-border bg-background-tertiary"
            />
            <div className="text-[10px] text-text-muted mt-1">Frame {index + 1}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Cell grid preview
function CellGrid({ 
  frame, 
  onSelectCell 
}: { 
  frame: PXSFrame; 
  onSelectCell: (x: number, y: number) => void;
}) {
  if (!frame) return null;
  
  // Only show first 100 cells as color swatches
  const displayCells = frame.cells.slice(0, 100);
  
  return (
    <div>
      <div className="text-xs text-text-muted mb-3">
        Showing {displayCells.length} of {frame.cells.length} cells
      </div>
      <div className="flex flex-wrap gap-1">
        {displayCells.map((cell, i) => (
          <button
            key={i}
            onClick={() => onSelectCell(cell.x, cell.y)}
            className="w-6 h-6 rounded border border-border hover:ring-2 hover:ring-primary transition-all"
            style={{ backgroundColor: cell.color }}
            title={`(${cell.x}, ${cell.y}) - ${cell.color}`}
          />
        ))}
      </div>
    </div>
  );
}

// Cell editor
function CellEditor({ 
  cell, 
  editColor, 
  setEditColor, 
  onApply 
}: { 
  cell: { x: number; y: number; color: string };
  editColor: string;
  setEditColor: (color: string) => void;
  onApply: (color: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div>
          <div className="text-xs text-text-muted mb-2">Current Color</div>
          <div 
            className="w-16 h-16 rounded-lg border border-border"
            style={{ backgroundColor: cell.color }}
          />
        </div>
        <div className="text-xl text-text-muted">→</div>
        <div>
          <div className="text-xs text-text-muted mb-2">New Color</div>
          <input
            type="color"
            value={editColor}
            onChange={(e) => setEditColor(e.target.value)}
            className="w-16 h-16 rounded-lg cursor-pointer"
          />
        </div>
      </div>
      <button
        onClick={() => onApply(editColor)}
        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
      >
        Apply Color
      </button>
    </div>
  );
}
