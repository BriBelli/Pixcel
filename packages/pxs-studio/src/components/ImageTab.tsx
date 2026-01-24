'use client';

import { useState, useRef } from 'react';
import { useImageWorker } from '../hooks/useImageWorker';
import { usePXSStore } from '../store/pxs-store';

const QUALITY_PRESETS = [
  { name: 'Retro', size: 32, label: '~32px' },
  { name: 'Low', size: 48, label: '~48px' },
  { name: 'Medium', size: 64, label: '~64px' },
  { name: 'High', size: 128, label: '~128px' },
  { name: 'HD', size: 192, label: '~192px' },
  { name: 'Ultra', size: 256, label: '~256px' },
];

interface ImageTabProps {
  onGridUpdate: (data: any) => void;
}

export default function ImageTab({ onGridUpdate }: ImageTabProps) {
  const { grid } = usePXSStore();
  const imageWorker = useImageWorker();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastProcessTime, setLastProcessTime] = useState<number | null>(null);
  const [wasmUsed, setWasmUsed] = useState(false);
  
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
      // Process image in worker
      const result = await imageWorker.processImage(selectedFile, targetCols, targetRows, true);
      
      console.log(`✅ Image processed in ${result.processTime.toFixed(2)}ms (WASM: ${result.wasmUsed})`);
      setLastProcessTime(result.processTime);
      setWasmUsed(result.wasmUsed);
      
      // Update grid
      onGridUpdate({
        cols: result.cols,
        rows: result.rows,
        cells: result.cells,
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
    if (!selectedFile) return;

    // Calculate dimensions based on quality, preserving aspect ratio
    const img = new Image();
    img.src = previewUrl!;
    await new Promise((resolve) => { img.onload = resolve; });

    const aspectRatio = img.width / img.height;
    let cols, rows;

    if (aspectRatio > 1) {
      cols = quality.size;
      rows = Math.round(cols / aspectRatio);
    } else {
      rows = quality.size;
      cols = Math.round(rows * aspectRatio);
    }

    await processImage(cols, rows);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Image Upload */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-text-primary">📤 Load Image</h3>
        
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="text-4xl mb-2">📷</div>
          <div className="text-sm text-text-muted">
            Click to upload or drag & drop
          </div>
          <div className="text-xs text-text-muted mt-1">
            JPG, PNG, GIF supported
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="mt-4 relative rounded-lg overflow-hidden border border-border">
            <img src={previewUrl} alt="Preview" className="w-full h-auto" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                setPreviewUrl(null);
                setLastProcessTime(null);
              }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-accent-red text-white hover:bg-accent-red/80 transition-colors flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* Quality Presets */}
      {selectedFile && (
        <section>
          <h3 className="text-sm font-semibold mb-3 text-text-primary">🎨 Render Quality</h3>
          <div className="grid grid-cols-2 gap-2">
            {QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => renderAtQuality(preset)}
                disabled={processing}
                className="px-4 py-3 rounded-lg bg-background-overlay hover:bg-border text-sm text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold">{preset.name}</div>
                <div className="text-xs text-text-muted">{preset.label}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Render to Current Grid */}
      {selectedFile && (
        <section>
          <h3 className="text-sm font-semibold mb-3 text-text-primary">🎯 Render Options</h3>
          <button
            onClick={() => processImage(grid.cols, grid.rows)}
            disabled={processing}
            className="w-full px-4 py-3 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? '⏳ Processing...' : '🎨 Render (Uses Current Grid)'}
          </button>
          <p className="text-xs text-text-muted mt-2 text-center">
            Current: {grid.cols}×{grid.rows}
          </p>
        </section>
      )}

      {/* Processing Stats */}
      {lastProcessTime !== null && (
        <section>
          <div className="p-3 rounded-lg bg-accent-green/10 border border-accent-green/20">
            <div className="text-xs text-accent-green font-semibold mb-1">✅ Last Process</div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Time:</span>
              <span className="font-mono text-text-primary">{lastProcessTime.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-text-muted">WASM:</span>
              <span className={`font-mono ${wasmUsed ? 'text-accent-green' : 'text-text-muted'}`}>
                {wasmUsed ? '⚡ Active' : 'Fallback JS'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Info */}
      {!selectedFile && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="text-sm space-y-2">
            <p className="font-semibold text-primary">💡 Image Processing</p>
            <p className="text-text-secondary text-xs">
              Upload an image to convert it to pixel art using gamma-correct block averaging.
              {imageWorker.wasmReady && ' ⚡ WASM acceleration is active!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
