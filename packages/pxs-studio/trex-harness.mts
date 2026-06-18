/* DEV SCRATCH — not product. One-off harness used to hand-author the trex-claudecode-32 gallery
 * bar; kept only as a record of how that bar was made (see docs/PIXCEL-ART-ENGINE.md). Safe to
 * delete. (Its sibling scratch — /tmp/trex/* — is gitignored throwaway and not in the repo.)
 *
 * PERCEIVE harness for hand-authoring the T-rex: rasterize my hand-placed char-map to a PNG so I
 * can look at it and fix. The ART is the GRID below (every cell my choice); this only renders +
 * validates row widths. `node` arg "save" also writes the gallery JSON from the same hand grid. */
import fs from 'fs';
import { frameToPngBase64 } from './src/lib/render-frame';
import { charMapToFrame } from './src/lib/pxs-frame-schema';

const PAL: Record<string, string> = {
  '.': '#0d1117', // background
  G: '#4e9a3a',   // base green
  D: '#2f6e24',   // shadow green
  H: '#82d35e',   // highlight green
  B: '#1f4a18',   // deep shadow (far leg / under-belly)
  M: '#f2efe0',   // teeth / claws
  E: '#f2a724',   // eye amber
  K: '#14210d',   // near-black: socket, mouth, nostril
};

// ===== HAND-AUTHORED CHAR-MAP (the art) =====
const GRID: string[] = [
  "................................",
  "................................",
  "....GGGG........................",
  "...GGGGGG.......................",
  "..GGGGGGGGG.....................",
  "..GGGGGGGGGG....GGGG............",
  ".GGGEGGGGGGGGGGGGGGGGG..........",
  ".GGGGGGGGGGGGGGGGGGGGGGG........",
  "GGGGGGGGGGGGGGGGGGGGGGGGGG......",
  "GMMGGGGGGGGGGGGGGGGGGGGGGGGD....",
  "GMMGGGGGGGGGGGGGGGGGGGGGGGGGD...",
  ".GGGGGGGGGGGGGGGGGGGGGGGGGGGGD..",
  "..GGGGGGGGGGGGGGGGGGGGGGGGGGGGD.",
  "...GGGGGGGGGGGGGGGGGGGGGGGGGGGGD",
  "....GGGGGGGGGGGGGGGGGGGGGGGGGGD.",
  ".....GGGGGGGGGGGGGGGGGGGGGGGGD..",
  "......GGGGGGGGGGGGGGGGGGGGGGD...",
  ".......GGGGGGGGGGGGGGGGGGGD.....",
  ".......GGGGGG....GGGGGGGD.......",
  ".......GGGGG......GGGGGG........",
  ".......GGGG.......GGGGG.........",
  "........GGG.......GGGGG.........",
  "........GGG.......GGGG..........",
  "........GGG.......GGG...........",
  "........GGG.......GGG...........",
  "........GGG.......GGG...........",
  "........GGG.......GGG...........",
  "........GGG.......GGG...........",
  ".......GGGG......GGGG...........",
  "......MMGGG.....MMGGG...........",
  "................................",
  "................................",
];

const cols = 32, rows = 32;
let bad = 0;
GRID.forEach((r, i) => { if (r.length !== cols) { console.log(`row ${i} len ${r.length}`); bad++; } });
if (bad) { console.log(`${bad} bad rows`); process.exit(1); }

const frame = charMapToFrame({ cols, rows, palette: PAL, grid: GRID });
fs.mkdirSync('/tmp/trex2', { recursive: true });
fs.writeFileSync('/tmp/trex2/out.png', Buffer.from(frameToPngBase64(frame, 512), 'base64'));
console.log('wrote /tmp/trex2/out.png');

if (process.argv[2] === 'save') {
  const out = {
    cols, rows,
    cells: frame.cells.map((c) => ({ x: c.x, y: c.y, color: c.color, opacity: 1 })),
    metadata: { title: 'T-Rex', prompt: 'a t-rex', author: 'ai-composer', model: 'claude-opus-4-8', created: '2026-06-18' },
  };
  fs.writeFileSync('./src/data/gallery/trex-32.json', JSON.stringify(out, null, 2));
  console.log('saved gallery/trex-32.json', frame.cells.length, 'cells');
}
