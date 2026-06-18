import { encodePng } from './png-encode';
import type { PXSFrame } from '../store/pxs-store';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

/**
 * Rasterize a PXSFrame to a base64 PNG so the model can SEE its own work via
 * vision. Each cell is scaled to a chunky block (~targetPx on the long edge) so
 * the render reads like a human looking at the piece, not a sub-pixel smear.
 */
export function frameToPngBase64(frame: PXSFrame, targetPx = 512): string {
  const scale = Math.max(6, Math.floor(targetPx / Math.max(frame.cols, frame.rows)));
  const width = frame.cols * scale;
  const height = frame.rows * scale;
  const rgb = new Uint8Array(width * height * 3);

  for (const cell of frame.cells) {
    const [r, g, b] = hexToRgb(cell.color);
    for (let dy = 0; dy < scale; dy++) {
      const py = cell.y * scale + dy;
      for (let dx = 0; dx < scale; dx++) {
        const px = cell.x * scale + dx;
        const idx = (py * width + px) * 3;
        rgb[idx] = r;
        rgb[idx + 1] = g;
        rgb[idx + 2] = b;
      }
    }
  }
  return encodePng(width, height, rgb).toString('base64');
}
