import logoData from '../data/pixcel-logo-2.json';
import type { GridData, PXSCell } from '../workers/grid.worker';

export interface LogoConfig {
  name: string;
  version: string;
  description?: string;
  scale: number;
  padding: number;
  background: string;
  foreground: string;
  legend?: Record<string, string>;
  letters?: Record<string, string[] | string>;
  layout?: Record<string, unknown>;
  blocks: string[];
}

export const pixcelLogo: LogoConfig = logoData as unknown as LogoConfig;

/**
 * Expands a block-based logo design into a full PXS GridData payload.
 * Each '#' character in `blocks` becomes a (scale × scale) square of
 * foreground cells; everything else becomes background. `padding` adds
 * a border of background blocks around the whole design.
 */
export function buildLogoGridData(config: LogoConfig = pixcelLogo): GridData {
  const { scale, padding, background, foreground, blocks } = config;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { cols: 0, rows: 0, cells: [], totalCells: 0, creationTime: 0 };
  }

  const blockWidth = blocks[0].length;
  const blockHeight = blocks.length;

  const cols = (blockWidth + padding * 2) * scale;
  const rows = (blockHeight + padding * 2) * scale;
  const totalCells = cols * rows;

  const cells: PXSCell[] = new Array(totalCells);

  for (let y = 0; y < rows; y++) {
    const rowOffset = y * cols;
    for (let x = 0; x < cols; x++) {
      cells[rowOffset + x] = { x, y, color: background, opacity: 1 };
    }
  }

  for (let by = 0; by < blockHeight; by++) {
    const row = blocks[by];
    for (let bx = 0; bx < blockWidth && bx < row.length; bx++) {
      if (row[bx] !== '#') continue;

      const startX = (bx + padding) * scale;
      const startY = (by + padding) * scale;

      for (let dy = 0; dy < scale; dy++) {
        const y = startY + dy;
        const rowOffset = y * cols;
        for (let dx = 0; dx < scale; dx++) {
          const x = startX + dx;
          cells[rowOffset + x] = { x, y, color: foreground, opacity: 1 };
        }
      }
    }
  }

  return { cols, rows, cells, totalCells, creationTime: 0 };
}
