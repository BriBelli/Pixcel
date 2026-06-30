/**
 * Pixcel canonical resolution ladder — ONE vocabulary from the chunky splash wall to the final film.
 *
 * `RES` maps a tier name → its HORIZONTAL cell count (cols across). That's exactly what the full-bleed
 * digital wall consumes (rows flex to the window), so `pixels={RES.retro}` is just a NAMED `128`.
 * Low tiers ARE the chunky look — fewer cells = bigger cells (no super-pixels). High tiers are fine
 * grids for photoreal conversion + film export. Pick lower for chunkier, higher for finer.
 *
 * `RES_META` carries each tier's full real-world reference (W×H + label + anchor) for fixed-size art /
 * film canvases and export down the line — the SAME names carry across every surface.
 */
export const RES = {
  // ── Chunky: the wall lives here. Low resolution = the retro/chunky feel. ──
  sprite: 64, //   big blocks
  retro: 128, //   classic chunky lo-res
  eightBit: 256, // NES/SNES era
  sd: 320, //      standard-def
  // ── Photoreal / film: fine grids for conversion + export (not the chunky look). ──
  p480: 640, //    SD video
  p720: 1280, //   HD
  p1080: 1920, //  Full HD
  uhd: 3840, //    4K UHD
} as const;

export type ResTier = keyof typeof RES;

export interface ResMeta {
  /** Horizontal cells (= RES[tier]) — what the wall uses. */
  cols: number;
  /** Canonical reference dimensions (px) — for fixed-size canvases & export. */
  refW: number;
  refH: number;
  /** Human / canonical label. */
  label: string;
  /** Real-world standard it maps to. */
  anchor: string;
}

export const RES_META: Record<ResTier, ResMeta> = {
  sprite: { cols: 64, refW: 64, refH: 64, label: 'Sprite', anchor: '64-px sprite / icon' },
  retro: { cols: 128, refW: 128, refH: 96, label: 'Retro', anchor: 'classic lo-res' },
  eightBit: { cols: 256, refW: 256, refH: 240, label: '8-bit', anchor: 'NES 256×240' },
  sd: { cols: 320, refW: 320, refH: 240, label: 'SD', anchor: 'QVGA 320×240' },
  p480: { cols: 640, refW: 640, refH: 480, label: '480p', anchor: 'SD video' },
  p720: { cols: 1280, refW: 1280, refH: 720, label: '720p', anchor: 'HD' },
  p1080: { cols: 1920, refW: 1920, refH: 1080, label: '1080p', anchor: 'Full HD' },
  uhd: { cols: 3840, refW: 3840, refH: 2160, label: '4K', anchor: 'UHD / 4096 DCI cinema' },
};
