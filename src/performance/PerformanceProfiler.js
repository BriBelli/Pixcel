/**
 * PerformanceProfiler - Real-time Performance Monitoring
 * 
 * Tracks FPS, frame time, memory usage, and other performance metrics.
 * Essential for optimization and establishing Phase 3 baselines.
 * 
 * @class PerformanceProfiler
 */
class PerformanceProfiler {
    /**
     * Create a PerformanceProfiler
     * @param {CellAnimator} animator - The CellAnimator instance
     */
    constructor(animator) {
        this.animator = animator;
        
        // Validate animator has required methods
        if (!animator || typeof animator._emit !== 'function') {
            console.error('[PerformanceProfiler] Invalid animator passed to constructor!', {
                animator: animator,
                hasEmit: animator && typeof animator._emit,
                animatorKeys: animator && Object.keys(animator)
            });
            throw new Error('PerformanceProfiler requires a valid CellAnimator instance with _emit method');
        }
        
        // Current metrics
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            memoryLimit: 0,
            cellCount: 0,
            visibleCells: 0,
            renderTime: 0,
            updateTime: 0,
            animationCount: 0
        };
        
        // History tracking
        this.history = [];
        this.maxHistoryLength = 300; // 5 seconds at 60fps
        
        // Frame timing
        this.frameStartTime = 0;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        
        // FPS calculation
        this.fpsUpdateInterval = 1000; // Update FPS every 1 second
        this.lastFpsUpdate = 0;
        this.framesSinceLastUpdate = 0;
        
        // Profiling state
        this.enabled = false;
        this.rafId = null;
        
        // Performance marks
        this.marks = new Map();
        
        console.log('[PerformanceProfiler] Created');
    }
    
    /**
     * Enable performance profiling
     * Starts continuous monitoring
     */
    enable() {
        if (this.enabled) {
            return;
        }
        
        this.enabled = true;
        this.lastFpsUpdate = performance.now();
        this.startMonitoring();
        
        console.log('[PerformanceProfiler] Enabled');
    }
    
    /**
     * Disable performance profiling
     * Stops monitoring
     */
    disable() {
        if (!this.enabled) {
            return;
        }
        
        this.enabled = false;
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        console.log('[PerformanceProfiler] Disabled');
    }
    
    /**
     * Start continuous monitoring loop
     * @private
     */
    startMonitoring() {
        const monitor = (timestamp) => {
            if (!this.enabled) {
                return;
            }
            
            this.updateMetrics(timestamp);
            this.rafId = requestAnimationFrame(monitor);
        };
        
        this.rafId = requestAnimationFrame(monitor);
    }
    
    /**
     * Update all performance metrics
     * @private
     */
    updateMetrics(timestamp) {
        // Calculate frame time
        if (this.lastFrameTime > 0) {
            const frameTime = timestamp - this.lastFrameTime;
            this.metrics.frameTime = frameTime;
        }
        this.lastFrameTime = timestamp;
        
        // Update FPS
        this.framesSinceLastUpdate++;
        const timeSinceLastFpsUpdate = timestamp - this.lastFpsUpdate;
        
        if (timeSinceLastFpsUpdate >= this.fpsUpdateInterval) {
            this.metrics.fps = (this.framesSinceLastUpdate / timeSinceLastFpsUpdate) * 1000;
            this.framesSinceLastUpdate = 0;
            this.lastFpsUpdate = timestamp;
        }
        
        // Update memory usage (if available)
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
            this.metrics.memoryLimit = performance.memory.jsHeapSizeLimit;
        }
        
        // Update cell counts
        const state = this.animator.state;
        this.metrics.cellCount = state.totalCells;
        
        // Update visible cells (if viewport manager available)
        if (this.animator.viewportManager) {
            const stats = this.animator.viewportManager.getStats();
            this.metrics.visibleCells = stats.visibleCells;
        } else {
            this.metrics.visibleCells = state.totalCells;
        }
        
        // Update animation count
        if (this.animator.activeAnimations) {
            this.metrics.animationCount = this.animator.activeAnimations.size;
        }
        
        // Add to history
        this.addToHistory(timestamp);
        
        // Emit performance update event
        if (this.animator && typeof this.animator._emit === 'function') {
            this.animator._emit('performanceUpdate', this.getMetrics());
        } else {
            console.error('[PerformanceProfiler] Cannot emit event: animator._emit is not available', {
                hasAnimator: !!this.animator,
                animatorType: typeof this.animator,
                hasEmit: this.animator && typeof this.animator._emit,
                emitType: this.animator && typeof this.animator._emit
            });
        }
    }
    
    /**
     * Add current metrics to history
     * @private
     */
    addToHistory(timestamp) {
        const snapshot = {
            timestamp: timestamp,
            ...this.metrics
        };
        
        this.history.push(snapshot);
        
        // Limit history size
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }
    }
    
    /**
     * Start timing a specific operation
     * 
     * @param {string} label - Operation label
     */
    startMark(label) {
        this.marks.set(label, performance.now());
    }
    
    /**
     * End timing an operation and return duration
     * 
     * @param {string} label - Operation label
     * @returns {number} Duration in milliseconds
     */
    endMark(label) {
        const startTime = this.marks.get(label);
        if (startTime === undefined) {
            console.warn(`[PerformanceProfiler] No mark found for: ${label}`);
            return 0;
        }
        
        const duration = performance.now() - startTime;
        this.marks.delete(label);
        
        return duration;
    }
    
    /**
     * Measure an operation with automatic timing
     * 
     * @param {string} label - Operation label
     * @param {Function} fn - Function to measure
     * @returns {*} Return value of fn
     */
    measure(label, fn) {
        this.startMark(label);
        const result = fn();
        const duration = this.endMark(label);
        
        console.log(`[PerformanceProfiler] ${label}: ${duration.toFixed(2)}ms`);
        
        return result;
    }
    
    /**
     * Measure an async operation
     * 
     * @param {string} label - Operation label
     * @param {Function} fn - Async function to measure
     * @returns {Promise<*>} Promise resolving to fn result
     */
    async measureAsync(label, fn) {
        this.startMark(label);
        const result = await fn();
        const duration = this.endMark(label);
        
        console.log(`[PerformanceProfiler] ${label}: ${duration.toFixed(2)}ms`);
        
        return result;
    }
    
    /**
     * Get current performance metrics
     * 
     * @returns {Object} Current metrics
     */
    getMetrics() {
        return {...this.metrics};
    }
    
    /**
     * Get performance history
     * 
     * @param {number} count - Number of recent entries (optional)
     * @returns {Array} History entries
     */
    getHistory(count = null) {
        if (count === null) {
            return [...this.history];
        }
        
        return this.history.slice(-count);
    }
    
    /**
     * Calculate average metrics over history
     * 
     * @param {number} sampleSize - Number of recent samples (optional)
     * @returns {Object} Average metrics
     */
    getAverages(sampleSize = null) {
        const samples = sampleSize ? this.history.slice(-sampleSize) : this.history;
        
        if (samples.length === 0) {
            return {...this.metrics};
        }
        
        const averages = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            renderTime: 0,
            updateTime: 0
        };
        
        for (const sample of samples) {
            averages.fps += sample.fps;
            averages.frameTime += sample.frameTime;
            averages.memoryUsage += sample.memoryUsage;
            averages.renderTime += sample.renderTime;
            averages.updateTime += sample.updateTime;
        }
        
        const count = samples.length;
        averages.fps /= count;
        averages.frameTime /= count;
        averages.memoryUsage /= count;
        averages.renderTime /= count;
        averages.updateTime /= count;
        
        return averages;
    }
    
    /**
     * Get comprehensive performance report
     * 
     * @returns {Object} Performance report
     */
    getReport() {
        return {
            current: this.getMetrics(),
            averages: this.getAverages(60), // Last 1 second at 60fps
            history: this.getHistory(60),
            enabled: this.enabled,
            historyLength: this.history.length
        };
    }
    
    /**
     * Get memory usage in human-readable format
     * 
     * @returns {Object} Memory info
     */
    getMemoryInfo() {
        if (!performance.memory) {
            return {
                supported: false,
                message: 'Memory API not available'
            };
        }
        
        const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);
        
        return {
            supported: true,
            used: toMB(this.metrics.memoryUsage) + ' MB',
            limit: toMB(this.metrics.memoryLimit) + ' MB',
            usedBytes: this.metrics.memoryUsage,
            limitBytes: this.metrics.memoryLimit,
            percentage: ((this.metrics.memoryUsage / this.metrics.memoryLimit) * 100).toFixed(1) + '%'
        };
    }
    
    /**
     * Check if performance is good
     * 
     * @returns {Object} Performance assessment
     */
    assessPerformance() {
        const assessment = {
            fps: {
                value: this.metrics.fps,
                status: 'good',
                message: ''
            },
            frameTime: {
                value: this.metrics.frameTime,
                status: 'good',
                message: ''
            },
            memory: {
                value: this.metrics.memoryUsage,
                status: 'good',
                message: ''
            },
            overall: 'good'
        };
        
        // Assess FPS
        if (this.metrics.fps < 30) {
            assessment.fps.status = 'poor';
            assessment.fps.message = 'FPS below 30, performance issues likely';
            assessment.overall = 'poor';
        } else if (this.metrics.fps < 50) {
            assessment.fps.status = 'fair';
            assessment.fps.message = 'FPS below 50, some stuttering possible';
            if (assessment.overall === 'good') {
                assessment.overall = 'fair';
            }
        } else {
            assessment.fps.message = 'FPS good (50+)';
        }
        
        // Assess frame time
        if (this.metrics.frameTime > 33) {
            assessment.frameTime.status = 'poor';
            assessment.frameTime.message = 'Frame time > 33ms, below 30fps';
            assessment.overall = 'poor';
        } else if (this.metrics.frameTime > 16.67) {
            assessment.frameTime.status = 'fair';
            assessment.frameTime.message = 'Frame time > 16.67ms, below 60fps';
            if (assessment.overall === 'good') {
                assessment.overall = 'fair';
            }
        } else {
            assessment.frameTime.message = 'Frame time good (<16.67ms)';
        }
        
        // Assess memory
        if (performance.memory) {
            const memoryPercent = (this.metrics.memoryUsage / this.metrics.memoryLimit) * 100;
            
            if (memoryPercent > 90) {
                assessment.memory.status = 'poor';
                assessment.memory.message = 'Memory usage > 90%, risk of crash';
                assessment.overall = 'poor';
            } else if (memoryPercent > 75) {
                assessment.memory.status = 'fair';
                assessment.memory.message = 'Memory usage > 75%, getting high';
                if (assessment.overall === 'good') {
                    assessment.overall = 'fair';
                }
            } else {
                assessment.memory.message = 'Memory usage good (<75%)';
            }
        }
        
        return assessment;
    }
    
    /**
     * Reset history and counters
     */
    reset() {
        this.history = [];
        this.frameCount = 0;
        this.framesSinceLastUpdate = 0;
        this.lastFpsUpdate = performance.now();
        this.marks.clear();
        
        console.log('[PerformanceProfiler] Reset');
    }
    
    /**
     * Destroy profiler
     * Clean up resources
     */
    destroy() {
        this.disable();
        this.history = [];
        this.marks.clear();
        
        console.log('[PerformanceProfiler] Destroyed');
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceProfiler;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.PerformanceProfiler = PerformanceProfiler;
}
