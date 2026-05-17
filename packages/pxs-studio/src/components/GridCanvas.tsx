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
  canvas: HTMLCanvasElement | null;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number) => void;
  fit: () => void;
  resetView: () => void;
  exportPNG: (scale?: number) => void;
  getZoom: () => number;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 32;
const ZOOM_STEP = 1.2;

const GridCanvas = forwardRef<GridCanvasHandle, GridCanvasProps>(
  ({ gridData, onCellClick, onCellDoubleClick }, externalRef) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const { grid } = usePXSStore();
    const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
    const cellDimensionsRef = useRef<{ cellWidth: number; cellHeight: number }>({ cellWidth: 10, cellHeight: 10 });
    const baseSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

    // View transform: zoom + pan offset (pan in CSS px, relative to viewport center)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    // Drag-to-pan state
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const spaceDownRef = useRef(false);
    const [cursor, setCursor] = useState<'crosshair' | 'grab' | 'grabbing'>('crosshair');
    const didPanRef = useRef(false);

    // Compute fit-to-container cell size (drives canvas pixel resolution)
    const computeBaseSize = useCallback(() => {
      if (!containerRef.current || !gridData) {
        return { cellSize: 10, width: 800, height: 600 };
      }
      const container = containerRef.current;
      const padding = 40;
      const maxWidth = container.clientWidth - padding;
      const maxHeight = container.clientHeight - padding;
      const cellWidthFit = maxWidth / gridData.cols;
      const cellHeightFit = maxHeight / gridData.rows;
      const cellSize = Math.max(1, Math.floor(Math.min(cellWidthFit, cellHeightFit)));
      const width = gridData.cols * cellSize;
      const height = gridData.rows * cellSize;
      cellDimensionsRef.current = { cellWidth: cellSize, cellHeight: cellSize };
      baseSizeRef.current = { width, height };
      return { cellSize, width, height };
    }, [gridData]);

    // Map a client (mouse) point to a grid cell, accounting for CSS transform
    const getCellFromPoint = useCallback((clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !gridData) return null;

      const rect = canvas.getBoundingClientRect();
      // rect already reflects the applied CSS transform (scale + translate)
      const localX = ((clientX - rect.left) / rect.width) * gridData.cols;
      const localY = ((clientY - rect.top) / rect.height) * gridData.rows;
      const cellX = Math.floor(localX);
      const cellY = Math.floor(localY);

      if (cellX >= 0 && cellX < gridData.cols && cellY >= 0 && cellY < gridData.rows) {
        return { x: cellX, y: cellY };
      }
      return null;
    }, [gridData]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (didPanRef.current) {
        didPanRef.current = false;
        return;
      }
      const coords = getCellFromPoint(e.clientX, e.clientY);
      if (coords && onCellClick && gridData) {
        const cell = gridData.cells.find(c => c.x === coords.x && c.y === coords.y) || null;
        onCellClick(coords.x, coords.y, cell);
      }
    }, [getCellFromPoint, onCellClick, gridData]);

    const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCellFromPoint(e.clientX, e.clientY);
      if (coords && onCellDoubleClick && gridData) {
        const cell = gridData.cells.find(c => c.x === coords.x && c.y === coords.y) || null;
        onCellDoubleClick(coords.x, coords.y, cell);
      }
    }, [getCellFromPoint, onCellDoubleClick, gridData]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanningRef.current) return;
      const coords = getCellFromPoint(e.clientX, e.clientY);
      setHoveredCell(coords);
    }, [getCellFromPoint]);

    const handleMouseLeave = useCallback(() => {
      setHoveredCell(null);
    }, []);

    // Zoom around a focal point (in viewport-local coords)
    const zoomAt = useCallback((nextZoom: number, focalX: number, focalY: number) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      setZoom((prev) => {
        if (clamped === prev) return prev;
        // Keep the focal point stationary: pan' = focal - (focal - pan) * (clamped / prev)
        setPan((p) => ({
          x: focalX - (focalX - p.x) * (clamped / prev),
          y: focalY - (focalY - p.y) * (clamped / prev),
        }));
        return clamped;
      });
    }, []);

    // Wheel: pan by default, cmd/ctrl+wheel zooms, trackpad pinch (ctrlKey) zooms
    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const focalX = e.clientX - rect.left;
        const focalY = e.clientY - rect.top;

        if (e.ctrlKey || e.metaKey) {
          const factor = Math.exp(-e.deltaY * 0.01);
          setZoom((prev) => {
            const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor));
            if (next === prev) return prev;
            setPan((p) => ({
              x: focalX - (focalX - p.x) * (next / prev),
              y: focalY - (focalY - p.y) * (next / prev),
            }));
            return next;
          });
        } else {
          setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
      };

      viewport.addEventListener('wheel', onWheel, { passive: false });
      return () => viewport.removeEventListener('wheel', onWheel);
    }, []);

    // Space-bar tracking for hand-tool panning
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        if (e.code === 'Space' && !spaceDownRef.current) {
          spaceDownRef.current = true;
          setCursor('grab');
          e.preventDefault();
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          spaceDownRef.current = false;
          if (!isPanningRef.current) setCursor('crosshair');
        }
      };
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };
    }, []);

    // Pointer-based pan (middle-button or space+drag)
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      const shouldPan = e.button === 1 || (e.button === 0 && spaceDownRef.current);
      if (!shouldPan) return;
      e.preventDefault();
      isPanningRef.current = true;
      didPanRef.current = false;
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      setCursor('grabbing');
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, [pan.x, pan.y]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) didPanRef.current = true;
      setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
    }, []);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      setCursor(spaceDownRef.current ? 'grab' : 'crosshair');
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }, []);

    // Imperative API exposed to parent for the toolbar
    useImperativeHandle(externalRef, () => ({
      canvas: canvasRef.current,
      getZoom: () => zoom,
      zoomIn: () => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const r = viewport.getBoundingClientRect();
        zoomAt(zoom * ZOOM_STEP, r.width / 2, r.height / 2);
      },
      zoomOut: () => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const r = viewport.getBoundingClientRect();
        zoomAt(zoom / ZOOM_STEP, r.width / 2, r.height / 2);
      },
      zoomTo: (z: number) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const r = viewport.getBoundingClientRect();
        zoomAt(z, r.width / 2, r.height / 2);
      },
      fit: () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      },
      resetView: () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      },
      exportPNG: (scale = 1) => {
        if (!gridData) return;
        const { cols, rows, cells } = gridData;
        const pixelScale = Math.max(1, Math.floor(scale));
        const out = document.createElement('canvas');
        out.width = cols * pixelScale;
        out.height = rows * pixelScale;
        const ctx = out.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        for (const cell of cells) {
          ctx.fillStyle = cell.color;
          ctx.fillRect(cell.x * pixelScale, cell.y * pixelScale, pixelScale, pixelScale);
        }
        out.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pixcel-${cols}x${rows}-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 'image/png');
      },
    }), [zoom, zoomAt, gridData]);

    // Main rendering function
    const renderGrid = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !gridData || !gridData.cells.length) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const { cellSize, width, height } = computeBaseSize();
      const cellWidth = cellSize;
      const cellHeight = cellSize;
      const devicePixelRatio = window.devicePixelRatio || 1;
      const showBorders = grid.bordersVisible && cellWidth >= 3;

      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, width, height);

      const cells = gridData.cells;
      const cellCount = cells.length;

      if (cellCount > 50000) {
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        for (const cell of cells) {
          const color = parseColor(cell.color);
          const startX = Math.floor(cell.x * cellWidth);
          const startY = Math.floor(cell.y * cellHeight);
          const endX = Math.min(Math.floor((cell.x + 1) * cellWidth), width);
          const endY = Math.min(Math.floor((cell.y + 1) * cellHeight), height);
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
        for (const cell of cells) {
          const x0 = Math.floor(cell.x * cellWidth);
          const y0 = Math.floor(cell.y * cellHeight);
          const x1 = Math.floor((cell.x + 1) * cellWidth);
          const y1 = Math.floor((cell.y + 1) * cellHeight);
          ctx.fillStyle = cell.color;
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }

        if (showBorders) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 0.5;
          for (const cell of cells) {
            const x0 = Math.floor(cell.x * cellWidth);
            const y0 = Math.floor(cell.y * cellHeight);
            const x1 = Math.floor((cell.x + 1) * cellWidth);
            const y1 = Math.floor((cell.y + 1) * cellHeight);
            ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
          }
        }

        if (hoveredCell && cellWidth >= 3) {
          const x0 = Math.floor(hoveredCell.x * cellWidth);
          const y0 = Math.floor(hoveredCell.y * cellHeight);
          const x1 = Math.floor((hoveredCell.x + 1) * cellWidth);
          const y1 = Math.floor((hoveredCell.y + 1) * cellHeight);
          ctx.strokeStyle = 'rgba(88, 166, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
        }
      }
    }, [gridData, grid.bordersVisible, computeBaseSize, hoveredCell]);

    // Re-render on data/border/hover change and on container resize
    useEffect(() => {
      renderGrid();
    }, [renderGrid]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const ro = new ResizeObserver(() => renderGrid());
      ro.observe(container);
      return () => ro.disconnect();
    }, [renderGrid]);

    return (
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
      >
        <div
          ref={viewportRef}
          className="absolute inset-0 flex items-center justify-center"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ cursor, touchAction: 'none' }}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanningRef.current ? 'none' : 'transform 60ms linear',
              willChange: 'transform',
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="object-contain shadow-2xl"
              style={{
                imageRendering: 'pixelated',
                background: '#0d1117',
                borderRadius: '8px',
                cursor: 'inherit',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);

function parseColor(color: string): { r: number; g: number; b: number } {
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }
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
  return { r: 13, g: 17, b: 23 };
}

GridCanvas.displayName = 'GridCanvas';

export default GridCanvas;
