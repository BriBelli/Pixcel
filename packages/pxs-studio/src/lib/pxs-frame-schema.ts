import type { PXSFrame, PXSCell } from '../store/pxs-store';

/**
 * JSON schema for forcing a valid PXSFrame out of the model via structured output
 * (`output_config.format`). Shape-validity only — density/purity ("Stay Pure") is
 * enforced separately by {@link validateFrame}, since JSON Schema can't express
 * "exactly cols*rows cells". See docs/PIXCEL-METHOD.md.
 */
export const PXS_FRAME_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cols: { type: 'integer' },
    rows: { type: 'integer' },
    title: { type: 'string' },
    cells: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          x: { type: 'integer' },
          y: { type: 'integer' },
          color: { type: 'string' },
          opacity: { type: 'number' },
        },
        required: ['x', 'y', 'color', 'opacity'],
      },
    },
  },
  required: ['cols', 'rows', 'cells'],
} as const;

/**
 * Compact CHAR-MAP output schema for the artist's submit_art tool. Instead of one verbose
 * object per cell (~20 tokens each), the model draws a grid of single-character symbols
 * (1 char/cell) plus a palette legend — the same representation it designs in. "." = empty
 * background, so empty space costs ~1 token. This is ~10x lighter than the verbose form and
 * fill-independent, which is what unlocks 48²/64² without blowing the output-token budget.
 * Expanded to a dense PXSFrame server-side by {@link charMapToFrame}.
 */
export const CHARMAP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', description: 'Short 1–3 word name for the piece.' },
    cols: { type: 'integer' },
    rows: { type: 'integer' },
    palette: {
      type: 'object',
      description: 'Map of single-character symbol → lowercase #rrggbb hex. Use "." for background.',
      additionalProperties: { type: 'string' },
    },
    grid: {
      type: 'array',
      description: 'One string per row, top to bottom; one character per column. "." = background.',
      items: { type: 'string' },
    },
  },
  required: ['title', 'cols', 'rows', 'palette', 'grid'],
} as const;

/** Structured-output schema for the vision art-director's verdict. */
export const CRITIQUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    approved: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['approved', 'issues'],
} as const;

export interface ValidateResult {
  ok: boolean;
  errors: string[];
}

const HEX = /^#[0-9a-f]{6}$/;
const MAX_ERRORS = 12;

/**
 * The Pixcel Method validation checklist (docs/PIXCEL-METHOD.md):
 * dense (every cell once, no gaps/dups), pure (one lowercase-hex solid color, opacity 1),
 * sane bounds. Returns the specific errors so the generator can re-prompt against them.
 */
export function validateFrame(frame: unknown): ValidateResult {
  const errors: string[] = [];
  const push = (e: string) => {
    if (errors.length < MAX_ERRORS) errors.push(e);
  };

  if (!frame || typeof frame !== 'object') {
    return { ok: false, errors: ['frame is not an object'] };
  }
  const f = frame as Partial<PXSFrame>;

  if (!Number.isInteger(f.cols) || !Number.isInteger(f.rows)) {
    return { ok: false, errors: ['cols and rows must be integers'] };
  }
  const cols = f.cols as number;
  const rows = f.rows as number;
  if (cols < 8 || cols > 64 || rows < 8 || rows > 64) {
    push(`cols/rows out of bounds (got ${cols}x${rows}, expected 8–64)`);
  }
  if (!Array.isArray(f.cells)) {
    return { ok: false, errors: ['cells must be an array'] };
  }

  const expected = cols * rows;
  if (f.cells.length !== expected) {
    push(`expected ${expected} cells (${cols}x${rows}), got ${f.cells.length}`);
  }

  const seen = new Set<string>();
  for (const c of f.cells as PXSCell[]) {
    const k = `${c.x},${c.y}`;
    if (c.x < 0 || c.x >= cols || c.y < 0 || c.y >= rows) {
      push(`cell out of range at (${c.x},${c.y})`);
      continue;
    }
    if (seen.has(k)) push(`duplicate cell at ${k}`);
    seen.add(k);
    if (typeof c.color !== 'string' || !HEX.test(c.color)) {
      push(`bad color at ${k}: ${String(c.color)} (need lowercase #rrggbb)`);
    }
    if (c.opacity !== 1) push(`bad opacity at ${k}: ${String(c.opacity)} (Stay Pure: must be 1)`);
  }

  // Report missing cells (only if count is off, to keep the list short)
  if (seen.size !== expected) {
    let missing = 0;
    outer: for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!seen.has(`${x},${y}`)) {
          push(`missing cell at ${x},${y}`);
          if (++missing >= 4) break outer;
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Background color for any empty ("." or unmapped) char-map cell. */
export const BACKGROUND = '#0d1117';

export interface CharMap {
  title?: string;
  cols: number;
  rows: number;
  palette: Record<string, string>;
  grid: string[];
}

/**
 * Validate a char-map (the artist's compact output) and return specific, fixable errors so
 * the artist can be re-prompted — the char-map analogue of {@link validateFrame}. Checks
 * bounds, a clean palette (single-char keys → lowercase hex), and a rectangular grid whose
 * symbols are all defined ("." / " " are always background).
 */
export function validateCharMap(input: unknown): ValidateResult {
  const errors: string[] = [];
  const push = (e: string) => {
    if (errors.length < MAX_ERRORS) errors.push(e);
  };

  if (!input || typeof input !== 'object') return { ok: false, errors: ['output is not an object'] };
  const m = input as Partial<CharMap>;

  if (!Number.isInteger(m.cols) || !Number.isInteger(m.rows)) {
    return { ok: false, errors: ['cols and rows must be integers'] };
  }
  const cols = m.cols as number;
  const rows = m.rows as number;
  if (cols < 8 || cols > 64 || rows < 8 || rows > 64) {
    push(`cols/rows out of bounds (got ${cols}x${rows}, expected 8–64)`);
  }

  if (!m.palette || typeof m.palette !== 'object') {
    return { ok: false, errors: ['palette must be an object of single-char → #rrggbb'] };
  }
  for (const [ch, hex] of Object.entries(m.palette)) {
    if (ch.length !== 1) push(`palette key "${ch}" must be a single character`);
    if (typeof hex !== 'string' || !HEX.test(hex)) {
      push(`palette["${ch}"]=${String(hex)} must be lowercase #rrggbb`);
    }
  }

  if (!Array.isArray(m.grid)) return { ok: false, errors: ['grid must be an array of row strings'] };
  if (m.grid.length !== rows) push(`grid has ${m.grid.length} rows, expected ${rows}`);

  const known = new Set<string>(Object.keys(m.palette));
  known.add('.');
  known.add(' ');
  m.grid.forEach((row, y) => {
    if (typeof row !== 'string') {
      push(`row ${y} is not a string`);
      return;
    }
    if (row.length !== cols) push(`row ${y} has length ${row.length}, expected ${cols}`);
    for (const chr of row) {
      if (!known.has(chr)) {
        push(`row ${y} uses undefined symbol "${chr}" — add it to palette or use "."`);
        break; // one symbol error per row keeps the list actionable
      }
    }
  });

  return { ok: errors.length === 0, errors };
}

/**
 * Expand a char-map into a dense PXSFrame (every cell present, Stay Pure). "." / " " / any
 * unmapped or short-row cell becomes the background. The dense frame is the canonical form
 * the rest of the pipeline (render, judge, store, hardware) consumes. Lenient by design —
 * {@link validateCharMap} is what gates acceptance; this never throws.
 */
export function charMapToFrame(input: CharMap): PXSFrame {
  const cols = input.cols;
  const rows = input.rows;
  const pal = input.palette || {};
  const cells: PXSCell[] = [];
  for (let y = 0; y < rows; y++) {
    const row = input.grid?.[y] ?? '';
    for (let x = 0; x < cols; x++) {
      const ch = row[x];
      let color = ch && pal[ch] ? pal[ch].toLowerCase() : BACKGROUND;
      if (!HEX.test(color)) color = BACKGROUND;
      cells.push({ x, y, color, opacity: 1 });
    }
  }
  const frame: PXSFrame = { cols, rows, cells };
  if (input.title) (frame as PXSFrame & { title?: string }).title = input.title;
  return frame;
}
