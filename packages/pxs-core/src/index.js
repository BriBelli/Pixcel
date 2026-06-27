/**
 * PXS Core Library - Headless Pixel Cell Animation Engine
 * @version 4.0.0
 * @author Brian Bellissimo
 * @license MIT
 */

// Re-export all modules
export * from './CellAnimator.js';
export * from './core/CellGroup.js';
export * from './renderers/BaseRenderer.js';
export * from './renderers/HTMLRenderer.js';
export * from './renderers/CanvasRenderer.js';
export * from './renderers/WebGLRenderer.js';
export * from './helpers/PatternHelpers.js';
export * from './helpers/ImageHelpers.js';
export * from './helpers/AnimationHelpers.js';
export * from './helpers/DrawingInstructions.js';
export * from './storage/StorageAdapters.js';
export * from './performance/PerformanceProfiler.js';
export * from './performance/ObjectPool.js';
export * from './spatial/ViewportManager.js';
export * from './spatial/SpatialIndex.js';
export * from './transforms/TransformMatrix.js';
export * from './ui/FrameDeck.js';
export * from './wasm/WASMIntegration.js';

// Factory & Utilities
import PXS from './pxs.js';
export { PXS };
export default PXS;

// Version
export const PXS_VERSION = '4.0.0';
export const PXS_BUILD = 'Production Architecture';
