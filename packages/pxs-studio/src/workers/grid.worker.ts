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
  return `rgb(${Math.round(Math.max(0, Math.min(255, r)))}, ${Math.round(Math.max(0, Math.min(255, g)))}, ${Math.round(Math.max(0, Math.min(255, b)))})`;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  // Normalize h to 0-1 range
  h = ((h % 1) + 1) % 1;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  
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
      const t = cols > 1 ? x / (cols - 1) : 0;
      cells.push({ x, y, color: lerpColor(startColor, endColor, t), opacity: 1 });
    }
  }
  return cells;
}

function createVerticalGradient(cols: number, rows: number, startColor: string, endColor: string): PXSCell[] {
  const cells: PXSCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = rows > 1 ? y / (rows - 1) : 0;
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
      const t = maxDist > 0 ? (x + y) / maxDist : 0;
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
      const t = maxDist > 0 ? Math.min(dist / maxDist, 1) : 0;
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

function createNoise(cols: number, rows: number): PXSCell[] {
  const cells: PXSCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const hue = Math.random();
      const { r, g, b } = hslToRgb(hue, 0.7, 0.5);
      cells.push({ x, y, color: rgbToString(r, g, b), opacity: 1 });
    }
  }
  return cells;
}

// ============================================
// IMPRESSIVE LIVE EFFECTS
// ============================================

// Spiral Glow - Hypnotic spiral with color cycling
function createSpiralFrame(cols: number, rows: number, time: number, baseHue: number = 0.8): PXSCell[] {
  const cells: PXSCell[] = [];
  const centerX = cols / 2;
  const centerY = rows / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      // Multiple spiral arms with varying speeds
      const spiral1 = Math.sin(dist * 0.25 - angle * 3 + time * 2.5);
      const spiral2 = Math.sin(dist * 0.15 + angle * 2 - time * 1.5);
      const combined = (spiral1 + spiral2) * 0.5;
      
      // Color based on spiral and distance
      const hue = (baseHue + combined * 0.2 + dist / maxDist * 0.3 + time * 0.1) % 1;
      const saturation = 0.8 + combined * 0.2;
      const lightness = 0.35 + combined * 0.25 + Math.sin(dist * 0.1 - time) * 0.1;
      
      const { r, g, b } = hslToRgb(hue, saturation, lightness);
      cells.push({ x, y, color: rgbToString(r, g, b), opacity: 1 });
    }
  }
  return cells;
}

// Radial Pulse - Rings emanating from center with glow
function createRadialPulseFrame(cols: number, rows: number, time: number): PXSCell[] {
  const cells: PXSCell[] = [];
  const centerX = cols / 2;
  const centerY = rows / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normDist = dist / maxDist;
      
      // Multiple ring pulses at different speeds
      const ring1 = Math.sin(dist * 0.4 - time * 4) * 0.5 + 0.5;
      const ring2 = Math.sin(dist * 0.25 - time * 2.5 + Math.PI) * 0.3 + 0.3;
      const ring3 = Math.sin(dist * 0.15 - time * 1.5) * 0.2 + 0.2;
      
      const pulse = ring1 + ring2 + ring3;
      
      // Vibrant color scheme - cyan to magenta
      const hue = 0.5 + pulse * 0.15 + normDist * 0.1;
      const saturation = 0.9;
      const lightness = 0.2 + pulse * 0.4;
      
      const { r, g, b } = hslToRgb(hue, saturation, lightness);
      cells.push({ x, y, color: rgbToString(r, g, b), opacity: 1 });
    }
  }
  return cells;
}

// Plasma - Classic demoscene plasma effect
function createPlasmaFrame(cols: number, rows: number, time: number): PXSCell[] {
  const cells: PXSCell[] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Classic plasma formula with multiple sine waves
      const v1 = Math.sin(x * 0.1 + time);
      const v2 = Math.sin((y * 0.1 + time) * 0.5);
      const v3 = Math.sin((x * 0.1 + y * 0.1 + time) * 0.5);
      
      const cx = x + 0.5 * cols * Math.sin(time * 0.5);
      const cy = y + 0.5 * rows * Math.cos(time * 0.3);
      const v4 = Math.sin(Math.sqrt((cx * cx + cy * cy) * 0.01) + time);
      
      const v = (v1 + v2 + v3 + v4) * 0.25;
      
      // Rich color palette
      const r = Math.sin(v * Math.PI) * 127 + 128;
      const g = Math.sin(v * Math.PI + 2.094) * 127 + 128;
      const b = Math.sin(v * Math.PI + 4.188) * 127 + 128;
      
      cells.push({ x, y, color: rgbToString(r, g, b), opacity: 1 });
    }
  }
  return cells;
}

// Pixel Burst - Explosive particle-like effect
function createPixelBurstFrame(cols: number, rows: number, time: number): PXSCell[] {
  const cells: PXSCell[] = [];
  const centerX = cols / 2;
  const centerY = rows / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  
  // Multiple burst origins that move
  const bursts = [
    { x: centerX, y: centerY, phase: 0 },
    { x: centerX + Math.sin(time) * cols * 0.3, y: centerY + Math.cos(time) * rows * 0.3, phase: 1 },
    { x: centerX + Math.sin(time * 0.7 + 2) * cols * 0.25, y: centerY + Math.cos(time * 0.7 + 2) * rows * 0.25, phase: 2 },
  ];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let totalIntensity = 0;
      let dominantHue = 0;
      
      for (const burst of bursts) {
        const dx = x - burst.x;
        const dy = y - burst.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Expanding ring effect
        const ringRadius = (time * 20 + burst.phase * 10) % (maxDist * 1.5);
        const ringWidth = 3 + Math.sin(time * 2 + burst.phase) * 2;
        const distToRing = Math.abs(dist - ringRadius);
        
        if (distToRing < ringWidth) {
          const intensity = 1 - (distToRing / ringWidth);
          totalIntensity += intensity * 0.5;
          dominantHue = (burst.phase * 0.33 + time * 0.1) % 1;
        }
        
        // Inner glow
        const innerGlow = Math.max(0, 1 - dist / (maxDist * 0.3));
        totalIntensity += innerGlow * 0.3;
      }
      
      totalIntensity = Math.min(1, totalIntensity);
      
      // High contrast colors
      const hue = (dominantHue + totalIntensity * 0.2) % 1;
      const saturation = 0.9;
      const lightness = 0.1 + totalIntensity * 0.6;
      
      const { r, g, b } = hslToRgb(hue, saturation, lightness);
      cells.push({ x, y, color: rgbToString(r, g, b), opacity: 1 });
    }
  }
  return cells;
}

// Legacy effects for backward compatibility
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

function createRandomBurstFrame(cols: number, rows: number, seed: number): PXSCell[] {
  const cells: PXSCell[] = [];
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

      case 'noise':
        cells = createNoise(cols, rows);
        break;

      // New impressive effects
      case 'spiral':
        cells = createSpiralFrame(cols, rows, time || 0, baseHue || 0.8);
        break;

      case 'radialPulse':
        cells = createRadialPulseFrame(cols, rows, time || 0);
        break;

      case 'plasma':
        cells = createPlasmaFrame(cols, rows, time || 0);
        break;

      case 'pixelBurst':
        cells = createPixelBurstFrame(cols, rows, time || 0);
        break;

      // Legacy effects
      case 'diagonalPulse':
        cells = createDiagonalPulseFrame(cols, rows, time || 0, baseHue || 0.6);
        break;

      case 'wave':
        cells = createWaveFrame(cols, rows, time || 0, baseHue || 0.55);
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
