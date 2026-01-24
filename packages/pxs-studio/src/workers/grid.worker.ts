// Grid Worker - Creates cell data off the main thread
// This prevents UI freezes when generating large grids

export interface PXSCell {
  x: number;
  y: number;
  color: string;
  opacity?: number;
}

export interface GridData {
  cols: number;
  rows: number;
  cells: PXSCell[];
  totalCells: number;
  creationTime: number;
}

// Color utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToString(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToString(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t));
}

// Pattern generators
function createHorizontalGradient(cols: number, rows: number, startColor: string, endColor: string): PXSCell[] {
  const cells: PXSCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = x / (cols - 1);
      cells.push({ x, y, color: lerpColor(startColor, endColor, t), opacity: 1 });
    }
  }
  return cells;
}

function createVerticalGradient(cols: number, rows: number, startColor: string, endColor: string): PXSCell[] {
  const cells: PXSCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = y / (rows - 1);
      cells.push({ x, y, color: lerpColor(startColor, endColor, t), opacity: 1 });
    }
  }
  return cells;
}

function createDiagonalGradient(cols: number, rows: number, startColor: string, endColor: string): PXSCell[] {
  const cells: PXSCell[] = [];
  const maxDist = cols + rows - 2;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = (x + y) / maxDist;
      cells.push({ x, y, color: lerpColor(startColor, endColor, t), opacity: 1 });
    }
  }
  return cells;
}

function createRadialGradient(cols: number, rows: number, centerColor: string, edgeColor: string): PXSCell[] {
  const cells: PXSCell[] = [];
  const centerX = (cols - 1) / 2;
  const centerY = (rows - 1) / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = Math.min(dist / maxDist, 1);
      cells.push({ x, y, color: lerpColor(centerColor, edgeColor, t), opacity: 1 });
    }
  }
  return cells;
}

function createCheckerboard(cols: number, rows: number, color1: string, color2: string): PXSCell[] {
  const cells: PXSCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const isEven = (x + y) % 2 === 0;
      cells.push({ x, y, color: isEven ? color1 : color2, opacity: 1 });
    }
  }
  return cells;
}

// Animation frame generators
function createDiagonalPulseFrame(cols: number, rows: number, time: number, baseHue: number = 0.6): PXSCell[] {
  const cells: PXSCell[] = [];
  const maxDist = cols + rows;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dist = x + y;
      const wave = Math.sin((dist / maxDist) * Math.PI * 4 + time * 3);
      const hue = (baseHue + wave * 0.1) % 1;
      const lightness = 0.4 + wave * 0.2;
      const { r, g, b } = hslToRgb(hue, 0.8, lightness);
      cells.push({ x, y, color: rgbToString(r, g, b), opacity: 1 });
    }
  }
  return cells;
}

function createWaveFrame(cols: number, rows: number, time: number, baseHue: number = 0.55): PXSCell[] {
  const cells: PXSCell[] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const wave1 = Math.sin(x * 0.2 + time * 2);
      const wave2 = Math.sin(y * 0.15 + time * 1.5);
      const combined = (wave1 + wave2) / 2;
      const hue = (baseHue + combined * 0.15) % 1;
      const lightness = 0.35 + combined * 0.25;
      const { r, g, b } = hslToRgb(hue, 0.75, lightness);
      cells.push({ x, y, color: rgbToString(r, g, b), opacity: 1 });
    }
  }
  return cells;
}

function createSpiralFrame(cols: number, rows: number, time: number, baseHue: number = 0.8): PXSCell[] {
  const cells: PXSCell[] = [];
  const centerX = cols / 2;
  const centerY = rows / 2;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const spiral = Math.sin(dist * 0.3 - angle * 2 + time * 2);
      const hue = (baseHue + spiral * 0.15 + dist * 0.01) % 1;
      const lightness = 0.3 + spiral * 0.3;
      const { r, g, b } = hslToRgb(Math.abs(hue), 0.85, Math.max(0.1, lightness));
      cells.push({ x, y, color: rgbToString(r, g, b), opacity: 1 });
    }
  }
  return cells;
}

function createRandomBurstFrame(cols: number, rows: number, seed: number): PXSCell[] {
  const cells: PXSCell[] = [];
  // Simple seeded random for consistency
  const random = (x: number, y: number) => {
    const n = Math.sin(seed * 12.9898 + x * 78.233 + y * 37.719) * 43758.5453;
    return n - Math.floor(n);
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const hue = random(x, y);
      const saturation = 0.6 + random(x + 100, y) * 0.4;
      const lightness = 0.3 + random(x, y + 100) * 0.4;
      const { r, g, b } = hslToRgb(hue, saturation, lightness);
      cells.push({ x, y, color: rgbToString(r, g, b), opacity: 1 });
    }
  }
  return cells;
}

// Message handler
self.addEventListener('message', (e: MessageEvent) => {
  const { type, cols, rows, fillColor, startColor, endColor, color1, color2, time, seed, baseHue } = e.data;

  try {
    const startTime = performance.now();
    let cells: PXSCell[] = [];

    switch (type) {
      case 'createGrid':
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            cells.push({
              x,
              y,
              color: fillColor || '#0d1117',
              opacity: 1,
            });
          }
        }
        break;

      case 'horizontalGradient':
        cells = createHorizontalGradient(cols, rows, startColor || '#58a6ff', endColor || '#bc8cff');
        break;

      case 'verticalGradient':
        cells = createVerticalGradient(cols, rows, startColor || '#58a6ff', endColor || '#bc8cff');
        break;

      case 'diagonalGradient':
        cells = createDiagonalGradient(cols, rows, startColor || '#58a6ff', endColor || '#bc8cff');
        break;

      case 'radialGradient':
        cells = createRadialGradient(cols, rows, startColor || '#58a6ff', endColor || '#0d1117');
        break;

      case 'checkerboard':
        cells = createCheckerboard(cols, rows, color1 || '#1a1f2e', color2 || '#2d3548');
        break;

      case 'diagonalPulse':
        cells = createDiagonalPulseFrame(cols, rows, time || 0, baseHue || 0.6);
        break;

      case 'wave':
        cells = createWaveFrame(cols, rows, time || 0, baseHue || 0.55);
        break;

      case 'spiral':
        cells = createSpiralFrame(cols, rows, time || 0, baseHue || 0.8);
        break;

      case 'randomBurst':
        cells = createRandomBurstFrame(cols, rows, seed || Math.random() * 10000);
        break;

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    const endTime = performance.now();
    const creationTime = endTime - startTime;

    self.postMessage({
      type: 'gridCreated',
      cols,
      rows,
      cells,
      totalCells: cells.length,
      creationTime,
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export {};
