/**
 * FrameDeck - Visual animation timeline component
 * 
 * Designed to integrate seamlessly into PXS Studio IDE layout.
 * Renders as a horizontal timeline strip at the bottom of the canvas area.
 * 
 * @version 3.0
 */

class FrameDeck {
  /**
   * Create a new FrameDeck instance
   * @param {Object} config - Configuration object
   * @param {HTMLElement} config.container - Container element
   * @param {CellAnimator} config.animator - Associated CellAnimator instance
   * @param {Function} config.onFrameSelect - Callback when frame is selected
   * @param {Function} config.onFrameReorder - Callback when frames are reordered
   */
  constructor(config) {
    if (!config.container) {
      throw new Error('FrameDeck: container is required');
    }
    if (!config.animator) {
      throw new Error('FrameDeck: animator is required');
    }

    this.container = config.container;
    this.animator = config.animator;
    this.onFrameSelect = config.onFrameSelect || (() => {});
    this.onFrameReorder = config.onFrameReorder || (() => {});

    // State
    this.animation = null;
    this.currentFrameIndex = 0;
    this.selectedFrameIndex = null;
    this.isPlaying = false;
    this.playbackLoop = null;

    // Drag state
    this.draggedIndex = null;
    this.dragOverIndex = null;

    // UI elements
    this.element = null;
    this.frameTrack = null;
    this.frameCards = [];

    this._init();
  }

  /**
   * Initialize the FrameDeck UI
   * @private
   */
  _init() {
    this.container.innerHTML = '';
    
    // Create main element
    this.element = document.createElement('div');
    this.element.className = 'pxs-frame-deck';
    
    this.element.innerHTML = `
      <div class="pxs-frame-deck__header">
        <div class="pxs-frame-deck__controls">
          <button class="pxs-frame-deck__btn" data-action="play" title="Play (Space)">▶</button>
          <button class="pxs-frame-deck__btn" data-action="pause" title="Pause" disabled>⏸</button>
          <button class="pxs-frame-deck__btn" data-action="stop" title="Stop">⏹</button>
          <span class="pxs-frame-deck__divider"></span>
          <button class="pxs-frame-deck__btn" data-action="prev" title="Previous (←)">⏮</button>
          <button class="pxs-frame-deck__btn" data-action="next" title="Next (→)">⏭</button>
        </div>
        <div class="pxs-frame-deck__info">
          <span class="pxs-frame-deck__info-text">No animation</span>
        </div>
        <div class="pxs-frame-deck__actions">
          <button class="pxs-frame-deck__btn" data-action="add" title="Add Frame">+</button>
          <button class="pxs-frame-deck__btn" data-action="duplicate" title="Duplicate" disabled>⧉</button>
          <button class="pxs-frame-deck__btn pxs-frame-deck__btn--danger" data-action="delete" title="Delete" disabled>×</button>
        </div>
      </div>
      <div class="pxs-frame-deck__track-container">
        <div class="pxs-frame-deck__track"></div>
      </div>
    `;
    
    this.container.appendChild(this.element);
    
    // Get references
    this.frameTrack = this.element.querySelector('.pxs-frame-deck__track');
    this.infoText = this.element.querySelector('.pxs-frame-deck__info-text');
    
    // Add event listeners
    this.element.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this._handleAction(e.target.closest('[data-action]').dataset.action);
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._handleKeydown(e));
  }

  /**
   * Handle control actions
   * @private
   */
  _handleAction(action) {
    switch (action) {
      case 'play': this.play(); break;
      case 'pause': this.pause(); break;
      case 'stop': this.stop(); break;
      case 'prev': this.prevFrame(); break;
      case 'next': this.nextFrame(); break;
      case 'add': this.addFrame(); break;
      case 'duplicate': this.duplicateFrame(); break;
      case 'delete': this.deleteFrame(); break;
    }
  }

  /**
   * Handle keyboard shortcuts
   * @private
   */
  _handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.isPlaying ? this.pause() : this.play();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.prevFrame();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.nextFrame();
        break;
    }
  }

  /**
   * Load an animation into the deck
   * @param {PXSAnimation} animation
   */
  loadAnimation(animation) {
    if (!animation || !animation.frames || animation.frames.length === 0) {
      console.warn('FrameDeck: Invalid animation');
      return;
    }

    this.animation = animation;
    this.currentFrameIndex = 0;
    this.selectedFrameIndex = 0;
    
    // Log animation data
    console.log('📊 Animation loaded:', {
      frames: animation.frames.length,
      fps: animation.fps,
      totalCells: animation.frames[0]?.cells?.length || 0,
      data: animation
    });
    
    this._renderFrames();
    this._updateInfo();
    this._updateControls();
    
    // Auto-select first frame to render it
    this._selectFrame(0);
    this._selectFrame(0);
  }

  /**
   * Render frame cards
   * @private
   */
  _renderFrames() {
    this.frameTrack.innerHTML = '';
    this.frameCards = [];

    if (!this.animation?.frames) return;

    this.animation.frames.forEach((frame, index) => {
      const card = this._createFrameCard(frame, index);
      this.frameCards.push(card);
      this.frameTrack.appendChild(card);
    });
  }

  /**
   * Create a frame card element
   * @private
   */
  _createFrameCard(frame, index) {
    const card = document.createElement('div');
    card.className = 'pxs-frame-card';
    card.dataset.index = index;
    card.draggable = true;

    // Create mini canvas thumbnail
    const canvas = document.createElement('canvas');
    canvas.className = 'pxs-frame-card__thumb';
    canvas.width = 80;
    canvas.height = 60;
    this._renderThumbnail(canvas, frame);
    card.appendChild(canvas);

    // Frame number
    const label = document.createElement('span');
    label.className = 'pxs-frame-card__label';
    label.textContent = index + 1;
    card.appendChild(label);

    // Tooltip for hover hint
    const tooltip = document.createElement('div');
    tooltip.className = 'pxs-frame-tooltip';
    tooltip.innerHTML = `
      <div class="pxs-frame-tooltip__hint">
        <span>Double-click to inspect</span>
        <span class="pxs-frame-tooltip__kbd">dblclick</span>
      </div>
    `;
    card.appendChild(tooltip);
    card.style.position = 'relative'; // For tooltip positioning
    
    // Hover tooltip with 1s debounce
    let hoverTimeout = null;
    card.addEventListener('mouseenter', () => {
      hoverTimeout = setTimeout(() => {
        tooltip.classList.add('visible');
      }, 1000); // 1 second delay
    });
    card.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
      tooltip.classList.remove('visible');
    });

    // Event listeners
    card.addEventListener('click', () => {
      clearTimeout(hoverTimeout);
      tooltip.classList.remove('visible');
      this._selectFrame(index);
    });
    card.addEventListener('dblclick', () => {
      clearTimeout(hoverTimeout);
      tooltip.classList.remove('visible');
      // Open Editor Mode on double-click
      if (typeof Demo !== 'undefined' && Demo.openFrameEditor) {
        Demo.openFrameEditor(index);
      }
    });
    card.addEventListener('dragstart', (e) => this._onDragStart(e, index));
    card.addEventListener('dragover', (e) => this._onDragOver(e, index));
    card.addEventListener('drop', (e) => this._onDrop(e, index));
    card.addEventListener('dragend', () => this._onDragEnd());

    return card;
  }

  /**
   * Render frame thumbnail to canvas
   * @private
   */
  _renderThumbnail(canvas, frame) {
    const ctx = canvas.getContext('2d');
    const cellW = canvas.width / frame.cols;
    const cellH = canvas.height / frame.rows;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    frame.cells.forEach(cell => {
      ctx.fillStyle = cell.color;
      ctx.fillRect(cell.x * cellW, cell.y * cellH, cellW + 0.5, cellH + 0.5);
    });
  }

  /**
   * Select a frame
   * @private
   */
  _selectFrame(index) {
    if (!this.animation) return;

    this.currentFrameIndex = index;
    this.selectedFrameIndex = index;

    // Update card classes
    this.frameCards.forEach((card, i) => {
      card.classList.toggle('pxs-frame-card--active', i === index);
    });

    // Scroll into view
    if (this.frameCards[index]) {
      this.frameCards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // Render frame on animator
    if (this.animation.frames[index]) {
      this.animator.setData(this.animation.frames[index]);
    }

    this.onFrameSelect(index, this.animation.frames[index]);
    this._updateInfo();
    this._updateControls();
  }

  // Drag & drop handlers
  _onDragStart(e, index) {
    this.draggedIndex = index;
    e.target.classList.add('pxs-frame-card--dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  _onDragOver(e, index) {
    e.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      this.dragOverIndex = index;
      this.frameCards.forEach((card, i) => {
        card.classList.toggle('pxs-frame-card--drag-over', i === index);
      });
    }
  }

  _onDrop(e, index) {
    e.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      const frame = this.animation.frames.splice(this.draggedIndex, 1)[0];
      this.animation.frames.splice(index, 0, frame);
      
      this.currentFrameIndex = index;
      this._renderFrames();
      this._selectFrame(index);
      this.onFrameReorder(this.animation);
      
      console.log('🔄 Frames reordered:', this.animation);
    }
  }

  _onDragEnd() {
    this.frameCards.forEach(card => {
      card.classList.remove('pxs-frame-card--dragging', 'pxs-frame-card--drag-over');
    });
    this.draggedIndex = null;
    this.dragOverIndex = null;
  }

  // Playback controls
  play() {
    if (!this.animation || this.isPlaying) return;
    
    this.isPlaying = true;
    this._updateControls();
    
    const fps = this.animation.fps || 30;
    this.playbackLoop = setInterval(() => this.nextFrame(true), 1000 / fps);
  }

  pause() {
    this.isPlaying = false;
    clearInterval(this.playbackLoop);
    this.playbackLoop = null;
    this._updateControls();
  }

  stop() {
    this.pause();
    this._selectFrame(0);
  }

  nextFrame(autoPlay = false) {
    if (!this.animation) return;
    
    let next = this.currentFrameIndex + 1;
    if (next >= this.animation.frames.length) {
      if (this.animation.metadata?.loop) {
        next = 0;
      } else {
        if (autoPlay) this.pause();
        return;
      }
    }
    this._selectFrame(next);
  }

  prevFrame() {
    if (!this.animation) return;
    let prev = this.currentFrameIndex - 1;
    if (prev < 0) prev = this.animation.frames.length - 1;
    this._selectFrame(prev);
  }

  // Frame management
  addFrame() {
    if (!this.animation) {
      const currentFrame = this.animator.getData();
      this.animation = {
        fps: 30,
        frames: [currentFrame],
        metadata: { loop: true }
      };
      this.loadAnimation(this.animation);
      return;
    }

    const clone = JSON.parse(JSON.stringify(this.animation.frames[this.currentFrameIndex]));
    this.animation.frames.splice(this.currentFrameIndex + 1, 0, clone);
    this._renderFrames();
    this._selectFrame(this.currentFrameIndex + 1);
    console.log('➕ Frame added:', this.animation);
  }

  duplicateFrame() {
    if (!this.animation || this.selectedFrameIndex === null) return;
    const clone = JSON.parse(JSON.stringify(this.animation.frames[this.selectedFrameIndex]));
    this.animation.frames.splice(this.selectedFrameIndex + 1, 0, clone);
    this._renderFrames();
    this._selectFrame(this.selectedFrameIndex + 1);
    console.log('📋 Frame duplicated:', this.animation);
  }

  deleteFrame() {
    if (!this.animation || this.animation.frames.length <= 1) return;
    this.animation.frames.splice(this.selectedFrameIndex, 1);
    if (this.currentFrameIndex >= this.animation.frames.length) {
      this.currentFrameIndex = this.animation.frames.length - 1;
    }
    this._renderFrames();
    this._selectFrame(this.currentFrameIndex);
    console.log('🗑️ Frame deleted:', this.animation);
  }

  /**
   * Update info display
   * @private
   */
  _updateInfo() {
    if (!this.animation) {
      this.infoText.textContent = 'No animation';
      return;
    }
    
    const current = this.currentFrameIndex + 1;
    const total = this.animation.frames.length;
    const fps = this.animation.fps || 30;
    
    this.infoText.textContent = `Frame ${current}/${total} • ${fps} FPS`;
  }

  /**
   * Update control states
   * @private
   */
  _updateControls() {
    const hasAnim = this.animation?.frames?.length > 0;
    const hasSel = this.selectedFrameIndex !== null;
    
    const btns = this.element.querySelectorAll('[data-action]');
    btns.forEach(btn => {
      const action = btn.dataset.action;
      switch (action) {
        case 'play': btn.disabled = !hasAnim || this.isPlaying; break;
        case 'pause': btn.disabled = !this.isPlaying; break;
        case 'stop': btn.disabled = !hasAnim; break;
        case 'prev':
        case 'next': btn.disabled = !hasAnim; break;
        case 'duplicate': btn.disabled = !hasSel; break;
        case 'delete': btn.disabled = !hasSel || (this.animation?.frames?.length <= 1); break;
      }
    });
  }

  /**
   * Get current animation data (for export)
   */
  getAnimationData() {
    console.log('📦 Animation data:', this.animation);
    return this.animation;
  }

  /**
   * Clean up
   */
  destroy() {
    this.pause();
    this.container.innerHTML = '';
    this.frameCards = [];
    this.animation = null;
  }
}
export { FrameDeck };
