'use client';

import { useState, useRef } from 'react';
import { useImageWorker } from '../hooks/useImageWorker';
import { usePXSStore } from '../store/pxs-store';

const QUALITY_PRESETS = [
  { name: 'Retro', size: 32 },
  { name: 'Low', size: 48 },
  { name: 'Medium', size: 64 },
  { name: 'High', size: 128 },
  { name: 'HD', size: 192 },
  { name: 'Ultra', size: 256 },
  { name: '2K', size: 512 },
  { name: '4K', size: 1024 },
  { name: '8K', size: 2048 },
];

// Display-density multipliers (@1x / @2x / @3x). Same idea as iOS asset
// scaling — multiplies the chosen quality preset for retina/mobile output.
const SCALE_MULTIPLIERS = [1, 2, 3];

interface ImageTabProps {
  onGridUpdate: (data: { cols: number; rows: number; cells: Array<{ x: number; y: number; color: string; opacity: number }>; totalCells: number; creationTime: number }) => void;
}

export default function ImageTab({ onGridUpdate }: ImageTabProps) {
  const { grid } = usePXSStore();
  const imageWorker = useImageWorker();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastProcessTime, setLastProcessTime] = useState<number | null>(null);
  const [wasmUsed, setWasmUsed] = useState(false);
  const [sharpMode, setSharpMode] = useState(false);
  const [scaleMultiplier, setScaleMultiplier] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setLastProcessTime(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const processImage = async (targetCols: number, targetRows: number) => {
    if (!selectedFile || !imageWorker.isReady) return;

    setProcessing(true);

    try {
      const result = await imageWorker.processImage(selectedFile, targetCols, targetRows, true, sharpMode);
      setLastProcessTime(result.processTime);
      setWasmUsed(result.wasmUsed);

      onGridUpdate({
        cols: result.cols,
        rows: result.rows,
        cells: result.cells.map((c) => ({ x: c.x, y: c.y, color: c.color, opacity: c.opacity ?? 1 })),
        totalCells: result.cells.length,
        creationTime: result.processTime
      });
    } catch (error) {
      console.error('Failed to process image:', error);
    } finally {
      setProcessing(false);
    }
  };

  const renderAtQuality = async (quality: typeof QUALITY_PRESETS[0]) => {
    if (!selectedFile || !previewUrl) return;

    const img = new Image();
    img.src = previewUrl;
    await new Promise((resolve) => { img.onload = resolve; });

    const aspectRatio = img.width / img.height;
    const baseSize = quality.size * scaleMultiplier;
    let cols, rows;

    if (aspectRatio > 1) {
      cols = baseSize;
      rows = Math.round(cols / aspectRatio);
    } else {
      rows = baseSize;
      cols = Math.round(rows * aspectRatio);
    }

    await processImage(cols, rows);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Upload */}
      <section>
        <div
          className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="text-xs text-text-muted">
            {selectedFile ? selectedFile.name : 'Drop image or click'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="mt-2 relative rounded overflow-hidden">
            <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-32 object-contain bg-black/20" />
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setLastProcessTime(null);
              }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background-primary/80 text-text-muted hover:text-text-primary text-xs flex items-center justify-center transition-colors"
            >
              ×
            </button>
          </div>
        )}
      </section>

      {/* Sampling Mode */}
      {selectedFile && (
        <section>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Mode</span>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <button
              onClick={() => setSharpMode(false)}
              className={`py-2 rounded text-[10px] transition-colors ${
                !sharpMode
                  ? 'bg-primary text-white'
                  : 'bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary'
              }`}
              title="Block-average: smooth color blending. Best for photos."
            >
              Photo
            </button>
            <button
              onClick={() => setSharpMode(true)}
              className={`py-2 rounded text-[10px] transition-colors ${
                sharpMode
                  ? 'bg-primary text-white'
                  : 'bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary'
              }`}
              title="Nearest-neighbor: crisp edges. Best for logos, vector art, pixel art."
            >
              Vector
            </button>
          </div>
        </section>
      )}

      {/* Quality */}
      {selectedFile && (
        <section>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Quality</span>
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => renderAtQuality(preset)}
                disabled={processing}
                className="py-2 rounded text-[10px] bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                title={`${preset.size * scaleMultiplier}px max dimension`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Density / @Nx multiplier */}
      {selectedFile && (
        <section>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Density</span>
            <span className="text-[10px] text-text-muted/60">retina / hi-DPI</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {SCALE_MULTIPLIERS.map((n) => (
              <button
                key={n}
                onClick={() => setScaleMultiplier(n)}
                className={`py-2 rounded text-[10px] transition-colors ${
                  scaleMultiplier === n
                    ? 'bg-primary text-white'
                    : 'bg-background-overlay hover:bg-border text-text-secondary hover:text-text-primary'
                }`}
                title={`Multiply target resolution by ${n}×`}
              >
                @{n}x
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Render */}
      {selectedFile && (
        <section>
          <button
            onClick={() => processImage(grid.cols, grid.rows)}
            disabled={processing}
            className="w-full py-2.5 rounded text-xs font-medium bg-primary hover:bg-primary-dark text-white transition-colors disabled:opacity-50"
          >
            {processing ? 'Processing...' : `Render at ${grid.cols}×${grid.rows}`}
          </button>
        </section>
      )}

      {/* Stats */}
      {lastProcessTime !== null && (
        <div className="flex items-center justify-between text-[10px] text-text-muted px-1">
          <span>{lastProcessTime.toFixed(1)}ms</span>
          <span className={sharpMode ? 'text-primary' : wasmUsed ? 'text-accent-green' : ''}>
            {sharpMode ? 'SHARP' : wasmUsed ? 'WASM' : 'JS'}
          </span>
        </div>
      )}

      {/* Empty hint */}
      {!selectedFile && (
        <div className="text-center py-4 text-text-muted">
          <div className="text-xs">Upload an image</div>
          <div className="text-[10px] mt-1 opacity-60">
            {imageWorker.wasmReady ? 'WASM ready' : 'Loading...'}
          </div>
        </div>
      )}
    </div>
  );
}
