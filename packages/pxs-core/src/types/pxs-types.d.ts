/**
 * PXS Type Definitions
 * 
 * Core data structures for the PXS digital image/animation platform.
 * Images and animations are DATA, not files.
 */

/**
 * A single cell in a PXS grid
 */
interface PXSCell {
  /** X coordinate (column) */
  x: number;
  /** Y coordinate (row) */
  y: number;
  /** Cell color (hex, rgb, rgba, or named color) */
  color: string;
  /** Optional opacity override (0-1). If not provided, uses alpha from rgba() color if present */
  opacity?: number;
}

/**
 * A single frame (still image) in PXS format
 */
interface PXSFrame {
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
  /** Array of cell data */
  cells: PXSCell[];
  /** Optional metadata */
  metadata?: PXSFrameMetadata;
}

/**
 * Metadata for a PXS frame
 */
interface PXSFrameMetadata {
  /** Source of the image (filename, URL, or 'generated') */
  source?: string;
  /** Original source width in pixels */
  sourceWidth?: number;
  /** Original source height in pixels */
  sourceHeight?: number;
  /** Timestamp of creation */
  timestamp?: number;
  /** PXS version that created this frame */
  version?: string;
  /** Processing options used */
  options?: {
    quality?: string | number;
    preserveAspect?: boolean;
    gammaCorrect?: boolean;
  };
  /** Custom user data */
  [key: string]: any;
}

/**
 * Compressed frame format for storage/transmission
 */
interface PXSCompressedFrame {
  /** Columns */
  c: number;
  /** Rows */
  r: number;
  /** Color data array (ordered by y*cols+x) */
  d: string[];
  /** Metadata */
  m?: PXSFrameMetadata;
}

/**
 * An animation (sequence of frames)
 */
interface PXSAnimation {
  /** Frames per second */
  fps: number;
  /** Array of frames */
  frames: PXSFrame[];
  /** Animation metadata */
  metadata?: PXSAnimationMetadata;
}

/**
 * Metadata for a PXS animation
 */
interface PXSAnimationMetadata {
  /** Animation name */
  name?: string;
  /** Total duration in milliseconds */
  duration?: number;
  /** Whether animation loops */
  loop?: boolean;
  /** Creation timestamp */
  timestamp?: number;
  /** PXS version */
  version?: string;
  /** Custom user data */
  [key: string]: any;
}

/**
 * Compressed animation format
 */
interface PXSCompressedAnimation {
  /** Frames per second */
  fps: number;
  /** Compressed frames */
  frames: PXSCompressedFrame[];
  /** Metadata */
  m?: PXSAnimationMetadata;
}

/**
 * Options for loading an image
 */
interface PXSImageLoadOptions {
  /** Target columns (width in cells) */
  cols?: number;
  /** Target rows (height in cells) */
  rows?: number;
  /** Quality preset: 'retro', 'low', 'medium', 'high', 'hd', 'ultra' or number */
  quality?: 'retro' | 'low' | 'medium' | 'high' | 'hd' | 'ultra' | number;
  /** Maintain image aspect ratio */
  preserveAspect?: boolean;
  /** Apply gamma correction for accurate color averaging */
  gammaCorrect?: boolean;
}

/**
 * Options for setData method
 */
interface PXSSetDataOptions {
  /** Resize grid if dimensions differ */
  resize?: boolean;
}

/**
 * Options for exportData method
 */
interface PXSExportOptions {
  /** Use compressed format */
  compress?: boolean;
  /** Pretty print JSON */
  pretty?: boolean;
}

/**
 * Animation playback state
 */
interface PXSPlaybackState {
  /** Is currently playing */
  playing: boolean;
  /** Current frame index */
  currentFrame: number;
  /** Total number of frames */
  totalFrames: number;
  /** Playback FPS */
  fps: number;
  /** Loop enabled */
  loop: boolean;
  /** Current timestamp in animation */
  timestamp: number;
}

/**
 * Storage adapter interface
 */
interface PXSStorageAdapter {
  /** Save frame data */
  save(key: string, data: PXSFrame | PXSAnimation): Promise<void>;
  /** Load frame data */
  load(key: string): Promise<PXSFrame | PXSAnimation | null>;
  /** Delete frame data */
  delete(key: string): Promise<void>;
  /** List all keys */
  list(): Promise<string[]>;
}

/**
 * Quality presets map
 */
interface PXSQualityPresets {
  retro: number;  // 16
  low: number;    // 32
  medium: number; // 64
  high: number;   // 128
  hd: number;     // 200
  ultra: number;  // 300
}

// Export for module systems
export {
  PXSCell,
  PXSFrame,
  PXSFrameMetadata,
  PXSCompressedFrame,
  PXSAnimation,
  PXSAnimationMetadata,
  PXSCompressedAnimation,
  PXSImageLoadOptions,
  PXSSetDataOptions,
  PXSExportOptions,
  PXSPlaybackState,
  PXSStorageAdapter,
  PXSQualityPresets
};
