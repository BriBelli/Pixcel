import type { PXSFrame } from '../store/pxs-store';
import type { GridData } from '../workers/grid.worker';
import { usePXSStore } from '../store/pxs-store';
import historyManager from '../store/history-manager';

export function frameToGridData(frame: PXSFrame): GridData {
  return {
    cols: frame.cols,
    rows: frame.rows,
    cells: frame.cells,
    totalCells: frame.cells.length,
    creationTime: 0,
  };
}

/** Load a PXSFrame onto the canvas and sync Zustand + undo history. */
export function applyGalleryFrame(frame: PXSFrame, historyLabel: string): GridData {
  const gridData = frameToGridData(frame);

  const cellsMap = new Map<string, (typeof frame.cells)[0]>();
  frame.cells.forEach((cell) => {
    cellsMap.set(`${cell.x}-${cell.y}`, cell);
  });

  usePXSStore.setState((s) => ({
    grid: {
      ...s.grid,
      cols: frame.cols,
      rows: frame.rows,
      cells: cellsMap,
    },
    animation: {
      ...s.animation,
      frames: [],
      currentFrame: 0,
      playing: false,
    },
  }));

  historyManager.push('load', historyLabel, {
    cols: frame.cols,
    rows: frame.rows,
    cells: frame.cells,
  });

  return gridData;
}
