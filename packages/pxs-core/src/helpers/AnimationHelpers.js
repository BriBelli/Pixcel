/**
 * AnimationHelpers - Animation and frame sequence management
 * 
 * Core principle: Animations are arrays of frames (multi-dimensional arrays).
 * Each frame is a PXSFrame (array of cells), and an animation is an array of frames.
 * 
 * Structure:
 *   Animation = Frame[] where each Frame = Cell[]
 *   This allows:
 *   - Frame-by-frame editing
 *   - Time travel (undo/redo)
 *   - Variable framerate control
 *   - Chunked loading for performance
 *   - Database/cache storage per frame
 * 
 * @example
 * // Create animation from frames
 * const animation = AnimationHelpers.createAnimation([frame1, frame2, frame3], { fps: 30 });
 * 
 * // Get specific frame
 * const frame = AnimationHelpers.getFrame(animation, 1);
 * 
 * // Edit a frame
 * animation.frames[1].cells[100].color = '#FF0000';
 * 
 * // Play
 * player.play(animation);
 */

class AnimationHelpers {
  /**
   * PXS Version
   */
  static VERSION = '2.0.0';
  
  /**
   * Default frames per second
   */
  static DEFAULT_FPS = 30;
  
  /**
   * Create a new PXSAnimation from an array of frames
   * @param {PXSFrame[]} frames - Array of frame data
   * @param {Object} [options] - Animation options
   * @param {number} [options.fps=30] - Frames per second
   * @param {boolean} [options.loop=true] - Whether to loop
   * @param {string} [options.name] - Animation name
   * @returns {PXSAnimation} Animation object
   */
  static createAnimation(frames, options = {}) {
    const {
      fps = this.DEFAULT_FPS,
      loop = true,
      name = 'untitled'
    } = options;
    
    // Validate all frames have same dimensions
    if (frames.length > 0) {
      const { cols, rows } = frames[0];
      for (let i = 1; i < frames.length; i++) {
        if (frames[i].cols !== cols || frames[i].rows !== rows) {
          console.warn(`AnimationHelpers: Frame ${i} has different dimensions`);
        }
      }
    }
    
    return {
      fps,
      frames,
      metadata: {
        name,
        loop,
        frameCount: frames.length,
        duration: (frames.length / fps) * 1000, // ms
        timestamp: Date.now(),
        version: this.VERSION
      }
    };
  }
  
  /**
   * Create animation from image sequence (URLs or Files)
   * @param {Array<string|File>} sources - Array of image sources
   * @param {Object} options - Options
   * @param {number} [options.cols] - Target columns
   * @param {number} [options.rows] - Target rows
   * @param {string} [options.quality='medium'] - Quality preset
   * @param {number} [options.fps=30] - Frames per second
   * @returns {Promise<PXSAnimation>} Animation object
   */
  static async createFromImages(sources, options = {}) {
    const {
      cols,
      rows,
      quality = 'medium',
      fps = this.DEFAULT_FPS,
      preserveAspect = true,
      gammaCorrect = true,
      onProgress
    } = options;
    
    const frames = [];
    
    for (let i = 0; i < sources.length; i++) {
      // Load each image as a frame
      const frameData = await ImageHelpers.loadImage(sources[i], {
        cols,
        rows,
        quality,
        preserveAspect,
        gammaCorrect
      });
      
      frames.push(frameData);
      
      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: sources.length,
          percent: ((i + 1) / sources.length) * 100
        });
      }
    }
    
    return this.createAnimation(frames, { fps, ...options });
  }
  
  /**
   * Get a specific frame from an animation
   * @param {PXSAnimation} animation - Animation object
   * @param {number} index - Frame index
   * @returns {PXSFrame|null} Frame data or null
   */
  static getFrame(animation, index) {
    if (index < 0 || index >= animation.frames.length) {
      return null;
    }
    return animation.frames[index];
  }
  
  /**
   * Set a specific frame in an animation
   * @param {PXSAnimation} animation - Animation object
   * @param {number} index - Frame index
   * @param {PXSFrame} frame - New frame data
   * @returns {PXSAnimation} Updated animation (mutates original)
   */
  static setFrame(animation, index, frame) {
    if (index >= 0 && index < animation.frames.length) {
      animation.frames[index] = frame;
      animation.metadata.timestamp = Date.now();
    }
    return animation;
  }
  
  /**
   * Add a frame to the animation
   * @param {PXSAnimation} animation - Animation object
   * @param {PXSFrame} frame - Frame to add
   * @param {number} [index] - Index to insert at (default: end)
   * @returns {PXSAnimation} Updated animation
   */
  static addFrame(animation, frame, index) {
    if (index === undefined) {
      animation.frames.push(frame);
    } else {
      animation.frames.splice(index, 0, frame);
    }
    animation.metadata.frameCount = animation.frames.length;
    animation.metadata.duration = (animation.frames.length / animation.fps) * 1000;
    animation.metadata.timestamp = Date.now();
    return animation;
  }
  
  /**
   * Remove a frame from the animation
   * @param {PXSAnimation} animation - Animation object
   * @param {number} index - Frame index to remove
   * @returns {PXSFrame|null} Removed frame or null
   */
  static removeFrame(animation, index) {
    if (index < 0 || index >= animation.frames.length) {
      return null;
    }
    const removed = animation.frames.splice(index, 1)[0];
    animation.metadata.frameCount = animation.frames.length;
    animation.metadata.duration = (animation.frames.length / animation.fps) * 1000;
    animation.metadata.timestamp = Date.now();
    return removed;
  }
  
  /**
   * Duplicate a frame
   * @param {PXSAnimation} animation - Animation object
   * @param {number} index - Frame index to duplicate
   * @returns {PXSAnimation} Updated animation
   */
  static duplicateFrame(animation, index) {
    const frame = this.getFrame(animation, index);
    if (frame) {
      const cloned = ImageHelpers.cloneFrame(frame);
      this.addFrame(animation, cloned, index + 1);
    }
    return animation;
  }
  
  /**
   * Clone an entire animation (deep copy)
   * @param {PXSAnimation} animation - Animation to clone
   * @returns {PXSAnimation} Cloned animation
   */
  static cloneAnimation(animation) {
    const srcFrames = animation.frames;
    const len = srcFrames.length;
    const frames = new Array(len);
    for (let i = 0; i < len; i++) {
      frames[i] = ImageHelpers.cloneFrame(srcFrames[i]);
    }
    return {
      fps: animation.fps,
      frames,
      metadata: {
        ...animation.metadata,
        timestamp: Date.now()
      }
    };
  }
  
  /**
   * Create a blank animation with specified number of frames
   * @param {number} cols - Columns
   * @param {number} rows - Rows
   * @param {number} frameCount - Number of frames
   * @param {Object} [options] - Options
   * @returns {PXSAnimation} Blank animation
   */
  static createBlankAnimation(cols, rows, frameCount, options = {}) {
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      frames.push(ImageHelpers.createBlankFrame(cols, rows, options.fillColor));
    }
    return this.createAnimation(frames, options);
  }
  
  /**
   * Get frame at specific time
   * @param {PXSAnimation} animation - Animation object
   * @param {number} timeMs - Time in milliseconds
   * @returns {PXSFrame|null} Frame at that time
   */
  static getFrameAtTime(animation, timeMs) {
    const frameIndex = Math.floor((timeMs / 1000) * animation.fps);
    const index = animation.metadata.loop 
      ? frameIndex % animation.frames.length 
      : Math.min(frameIndex, animation.frames.length - 1);
    return this.getFrame(animation, index);
  }
  
  /**
   * Get a range of frames for chunked loading
   * @param {PXSAnimation} animation - Animation object
   * @param {number} startIndex - Start frame index
   * @param {number} count - Number of frames to get
   * @returns {PXSFrame[]} Array of frames
   */
  static getFrameRange(animation, startIndex, count) {
    const endIndex = Math.min(startIndex + count, animation.frames.length);
    return animation.frames.slice(startIndex, endIndex);
  }
  
  /**
   * Compress animation for storage/transmission
   * @param {PXSAnimation} animation - Animation object
   * @returns {Object} Compressed animation
   */
  static compressAnimation(animation) {
    const srcFrames = animation.frames;
    const len = srcFrames.length;
    const frames = new Array(len);
    for (let i = 0; i < len; i++) {
      frames[i] = ImageHelpers.compressFrame(srcFrames[i]);
    }
    return {
      fps: animation.fps,
      frames,
      m: animation.metadata
    };
  }

  /**
   * Decompress animation
   * @param {Object} compressed - Compressed animation
   * @returns {PXSAnimation} Full animation object
   */
  static decompressAnimation(compressed) {
    const srcFrames = compressed.frames;
    const len = srcFrames.length;
    const frames = new Array(len);
    for (let i = 0; i < len; i++) {
      frames[i] = ImageHelpers.decompressFrame(srcFrames[i]);
    }
    return {
      fps: compressed.fps,
      frames,
      metadata: compressed.m || {}
    };
  }
  
  /**
   * Calculate animation statistics
   * @param {PXSAnimation} animation - Animation object
   * @returns {Object} Stats
   */
  static getStats(animation) {
    const frame = animation.frames[0];
    const cellsPerFrame = frame ? frame.cols * frame.rows : 0;
    return {
      frameCount: animation.frames.length,
      fps: animation.fps,
      duration: animation.metadata.duration,
      durationSeconds: animation.metadata.duration / 1000,
      cols: frame?.cols || 0,
      rows: frame?.rows || 0,
      cellsPerFrame,
      totalCells: cellsPerFrame * animation.frames.length, // Simple multiplication
      estimatedSize: JSON.stringify(animation).length,
      loop: animation.metadata.loop
    };
  }
  
  /**
   * Validate animation object
   * @param {Object} data - Data to validate
   * @returns {boolean} True if valid
   */
  static validateAnimation(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.fps !== 'number') return false;
    if (!Array.isArray(data.frames)) return false;
    if (data.frames.length === 0) return true; // Empty animation is valid
    
    // Validate each frame (for loop for early exit)
    const frames = data.frames;
    for (let i = 0, len = frames.length; i < len; i++) {
      if (!ImageHelpers.validateFrame(frames[i])) return false;
    }
    return true;
  }
  
  /**
   * Interpolate between two frames (for smooth transitions)
   * @param {PXSFrame} frameA - Start frame
   * @param {PXSFrame} frameB - End frame
   * @param {number} t - Interpolation factor (0-1)
   * @returns {PXSFrame} Interpolated frame
   */
  static interpolateFrames(frameA, frameB, t) {
    if (frameA.cols !== frameB.cols || frameA.rows !== frameB.rows) {
      console.warn('AnimationHelpers: Cannot interpolate frames with different dimensions');
      return t < 0.5 ? frameA : frameB;
    }
    
    const cellsA = frameA.cells;
    const cellsB = frameB.cells;
    const len = cellsA.length;
    const cells = new Array(len);
    
    for (let i = 0; i < len; i++) {
      const cellA = cellsA[i];
      const cellB = cellsB[i];
      
      // Parse colors
      const rgbA = this._parseColor(cellA.color);
      const rgbB = this._parseColor(cellB.color);
      
      // Interpolate
      const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * t);
      const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * t);
      const b = Math.round(rgbA.b + (rgbB.b - rgbA.b) * t);
      
      cells[i] = {
        x: cellA.x,
        y: cellA.y,
        color: `rgb(${r}, ${g}, ${b})`
      };
    }
    
    return {
      cols: frameA.cols,
      rows: frameA.rows,
      cells,
      metadata: {
        source: 'interpolated',
        timestamp: Date.now(),
        version: this.VERSION
      }
    };
  }
  
  /**
   * Parse color string to RGB object
   * @private
   */
  static _parseColor(colorStr) {
    // Handle rgb(r, g, b) format
    const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3])
      };
    }
    
    // Handle hex format
    const hex = ImageHelpers.hexToRgb(colorStr);
    if (hex) return hex;
    
    // Default
    return { r: 0, g: 0, b: 0 };
  }
  
  /**
   * Generate transition animation between two frames
   * @param {PXSFrame} frameA - Start frame
   * @param {PXSFrame} frameB - End frame
   * @param {number} steps - Number of transition frames
   * @param {Object} [options] - Options
   * @returns {PXSAnimation} Transition animation
   */
  static generateTransition(frameA, frameB, steps, options = {}) {
    const frames = [frameA];
    
    for (let i = 1; i < steps - 1; i++) {
      const t = i / (steps - 1);
      frames.push(this.interpolateFrames(frameA, frameB, t));
    }
    
    frames.push(frameB);
    
    return this.createAnimation(frames, options);
  }
  
  /**
   * Reverse animation
   * @param {PXSAnimation} animation - Animation to reverse
   * @returns {PXSAnimation} Reversed animation
   */
  static reverse(animation) {
    return {
      fps: animation.fps,
      frames: [...animation.frames].reverse(),
      metadata: {
        ...animation.metadata,
        timestamp: Date.now()
      }
    };
  }
  
  /**
   * Concatenate multiple animations
   * @param {PXSAnimation[]} animations - Animations to concatenate
   * @param {Object} [options] - Options
   * @returns {PXSAnimation} Combined animation
   */
  static concatenate(animations, options = {}) {
    const frames = [];
    for (const anim of animations) {
      frames.push(...anim.frames);
    }
    return this.createAnimation(frames, {
      fps: options.fps || animations[0]?.fps || this.DEFAULT_FPS,
      ...options
    });
  }
  
  /**
   * Change animation playback speed
   * @param {PXSAnimation} animation - Animation object
   * @param {number} speed - Speed multiplier (2 = 2x faster)
   * @returns {PXSAnimation} Modified animation
   */
  static setSpeed(animation, speed) {
    animation.fps = animation.fps * speed;
    animation.metadata.duration = (animation.frames.length / animation.fps) * 1000;
    return animation;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.AnimationHelpers = AnimationHelpers;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationHelpers;
}
export { AnimationHelpers };
