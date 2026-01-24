// Render Worker - Renders grid using OffscreenCanvas off the main thread
// This prevents UI freezes during rendering

export interface PXSCell {
  x: number;
  y: number;
  color: string;
  opacity?: number;
}

export interface RenderConfig {
  cellWidth: number;
  cellHeight: number;
  showBorders: boolean;
  backgroundColor: string;
  devicePixelRatio: number;
}

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

self.addEventListener('message', (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'init') {
    try {
      canvas = e.data.canvas;
      ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
      });

      if (!ctx) {
        throw new Error('Failed to get 2D context');
      }

      self.postMessage({ type: 'ready' });
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to initialize',
      });
    }
  } else if (type === 'render') {
    try {
      if (!canvas || !ctx) {
        throw new Error('Canvas not initialized');
      }

      const { cells, config } = e.data as {
        cells: PXSCell[];
        config: RenderConfig;
      };

      // Calculate dimensions
      const cols = Math.max(...cells.map((c) => c.x)) + 1;
      const rows = Math.max(...cells.map((c) => c.y)) + 1;
      const width = cols * config.cellWidth;
      const height = rows * config.cellHeight;

      // Set canvas size
      canvas.width = width * config.devicePixelRatio;
      canvas.height = height * config.devicePixelRatio;
      ctx.scale(config.devicePixelRatio, config.devicePixelRatio);

      // Clear canvas
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Render cells
      for (const cell of cells) {
        const x = cell.x * config.cellWidth;
        const y = cell.y * config.cellHeight;

        // Fill cell
        ctx.globalAlpha = cell.opacity ?? 1;
        ctx.fillStyle = cell.color;
        ctx.fillRect(x, y, config.cellWidth, config.cellHeight);

        // Draw border if enabled
        if (config.showBorders) {
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = '#30363d';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, config.cellWidth, config.cellHeight);
        }
      }

      ctx.globalAlpha = 1;

      self.postMessage({ type: 'rendered' });
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Render failed',
      });
    }
  }
});

export {};
