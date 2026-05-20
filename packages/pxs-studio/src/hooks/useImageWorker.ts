'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ImageProcessResult } from '../workers/image.worker';

export function useImageWorker() {
  const [isReady, setIsReady] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize worker
    const worker = new Worker(new URL('../workers/image.worker.ts', import.meta.url));
    workerRef.current = worker;

    // Handle WASM initialization response
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'wasmInitialized') {
        setWasmReady(e.data.success);
        console.log(e.data.success 
          ? '✅ WASM ImageProcessor ready' 
          : '⚠️ WASM not available, using JS fallback'
        );
      }
    };

    worker.addEventListener('message', handleMessage);

    // Request WASM initialization
    worker.postMessage({ type: 'initWasm' });
    setIsReady(true);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      setIsReady(false);
      setWasmReady(false);
    };
  }, []);

  const processImage = useCallback(
    (
      file: File,
      targetCols: number,
      targetRows: number,
      useWasm: boolean = true,
      sharp: boolean = false
    ): Promise<ImageProcessResult> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const handleMessage = (e: MessageEvent) => {
          if (e.data.type === 'imageProcessed') {
            resolve({
              cols: e.data.cols,
              rows: e.data.rows,
              cells: e.data.cells,
              processTime: e.data.processTime,
              wasmUsed: e.data.wasmUsed,
            });
            workerRef.current?.removeEventListener('message', handleMessage);
          } else if (e.data.type === 'error') {
            reject(new Error(e.data.message));
            workerRef.current?.removeEventListener('message', handleMessage);
          }
        };

        workerRef.current.addEventListener('message', handleMessage);
        workerRef.current.postMessage({
          type: 'processImage',
          file,
          targetCols,
          targetRows,
          useWasm,
          sharp,
        });
      });
    },
    []
  );

  const initWasm = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        resolve(false);
        return;
      }

      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'wasmInitialized') {
          setWasmReady(e.data.success);
          resolve(e.data.success);
          workerRef.current?.removeEventListener('message', handleMessage);
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ type: 'initWasm' });
    });
  }, []);

  return {
    isReady,
    wasmReady,
    processImage,
    initWasm,
  };
}
