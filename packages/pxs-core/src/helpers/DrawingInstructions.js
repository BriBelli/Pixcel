/**
 * DrawingInstructions — Rasterizes compact drawing instructions into PXSFrame data.
 *
 * Instead of per-cell JSON (expensive for LLMs), the instruction format uses
 * a `layers` array of shape/fill/gradient operations that paint onto a grid.
 * Later layers overwrite earlier ones.
 *
 * @example
 *   const frame = DrawingInstructions.rasterize({
 *     cols: 64, rows: 64,
 *     layers: [
 *       { op: 'fill', color: '#1a1a2e' },
 *       { op: 'circle', cx: 32, cy: 32, r: 12, color: '#58a6ff' },
 *     ]
 *   });
 */

import { PatternHelpers } from './PatternHelpers.js';

class DrawingInstructions {

  /**
   * Rasterize drawing instructions into a PXSFrame.
   * @param {{ cols: number, rows: number, layers: Array<Object>, metadata?: Object }} instructions
   * @returns {{ cols: number, rows: number, cells: Array<{x:number,y:number,color:string,opacity?:number}>, metadata?: Object }}
   */
  static rasterize(instructions) {
    const { metadata } = instructions;
    const cols = Math.max(1, Math.floor(Number(instructions.cols)) || 32);
    const rows = Math.max(1, Math.floor(Number(instructions.rows)) || 32);
    const layers = instructions.layers;

    const grid = new Array(cols * rows);
    const bg = '#0d1117';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        grid[y * cols + x] = { x, y, color: bg };
      }
    }

    if (Array.isArray(layers)) {
      for (const layer of layers) {
        if (!layer || typeof layer !== 'object') continue;
        try {
          this._applyLayer(grid, cols, rows, layer);
        } catch (err) {
          console.warn('DrawingInstructions: layer failed, skipping', layer.op, err);
        }
      }
    }

    return { cols, rows, cells: grid, metadata };
  }

  /**
   * Check whether a frame-like object uses the drawing instruction format.
   * @param {Object} data
   * @returns {boolean}
   */
  static isInstructionFormat(data) {
    return (
      data != null &&
      typeof data === 'object' &&
      Array.isArray(data.layers) &&
      typeof data.cols === 'number' &&
      typeof data.rows === 'number'
    );
  }

  // ── Layer dispatch ──────────────────────────────────────────

  static _applyLayer(grid, cols, rows, layer) {
    const op = layer.op;
    switch (op) {
      case 'fill':      return this._opFill(grid, cols, rows, layer);
      case 'rect':      return this._opRect(grid, cols, rows, layer);
      case 'rrect':     return this._opRRect(grid, cols, rows, layer);
      case 'circle':    return this._opCircle(grid, cols, rows, layer);
      case 'ellipse':   return this._opEllipse(grid, cols, rows, layer);
      case 'line':      return this._opLine(grid, cols, rows, layer);
      case 'arc':       return this._opArc(grid, cols, rows, layer);
      case 'gradient':  return this._opGradient(grid, cols, rows, layer);
      case 'polygon':   return this._opPolygon(grid, cols, rows, layer);
      case 'cells':     return this._opCells(grid, cols, rows, layer);
      case 'floodfill': return this._opFloodfill(grid, cols, rows, layer);
      case 'mirror':    return this._opMirror(grid, cols, rows, layer);
      case 'bezier':    return this._opBezier(grid, cols, rows, layer);
      case 'pattern':   return this._opPattern(grid, cols, rows, layer);
      default:
        break;
    }
  }

  // ── Set a pixel (with bounds check + optional opacity) ─────

  static _setPixel(grid, cols, rows, x, y, color, opacity, blend) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    const idx = y * cols + x;

    if (blend && blend !== 'normal') {
      const bg = this._parseHex(grid[idx].color);
      const fg = this._parseHex(color);
      if (bg && fg) {
        let r, g, b;
        switch (blend) {
          case 'multiply':
            r = Math.round(bg.r * fg.r / 255);
            g = Math.round(bg.g * fg.g / 255);
            b = Math.round(bg.b * fg.b / 255);
            break;
          case 'screen':
            r = Math.round(255 - (255 - bg.r) * (255 - fg.r) / 255);
            g = Math.round(255 - (255 - bg.g) * (255 - fg.g) / 255);
            b = Math.round(255 - (255 - bg.b) * (255 - fg.b) / 255);
            break;
          case 'overlay':
            r = bg.r < 128 ? Math.round(2 * bg.r * fg.r / 255) : Math.round(255 - 2 * (255 - bg.r) * (255 - fg.r) / 255);
            g = bg.g < 128 ? Math.round(2 * bg.g * fg.g / 255) : Math.round(255 - 2 * (255 - bg.g) * (255 - fg.g) / 255);
            b = bg.b < 128 ? Math.round(2 * bg.b * fg.b / 255) : Math.round(255 - 2 * (255 - bg.b) * (255 - fg.b) / 255);
            break;
          default:
            r = fg.r; g = fg.g; b = fg.b;
        }
        const blended = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        if (opacity !== undefined && opacity < 1) {
          grid[idx] = { x, y, color: this._blendColor(grid[idx].color, blended, opacity) };
        } else {
          grid[idx] = { x, y, color: blended };
        }
        return;
      }
    }

    if (opacity !== undefined && opacity < 1) {
      const existing = grid[idx].color;
      grid[idx] = { x, y, color: this._blendColor(existing, color, opacity) };
    } else {
      grid[idx] = { x, y, color };
    }
  }

  // ── Operations ─────────────────────────────────────────────

  static _opFill(grid, cols, rows, layer) {
    const { color, opacity, blend } = layer;
    if (!color) return;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this._setPixel(grid, cols, rows, x, y, color, opacity, blend);
      }
    }
  }

  static _opRect(grid, cols, rows, layer) {
    const { color, filled = true, opacity, blend } = layer;
    const rx = Math.floor(Number(layer.x)) || 0;
    const ry = Math.floor(Number(layer.y)) || 0;
    const w = Math.floor(Number(layer.w)) || 0;
    const h = Math.floor(Number(layer.h)) || 0;
    if (!color || w <= 0 || h <= 0) return;

    if (filled) {
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          this._setPixel(grid, cols, rows, rx + dx, ry + dy, color, opacity, blend);
        }
      }
    } else {
      for (let dx = 0; dx < w; dx++) {
        this._setPixel(grid, cols, rows, rx + dx, ry, color, opacity, blend);
        this._setPixel(grid, cols, rows, rx + dx, ry + h - 1, color, opacity, blend);
      }
      for (let dy = 1; dy < h - 1; dy++) {
        this._setPixel(grid, cols, rows, rx, ry + dy, color, opacity, blend);
        this._setPixel(grid, cols, rows, rx + w - 1, ry + dy, color, opacity, blend);
      }
    }
  }

  static _opCircle(grid, cols, rows, layer) {
    const cx = Math.floor(Number(layer.cx)) || 0;
    const cy = Math.floor(Number(layer.cy)) || 0;
    const r = Math.floor(Number(layer.r)) || 0;
    const { color, filled = true, opacity, blend } = layer;
    if (!color || r <= 0) return;

    if (filled) {
      const r2 = r * r;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r2) {
            this._setPixel(grid, cols, rows, cx + dx, cy + dy, color, opacity, blend);
          }
        }
      }
    } else {
      this._bresenhamCircle(grid, cols, rows, cx, cy, r, color, opacity);
    }
  }

  static _opEllipse(grid, cols, rows, layer) {
    const cx = Math.floor(Number(layer.cx)) || 0;
    const cy = Math.floor(Number(layer.cy)) || 0;
    const rx = Math.floor(Number(layer.rx)) || 0;
    const ry = Math.floor(Number(layer.ry)) || 0;
    const { color, filled = true, opacity, blend } = layer;
    if (!color || rx <= 0 || ry <= 0) return;

    if (filled) {
      const rx2 = rx * rx;
      const ry2 = ry * ry;
      for (let dy = -ry; dy <= ry; dy++) {
        for (let dx = -rx; dx <= rx; dx++) {
          if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1) {
            this._setPixel(grid, cols, rows, cx + dx, cy + dy, color, opacity, blend);
          }
        }
      }
    } else {
      this._bresenhamEllipse(grid, cols, rows, cx, cy, rx, ry, color, opacity);
    }
  }

  static _opLine(grid, cols, rows, layer) {
    const { color, opacity } = layer;
    if (!color) return;
    const x1 = Math.floor(Number(layer.x1)) || 0;
    const y1 = Math.floor(Number(layer.y1)) || 0;
    const x2 = Math.floor(Number(layer.x2)) || 0;
    const y2 = Math.floor(Number(layer.y2)) || 0;
    const width = Math.max(1, Math.floor(Number(layer.width)) || 1);

    if (width <= 1) {
      this._bresenhamLine(grid, cols, rows, x1, y1, x2, y2, color, opacity);
      return;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = (width - 1) / 2;
    for (let offset = -half; offset <= half; offset += 1) {
      const ox = Math.round(nx * offset);
      const oy = Math.round(ny * offset);
      this._bresenhamLine(grid, cols, rows, x1 + ox, y1 + oy, x2 + ox, y2 + oy, color, opacity);
    }
  }

  static _opGradient(grid, cols, rows, layer) {
    const { type = 'horizontal', from: colorFrom, to: colorTo, region, opacity, stops } = layer;

    // Multi-stop gradient: render directly without PatternHelpers
    if (Array.isArray(stops) && stops.length >= 2) {
      this._multiStopGradient(grid, cols, rows, layer);
      return;
    }

    if (!colorFrom || !colorTo) return;

    let rx = 0, ry = 0, gw = cols, gh = rows;
    if (Array.isArray(region) && region.length >= 4) {
      rx = Math.max(0, Math.floor(region[0])) || 0;
      ry = Math.max(0, Math.floor(region[1])) || 0;
      gw = Math.floor(region[2]) || cols;
      gh = Math.floor(region[3]) || rows;
    }
    gw = Math.max(1, Math.min(gw, cols - rx));
    gh = Math.max(1, Math.min(gh, rows - ry));

    let cells;
    switch (type) {
      case 'horizontal':
        cells = PatternHelpers.generateHorizontalGradient({
          gridWidth: gw, gridHeight: gh,
          colorStart: colorFrom, colorEnd: colorTo,
        });
        break;
      case 'vertical':
        cells = PatternHelpers.generateVerticalGradient({
          gridWidth: gw, gridHeight: gh,
          colorStart: colorFrom, colorEnd: colorTo,
        });
        break;
      case 'diagonal':
        cells = PatternHelpers.generateDiagonalGradient({
          gridWidth: gw, gridHeight: gh,
          colorStart: colorFrom, colorEnd: colorTo,
        });
        break;
      case 'radial': {
        const rcx = layer.cx != null ? Math.floor(layer.cx) - rx : Math.floor(gw / 2);
        const rcy = layer.cy != null ? Math.floor(layer.cy) - ry : Math.floor(gh / 2);
        const rr = Math.max(1, Math.floor(layer.r) || Math.max(gw, gh) / 2);
        cells = PatternHelpers.generateRadialGradient({
          centerX: rcx, centerY: rcy, radius: rr,
          colorCenter: colorFrom, colorEdge: colorTo,
          gridWidth: gw, gridHeight: gh,
        });
        break;
      }
      default:
        return;
    }

    for (const cell of cells) {
      const finalColor = cell.styles?.background || cell.color;
      if (finalColor) {
        this._setPixel(grid, cols, rows, rx + cell.x, ry + cell.y, finalColor, opacity);
      }
    }
  }

  static _multiStopGradient(grid, cols, rows, layer) {
    const { type = 'vertical', region, opacity, stops } = layer;
    const sorted = [...stops].sort((a, b) => a.at - b.at);

    let rx = 0, ry = 0, gw = cols, gh = rows;
    if (Array.isArray(region) && region.length >= 4) {
      rx = Math.max(0, Math.floor(region[0])) || 0;
      ry = Math.max(0, Math.floor(region[1])) || 0;
      gw = Math.floor(region[2]) || cols;
      gh = Math.floor(region[3]) || rows;
    }
    gw = Math.max(1, Math.min(gw, cols - rx));
    gh = Math.max(1, Math.min(gh, rows - ry));

    const lerpStops = (t) => {
      if (t <= sorted[0].at) return sorted[0].color;
      if (t >= sorted[sorted.length - 1].at) return sorted[sorted.length - 1].color;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (t >= sorted[i].at && t <= sorted[i + 1].at) {
          const range = sorted[i + 1].at - sorted[i].at;
          const local = range > 0 ? (t - sorted[i].at) / range : 0;
          return this._lerpHex(sorted[i].color, sorted[i + 1].color, local);
        }
      }
      return sorted[sorted.length - 1].color;
    };

    if (type === 'radial') {
      const rcx = layer.cx != null ? Math.floor(layer.cx) - rx : Math.floor(gw / 2);
      const rcy = layer.cy != null ? Math.floor(layer.cy) - ry : Math.floor(gh / 2);
      const rr = Math.max(1, Math.floor(layer.r) || Math.max(gw, gh) / 2);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const dist = Math.sqrt((x - rcx) ** 2 + (y - rcy) ** 2);
          const t = Math.min(1, dist / rr);
          this._setPixel(grid, cols, rows, rx + x, ry + y, lerpStops(t), opacity);
        }
      }
    } else {
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          let t;
          if (type === 'horizontal') t = gw > 1 ? x / (gw - 1) : 0;
          else if (type === 'diagonal') t = (gw + gh - 2) > 0 ? (x + y) / (gw + gh - 2) : 0;
          else t = gh > 1 ? y / (gh - 1) : 0; // vertical default
          this._setPixel(grid, cols, rows, rx + x, ry + y, lerpStops(t), opacity);
        }
      }
    }
  }

  static _opPolygon(grid, cols, rows, layer) {
    const { points, color, filled = true, opacity } = layer;
    if (!color || !Array.isArray(points) || points.length < 3) return;

    if (filled) {
      this._scanlineFill(grid, cols, rows, points, color, opacity);
    } else {
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        this._bresenhamLine(grid, cols, rows, x1, y1, x2, y2, color, opacity);
      }
    }
  }

  static _opCells(grid, cols, rows, layer) {
    const { data, opacity: layerOpacity, blend } = layer;
    if (!Array.isArray(data)) return;
    for (const cell of data) {
      if (cell && typeof cell.x === 'number' && typeof cell.y === 'number' && cell.color) {
        this._setPixel(grid, cols, rows, cell.x, cell.y, cell.color, cell.opacity ?? layerOpacity, blend);
      }
    }
  }

  // ── Rasterization helpers ──────────────────────────────────

  static _bresenhamLine(grid, cols, rows, x0, y0, x1, y1, color, opacity) {
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    for (;;) {
      this._setPixel(grid, cols, rows, x0, y0, color, opacity);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  static _bresenhamCircle(grid, cols, rows, cx, cy, r, color, opacity) {
    let x = 0;
    let y = r;
    let d = 3 - 2 * r;

    const plot8 = (px, py) => {
      this._setPixel(grid, cols, rows, cx + px, cy + py, color, opacity);
      this._setPixel(grid, cols, rows, cx - px, cy + py, color, opacity);
      this._setPixel(grid, cols, rows, cx + px, cy - py, color, opacity);
      this._setPixel(grid, cols, rows, cx - px, cy - py, color, opacity);
      this._setPixel(grid, cols, rows, cx + py, cy + px, color, opacity);
      this._setPixel(grid, cols, rows, cx - py, cy + px, color, opacity);
      this._setPixel(grid, cols, rows, cx + py, cy - px, color, opacity);
      this._setPixel(grid, cols, rows, cx - py, cy - px, color, opacity);
    };

    plot8(x, y);
    while (y >= x) {
      x++;
      if (d > 0) { y--; d += 4 * (x - y) + 10; }
      else { d += 4 * x + 6; }
      plot8(x, y);
    }
  }

  static _bresenhamEllipse(grid, cols, rows, cx, cy, rx, ry, color, opacity) {
    let x = 0;
    let y = ry;
    const rx2 = rx * rx;
    const ry2 = ry * ry;
    let px = 0;
    let py = 2 * rx2 * y;
    let p = ry2 - rx2 * ry + 0.25 * rx2;

    const plot4 = (px, py) => {
      this._setPixel(grid, cols, rows, cx + px, cy + py, color, opacity);
      this._setPixel(grid, cols, rows, cx - px, cy + py, color, opacity);
      this._setPixel(grid, cols, rows, cx + px, cy - py, color, opacity);
      this._setPixel(grid, cols, rows, cx - px, cy - py, color, opacity);
    };

    plot4(x, y);
    while (px < py) {
      x++; px += 2 * ry2;
      if (p < 0) { p += ry2 + px; }
      else { y--; py -= 2 * rx2; p += ry2 + px - py; }
      plot4(x, y);
    }

    p = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
    while (y > 0) {
      y--; py -= 2 * rx2;
      if (p > 0) { p += rx2 - py; }
      else { x++; px += 2 * ry2; p += rx2 - py + px; }
      plot4(x, y);
    }
  }

  static _scanlineFill(grid, cols, rows, points, color, opacity) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, py] of points) {
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(rows - 1, Math.floor(maxY));

    const n = points.length;
    for (let y = minY; y <= maxY; y++) {
      const intersections = [];
      for (let i = 0; i < n; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % n];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          const t = (y - y1) / (y2 - y1);
          intersections.push(Math.round(x1 + t * (x2 - x1)));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length - 1; i += 2) {
        const xStart = Math.max(0, intersections[i]);
        const xEnd = Math.min(cols - 1, intersections[i + 1]);
        for (let x = xStart; x <= xEnd; x++) {
          this._setPixel(grid, cols, rows, x, y, color, opacity);
        }
      }
    }
  }

  // ── New operations (Phase 1) ───────────────────────────────

  static _opRRect(grid, cols, rows, layer) {
    const { color, opacity } = layer;
    const x0 = Math.floor(Number(layer.x)) || 0;
    const y0 = Math.floor(Number(layer.y)) || 0;
    const w = Math.floor(Number(layer.w)) || 0;
    const h = Math.floor(Number(layer.h)) || 0;
    const r = Math.min(Math.floor(Number(layer.r)) || 0, Math.floor(w / 2), Math.floor(h / 2));
    if (!color || w <= 0 || h <= 0) return;

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        let inside = true;
        if (dx < r && dy < r) {
          inside = (r - dx - 0.5) ** 2 + (r - dy - 0.5) ** 2 <= r * r;
        } else if (dx >= w - r && dy < r) {
          inside = (dx - (w - r) + 0.5) ** 2 + (r - dy - 0.5) ** 2 <= r * r;
        } else if (dx < r && dy >= h - r) {
          inside = (r - dx - 0.5) ** 2 + (dy - (h - r) + 0.5) ** 2 <= r * r;
        } else if (dx >= w - r && dy >= h - r) {
          inside = (dx - (w - r) + 0.5) ** 2 + (dy - (h - r) + 0.5) ** 2 <= r * r;
        }
        if (inside) {
          this._setPixel(grid, cols, rows, x0 + dx, y0 + dy, color, opacity);
        }
      }
    }
  }

  static _opArc(grid, cols, rows, layer) {
    const cx = Math.floor(Number(layer.cx)) || 0;
    const cy = Math.floor(Number(layer.cy)) || 0;
    const r = Math.floor(Number(layer.r)) || 0;
    const rx = Math.floor(Number(layer.rx)) || r;
    const ry = Math.floor(Number(layer.ry)) || r;
    const startAngle = Number(layer.startAngle) || 0;
    const endAngle = Number(layer.endAngle) ?? 360;
    const { color, opacity } = layer;
    if (!color || (rx <= 0 && ry <= 0)) return;

    const toRad = Math.PI / 180;
    const s = startAngle * toRad;
    const e = endAngle * toRad;
    const steps = Math.max(60, Math.ceil(Math.max(rx, ry) * 2 * Math.PI));
    const range = e - s;
    let prevX = null, prevY = null;
    for (let i = 0; i <= steps; i++) {
      const angle = s + (range * i) / steps;
      const px = Math.round(cx + rx * Math.cos(angle));
      const py = Math.round(cy + ry * Math.sin(angle));
      if (prevX !== null) {
        this._bresenhamLine(grid, cols, rows, prevX, prevY, px, py, color, opacity);
      }
      prevX = px;
      prevY = py;
    }
  }

  static _opBezier(grid, cols, rows, layer) {
    const { color, opacity, blend } = layer;
    if (!color) return;
    const points = layer.points;
    if (!Array.isArray(points) || points.length < 2) return;
    const width = Math.max(1, Math.floor(Number(layer.width)) || 1);

    const pts = points.map(p => [Number(p[0]) || 0, Number(p[1]) || 0]);

    const totalDist = pts.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const dx = p[0] - pts[i - 1][0];
      const dy = p[1] - pts[i - 1][1];
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0);
    const steps = Math.max(20, Math.ceil(totalDist * 1.5));

    let prevX = null, prevY = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const [bx, by] = this._deCasteljau(pts, t);
      const px = Math.round(bx);
      const py = Math.round(by);
      if (prevX !== null) {
        if (width <= 1) {
          this._bresenhamLine(grid, cols, rows, prevX, prevY, px, py, color, opacity);
        } else {
          const dx = px - prevX;
          const dy = py - prevY;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const half = (width - 1) / 2;
          for (let off = -half; off <= half; off += 1) {
            const ox = Math.round(nx * off);
            const oy = Math.round(ny * off);
            this._bresenhamLine(grid, cols, rows, prevX + ox, prevY + oy, px + ox, py + oy, color, opacity);
          }
        }
      }
      prevX = px;
      prevY = py;
    }
  }

  static _deCasteljau(points, t) {
    if (points.length === 1) return points[0];
    const next = [];
    for (let i = 0; i < points.length - 1; i++) {
      next.push([
        points[i][0] * (1 - t) + points[i + 1][0] * t,
        points[i][1] * (1 - t) + points[i + 1][1] * t,
      ]);
    }
    return this._deCasteljau(next, t);
  }

  static _opPattern(grid, cols, rows, layer) {
    const { type = 'checker', colors, scale = 4, region, opacity, blend } = layer;
    if (!Array.isArray(colors) || colors.length < 2) return;

    const [rx, ry, rw, rh] = Array.isArray(region) ? region : [0, 0, cols, rows];
    const x0 = Math.max(0, Math.floor(rx));
    const y0 = Math.max(0, Math.floor(ry));
    const x1 = Math.min(cols, Math.floor(rx + rw));
    const y1 = Math.min(rows, Math.floor(ry + rh));
    const s = Math.max(1, Math.floor(scale));

    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        let colorIdx;
        switch (type) {
          case 'checker':
            colorIdx = ((Math.floor(px / s) + Math.floor(py / s)) % 2 === 0) ? 0 : 1;
            break;
          case 'stripes':
            colorIdx = Math.floor(py / s) % colors.length;
            break;
          case 'dots':
            colorIdx = ((px % s === Math.floor(s / 2)) && (py % s === Math.floor(s / 2))) ? 1 : 0;
            break;
          case 'crosshatch': {
            const onH = py % s === 0;
            const onV = px % s === 0;
            colorIdx = (onH || onV) ? 1 : 0;
            break;
          }
          case 'noise': {
            const hash = ((px * 374761393 + py * 668265263) ^ (px * 1274126177)) >>> 0;
            colorIdx = hash % colors.length;
            break;
          }
          default:
            colorIdx = 0;
        }
        this._setPixel(grid, cols, rows, px, py, colors[colorIdx], opacity, blend);
      }
    }
  }

  static _opFloodfill(grid, cols, rows, layer) {
    const { color, opacity } = layer;
    const sx = Math.floor(Number(layer.x)) || 0;
    const sy = Math.floor(Number(layer.y)) || 0;
    if (!color || sx < 0 || sx >= cols || sy < 0 || sy >= rows) return;

    const targetColor = grid[sy * cols + sx].color;
    if (targetColor === color) return;

    const stack = [[sx, sy]];
    const visited = new Set();
    visited.add(`${sx},${sy}`);

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const idx = y * cols + x;
      if (grid[idx].color !== targetColor) continue;
      this._setPixel(grid, cols, rows, x, y, color, opacity);

      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          const key = `${nx},${ny}`;
          if (!visited.has(key)) {
            visited.add(key);
            stack.push([nx, ny]);
          }
        }
      }
    }
  }

  static _opMirror(grid, cols, rows, layer) {
    const axis = layer.axis || 'x';
    if (axis === 'x') {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < Math.floor(cols / 2); x++) {
          const src = grid[y * cols + x];
          grid[y * cols + (cols - 1 - x)] = { x: cols - 1 - x, y, color: src.color };
        }
      }
    } else {
      for (let y = 0; y < Math.floor(rows / 2); y++) {
        for (let x = 0; x < cols; x++) {
          const src = grid[y * cols + x];
          grid[(rows - 1 - y) * cols + x] = { x, y: rows - 1 - y, color: src.color };
        }
      }
    }
  }

  // ── Color utilities ───────────────────────────────────────

  static _lerpHex(hex1, hex2, t) {
    const c1 = this._parseHex(hex1);
    const c2 = this._parseHex(hex2);
    if (!c1 || !c2) return hex2;
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  static _blendColor(bgHex, fgHex, alpha) {
    const bg = this._parseHex(bgHex);
    const fg = this._parseHex(fgHex);
    if (!bg || !fg) return fgHex;

    const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
    const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
    const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  static _parseHex(hex) {
    if (!hex || typeof hex !== 'string') return null;
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    if (h.length === 3) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16),
      };
    }
    if (h.length >= 6) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    }
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.DrawingInstructions = DrawingInstructions;
}

export { DrawingInstructions };
