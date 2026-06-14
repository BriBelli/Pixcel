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
