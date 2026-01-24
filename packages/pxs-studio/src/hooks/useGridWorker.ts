'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { GridData } from '../workers/grid.worker';

interface GridWorkerOptions {
  startColor?: string;
  endColor?: string;
  color1?: string;
  color2?: string;
  time?: number;
  seed?: number;
  baseHue?: number;
}

export function useGridWorker() {
  const [isReady, setIsReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize worker
    const worker = new Worker(new URL('../workers/grid.worker.ts', import.meta.url));
    workerRef.current = worker;
    setIsReady(true);

    return () => {
      worker.terminate();
      setIsReady(false);
    };
  }, []);

  const sendCommand = useCallback(
    (type: string, cols: number, rows: number, options: GridWorkerOptions = {}): Promise<GridData> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const startTime = performance.now();

        const handleMessage = (e: MessageEvent) => {
          if (e.data.type === 'gridCreated') {
            const endTime = performance.now();
            const creationTime = endTime - startTime;

            resolve({
              cols: e.data.cols,
              rows: e.data.rows,
              cells: e.data.cells,
              totalCells: e.data.totalCells,
              creationTime,
            });

            workerRef.current?.removeEventListener('message', handleMessage);
          } else if (e.data.type === 'error') {
            reject(new Error(e.data.message));
            workerRef.current?.removeEventListener('message', handleMessage);
          }
        };

        workerRef.current.addEventListener('message', handleMessage);
        workerRef.current.postMessage({
          type,
          cols,
          rows,
          ...options,
        });
      });
    },
    []
  );

  const createGrid = useCallback(
    (cols: number, rows: number, fillColor?: string): Promise<GridData> => {
      return sendCommand('createGrid', cols, rows, { startColor: fillColor });
    },
    [sendCommand]
  );

  // Pattern methods
  const horizontalGradient = useCallback(
    (cols: number, rows: number, startColor?: string, endColor?: string): Promise<GridData> => {
      return sendCommand('horizontalGradient', cols, rows, { startColor, endColor });
    },
    [sendCommand]
  );

  const verticalGradient = useCallback(
    (cols: number, rows: number, startColor?: string, endColor?: string): Promise<GridData> => {
      return sendCommand('verticalGradient', cols, rows, { startColor, endColor });
    },
    [sendCommand]
  );

  const diagonalGradient = useCallback(
    (cols: number, rows: number, startColor?: string, endColor?: string): Promise<GridData> => {
      return sendCommand('diagonalGradient', cols, rows, { startColor, endColor });
    },
    [sendCommand]
  );

  const radialGradient = useCallback(
    (cols: number, rows: number, centerColor?: string, edgeColor?: string): Promise<GridData> => {
      return sendCommand('radialGradient', cols, rows, { startColor: centerColor, endColor: edgeColor });
    },
    [sendCommand]
  );

  const checkerboard = useCallback(
    (cols: number, rows: number, color1?: string, color2?: string): Promise<GridData> => {
      return sendCommand('checkerboard', cols, rows, { color1, color2 });
    },
    [sendCommand]
  );

  // Animation frame methods
  const diagonalPulse = useCallback(
    (cols: number, rows: number, time: number, baseHue?: number): Promise<GridData> => {
      return sendCommand('diagonalPulse', cols, rows, { time, baseHue });
    },
    [sendCommand]
  );

  const wave = useCallback(
    (cols: number, rows: number, time: number, baseHue?: number): Promise<GridData> => {
      return sendCommand('wave', cols, rows, { time, baseHue });
    },
    [sendCommand]
  );

  const spiral = useCallback(
    (cols: number, rows: number, time: number, baseHue?: number): Promise<GridData> => {
      return sendCommand('spiral', cols, rows, { time, baseHue });
    },
    [sendCommand]
  );

  const randomBurst = useCallback(
    (cols: number, rows: number, seed?: number): Promise<GridData> => {
      return sendCommand('randomBurst', cols, rows, { seed });
    },
    [sendCommand]
  );

  return {
    isReady,
    createGrid,
    // Patterns
    horizontalGradient,
    verticalGradient,
    diagonalGradient,
    radialGradient,
    checkerboard,
    // Animations
    diagonalPulse,
    wave,
    spiral,
    randomBurst,
  };
}
