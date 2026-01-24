'use client';

import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { GridData } from '../workers/grid.worker';
import type { PXSCell } from '../store/pxs-store';
import { usePXSStore } from '../store/pxs-store';

interface GridCanvasProps {
  gridData: GridData | null;
}

export interface GridCanvasHandle {
  renderCells: (cells: PXSCell[], config: RenderConfig) => void;
}

interface RenderConfig {
  cellWidth: number;
  cellHeight: number;
  showBorders: boolean;
  backgroundColor: string;
  devicePixelRatio: number;
}

const GridCanvas = forwardRef<HTMLCanvasElement, GridCanvasProps>(
  ({ gridData }, externalRef) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { grid } = usePXSStore();

    // Expose canvas ref externally
    useImperativeHandle(externalRef, () => canvasRef.current!, []);

    // Calculate cell dimensions based on container size and cell count
    const calculateCellSize = useCallback(() => {
      if (!containerRef.current || !gridData) return { cellWidth: 10, cellHeight: 10 };
      
      const container = containerRef.current;
      const maxWidth = container.clientWidth - 40;
      const maxHeight = container.clientHeight - 40;
      
      const cellWidth = Math.floor(maxWidth / gridData.cols);
      const cellHeight = Math.floor(maxHeight / gridData.rows);
      
      // For large grids (>10K cells), use smaller cells (min 1px)
      // For medium grids, allow up to 10px
      // For small grids, allow up to 20px
      const totalCells = gridData.cols * gridData.rows;
      const maxCellSize = totalCells > 10000 ? 4 : totalCells > 2500 ? 10 : 20;
      const cellSize = Math.max(1, Math.min(cellWidth, cellHeight, maxCellSize));
      
      return { cellWidth: cellSize, cellHeight: cellSize };
    }, [gridData]);

    // Main rendering function - always use main thread Canvas 2D for reliability
    const renderGrid = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !gridData || !gridData.cells.length) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const { cellWidth, cellHeight } = calculateCellSize();
      const devicePixelRatio = window.devicePixelRatio || 1;
      const showBorders = grid.bordersVisible && cellWidth >= 4; // Only show borders if cells are big enough

      const width = gridData.cols * cellWidth;
      const height = gridData.rows * cellHeight;

      // Set canvas size with device pixel ratio for crisp rendering
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale context for high DPI
      ctx.scale(devicePixelRatio, devicePixelRatio);

      // Clear background
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, width, height);

      // Batch render for performance
      const cells = gridData.cells;
      const cellCount = cells.length;

      // For very large grids, use ImageData for fastest rendering
      if (cellCount > 50000) {
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (const cell of cells) {
          const color = parseColor(cell.color);
          const startX = cell.x * cellWidth;
          const startY = cell.y * cellHeight;

          // Fill the cell pixels
          for (let py = 0; py < cellHeight; py++) {
            for (let px = 0; px < cellWidth; px++) {
              const idx = ((startY + py) * width + (startX + px)) * 4;
              data[idx] = color.r;
              data[idx + 1] = color.g;
              data[idx + 2] = color.b;
              data[idx + 3] = 255;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
      } else {
        // For smaller grids, use fillRect (cleaner, supports borders)
        for (const cell of cells) {
          const x = cell.x * cellWidth;
          const y = cell.y * cellHeight;

          ctx.fillStyle = cell.color;
          ctx.fillRect(x, y, cellWidth, cellHeight);
        }

        // Draw borders if enabled
        if (showBorders) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 0.5;
          for (const cell of cells) {
            const x = cell.x * cellWidth;
            const y = cell.y * cellHeight;
            ctx.strokeRect(x, y, cellWidth, cellHeight);
          }
        }
      }
    }, [gridData, grid.bordersVisible, calculateCellSize]);

    // Render when gridData or borders change
    useEffect(() => {
      renderGrid();
    }, [renderGrid]);

    return (
      <div 
        ref={containerRef} 
        className="flex items-center justify-center w-full h-full p-5"
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain shadow-2xl"
          style={{
            imageRendering: 'pixelated',
            background: '#0d1117',
            borderRadius: '8px',
          }}
        />
      </div>
    );
  }
);

// Helper to parse CSS color strings
function parseColor(color: string): { r: number; g: number; b: number } {
  // Handle rgb(r, g, b) format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  // Handle #hex format
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  // Default fallback
  return { r: 13, g: 17, b: 23 };
}

GridCanvas.displayName = 'GridCanvas';

export default GridCanvas;
