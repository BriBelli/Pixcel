'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { PXSCell } from '../store/pxs-store';

export interface RenderConfig {
  cellWidth: number;
  cellHeight: number;
  showBorders: boolean;
  backgroundColor: string;
  devicePixelRatio: number;
}

// Track which canvases have been transferred (survives React strict mode remounts)
const transferredCanvases = new WeakSet<HTMLCanvasElement>();

export function useRenderWorker(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [isReady, setIsReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Prevent double initialization in React strict mode
    if (initializingRef.current) return;
    initializingRef.current = true;

    // Check if this canvas has already been transferred
    if (transferredCanvases.has(canvas)) {
      console.warn('Canvas already transferred to OffscreenCanvas. This may happen in React strict mode.');
      // Still create the worker but don't transfer canvas
      setIsReady(false);
      return;
    }

    // Create worker
    const worker = new Worker(new URL('../workers/render.worker.ts', import.meta.url));
    workerRef.current = worker;

    // Transfer canvas control to worker
    try {
      const offscreen = canvas.transferControlToOffscreen();
      transferredCanvases.add(canvas);

      worker.postMessage(
        {
          type: 'init',
          canvas: offscreen,
        },
        [offscreen]
      );

      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          setIsReady(true);
        }
      };

      worker.addEventListener('message', handleMessage);

      return () => {
        worker.removeEventListener('message', handleMessage);
        worker.terminate();
        setIsReady(false);
        initializingRef.current = false;
      };
    } catch (error) {
      console.warn('Canvas transfer failed (may be React strict mode):', error);
      initializingRef.current = false;
    }
  }, [canvasRef]);

  const render = useCallback(
    (cells: PXSCell[], config: RenderConfig): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !isReady) {
          // Silently resolve if worker not ready (may happen during initialization)
          resolve();
          return;
        }

        const handleMessage = (e: MessageEvent) => {
          if (e.data.type === 'rendered') {
            resolve();
            workerRef.current?.removeEventListener('message', handleMessage);
          } else if (e.data.type === 'error') {
            reject(new Error(e.data.message));
            workerRef.current?.removeEventListener('message', handleMessage);
          }
        };

        workerRef.current.addEventListener('message', handleMessage);
        workerRef.current.postMessage({
          type: 'render',
          cells,
          config,
        });
      });
    },
    [isReady]
  );

  return {
    isReady,
    render,
  };
}
