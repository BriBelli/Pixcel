'use client';

import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import type { GridData } from '../workers/grid.worker';
import type { PXSCell } from '../store/pxs-store';
import { usePXSStore } from '../store/pxs-store';

interface GridCanvasProps {
  gridData: GridData | null;
  onCellClick?: (x: number, y: number, cell: PXSCell | null) => void;
  onCellDoubleClick?: (x: number, y: number, cell: PXSCell | null) => void;
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
  ({ gridData, onCellClick, onCellDoubleClick }, externalRef) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { grid } = usePXSStore();
    const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
    const cellDimensionsRef = useRef<{ cellWidth: number; cellHeight: number }>({ cellWidth: 10, cellHeight: 10 });

    // Expose canvas ref externally
    useImperativeHandle(externalRef, () => canvasRef.current!, []);

    // Calculate cell dimensions to fill available space while maintaining aspect ratio
    const calculateCellSize = useCallback(() => {
      if (!containerRef.current || !gridData) return { cellWidth: 10, cellHeight: 10, canvasWidth: 800, canvasHeight: 600 };
      
      const container = containerRef.current;
      const padding = 40;
      const maxWidth = container.clientWidth - padding;
      const maxHeight = container.clientHeight - padding;
      
      // Calculate cell size to fit grid in available space
      const cellWidthFit = maxWidth / gridData.cols;
      const cellHeightFit = maxHeight / gridData.rows;
      
      // Use the smaller dimension to maintain aspect ratio
      const cellSize = Math.min(cellWidthFit, cellHeightFit);
      
      // Ensure minimum 1px per cell for visibility
      const finalCellSize = Math.max(1, cellSize);
      
      // Calculate actual canvas dimensions
      const canvasWidth = gridData.cols * finalCellSize;
      const canvasHeight = gridData.rows * finalCellSize;
      
      // Store for click handling
      cellDimensionsRef.current = { cellWidth: finalCellSize, cellHeight: finalCellSize };
      
      return { 
        cellWidth: finalCellSize, 
        cellHeight: finalCellSize,
        canvasWidth,
        canvasHeight,
      };
    }, [gridData]);

    // Convert canvas coordinates to cell coordinates
    const getCellFromPoint = useCallback((clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !gridData) return null;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const canvasX = (clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
      const canvasY = (clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);
      
      const { cellWidth, cellHeight } = cellDimensionsRef.current;
      
      const cellX = Math.floor(canvasX / cellWidth);
      const cellY = Math.floor(canvasY / cellHeight);
      
      if (cellX >= 0 && cellX < gridData.cols && cellY >= 0 && cellY < gridData.rows) {
        return { x: cellX, y: cellY };
      }
      return null;
    }, [gridData]);

    // Handle canvas click
    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCellFromPoint(e.clientX, e.clientY);
      if (coords && onCellClick && gridData) {
        const cell = gridData.cells.find(c => c.x === coords.x && c.y === coords.y) || null;
        onCellClick(coords.x, coords.y, cell);
      }
    }, [getCellFromPoint, onCellClick, gridData]);

    // Handle canvas double click
    const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCellFromPoint(e.clientX, e.clientY);
      if (coords && onCellDoubleClick && gridData) {
        const cell = gridData.cells.find(c => c.x === coords.x && c.y === coords.y) || null;
        onCellDoubleClick(coords.x, coords.y, cell);
      }
    }, [getCellFromPoint, onCellDoubleClick, gridData]);

    // Handle mouse move for hover effect
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCellFromPoint(e.clientX, e.clientY);
      setHoveredCell(coords);
    }, [getCellFromPoint]);

    const handleMouseLeave = useCallback(() => {
      setHoveredCell(null);
    }, []);

    // Main rendering function
    const renderGrid = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !gridData || !gridData.cells.length) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const { cellWidth, cellHeight, canvasWidth, canvasHeight } = calculateCellSize();
      const devicePixelRatio = window.devicePixelRatio || 1;
      const showBorders = grid.bordersVisible && cellWidth >= 3;

      const width = canvasWidth;
      const height = canvasHeight;

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
          const startX = Math.floor(cell.x * cellWidth);
          const startY = Math.floor(cell.y * cellHeight);
          const endX = Math.min(startX + Math.ceil(cellWidth), width);
          const endY = Math.min(startY + Math.ceil(cellHeight), height);

          // Fill the cell pixels
          for (let py = startY; py < endY; py++) {
            for (let px = startX; px < endX; px++) {
              const idx = (py * width + px) * 4;
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

        // Draw hover highlight
        if (hoveredCell && cellWidth >= 3) {
          const x = hoveredCell.x * cellWidth;
          const y = hoveredCell.y * cellHeight;
          ctx.strokeStyle = 'rgba(88, 166, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
        }
      }
    }, [gridData, grid.bordersVisible, calculateCellSize, hoveredCell]);

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
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="max-w-full max-h-full object-contain shadow-2xl cursor-crosshair"
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
