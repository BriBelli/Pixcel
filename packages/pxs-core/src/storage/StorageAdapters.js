/**
 * PXS Storage Adapters - Storage layer for frames and animations
 * 
 * Provides multiple storage backends:
 * - LocalStorage: Fast, limited size (~5MB)
 * - IndexedDB: Large storage, async
 * - Memory: In-memory cache for performance
 * - API: Remote storage via fetch
 * 
 * @example
 * // Use localStorage
 * await PXSStorage.local.save('my-image', frameData);
 * const frame = await PXSStorage.local.load('my-image');
 * 
 * // Use IndexedDB for large data
 * await PXSStorage.indexedDB.save('animation-1', animationData);
 * 
 * // Use memory cache for performance
 * PXSStorage.memory.save('frame-cache', frameData);
 */

const PXSStorage = {
  /**
   * LocalStorage adapter (sync, ~5MB limit)
   */
  local: {
    prefix: 'pxs_',
    
    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {PXSFrame|PXSAnimation} data - Data to save
     * @param {Object} [options] - Options
     * @returns {Promise<void>}
     */
    async save(key, data, options = {}) {
      const { compress = true } = options;
      
      let toStore = data;
      
      if (compress) {
        if (data.frames) {
          // Animation
          toStore = AnimationHelpers.compressAnimation(data);
        } else if (data.cells) {
          // Frame
          toStore = ImageHelpers.compressFrame(data);
        }
      }
      
      try {
        localStorage.setItem(this.prefix + key, JSON.stringify(toStore));
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          console.error('PXSStorage: localStorage quota exceeded');
          throw new Error('Storage quota exceeded');
        }
        throw e;
      }
    },
    
    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @returns {Promise<PXSFrame|PXSAnimation|null>}
     */
    async load(key) {
      const raw = localStorage.getItem(this.prefix + key);
      if (!raw) return null;
      
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.error('PXSStorage: Invalid JSON in localStorage');
        return null;
      }
      
      // Detect and decompress
      if (data.c && data.r && data.d) {
        // Compressed frame
        return ImageHelpers.decompressFrame(data);
      } else if (data.frames && data.frames[0]?.c) {
        // Compressed animation
        return AnimationHelpers.decompressAnimation(data);
      }
      
      return data;
    },
    
    /**
     * Delete data from localStorage
     * @param {string} key - Storage key
     * @returns {Promise<void>}
     */
    async delete(key) {
      localStorage.removeItem(this.prefix + key);
    },
    
    /**
     * List all PXS keys in localStorage
     * @returns {Promise<string[]>}
     */
    async list() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    },
    
    /**
     * Clear all PXS data from localStorage
     * @returns {Promise<void>}
     */
    async clear() {
      const keys = await this.list();
      for (const key of keys) {
        await this.delete(key);
      }
    }
  },
  
  /**
   * IndexedDB adapter (async, large storage)
   */
  indexedDB: {
    dbName: 'pxs_storage',
    dbVersion: 1,
    storeName: 'frames',
    _db: null,
    
    /**
     * Open/get database connection
     * @private
     */
    async _getDB() {
      if (this._db) return this._db;
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
          this._db = request.result;
          resolve(this._db);
        };
        
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'key' });
          }
        };
      });
    },
    
    /**
     * Save data to IndexedDB
     * @param {string} key - Storage key
     * @param {PXSFrame|PXSAnimation} data - Data to save
     * @param {Object} [options] - Options
     * @returns {Promise<void>}
     */
    async save(key, data, options = {}) {
      const { compress = true } = options;
      const db = await this._getDB();
      
      let toStore = data;
      
      if (compress) {
        if (data.frames) {
          toStore = AnimationHelpers.compressAnimation(data);
        } else if (data.cells) {
          toStore = ImageHelpers.compressFrame(data);
        }
      }
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        
        const record = {
          key,
          data: toStore,
          timestamp: Date.now()
        };
        
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    
    /**
     * Load data from IndexedDB
     * @param {string} key - Storage key
     * @returns {Promise<PXSFrame|PXSAnimation|null>}
     */
    async load(key) {
      const db = await this._getDB();
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get(key);
        
        request.onsuccess = () => {
          if (!request.result) {
            resolve(null);
            return;
          }
          
          let data = request.result.data;
          
          // Detect and decompress
          if (data.c && data.r && data.d) {
            data = ImageHelpers.decompressFrame(data);
          } else if (data.frames && data.frames[0]?.c) {
            data = AnimationHelpers.decompressAnimation(data);
          }
          
          resolve(data);
        };
        
        request.onerror = () => reject(request.error);
      });
    },
    
    /**
     * Delete data from IndexedDB
     * @param {string} key - Storage key
     * @returns {Promise<void>}
     */
    async delete(key) {
      const db = await this._getDB();
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    
    /**
     * List all keys in IndexedDB
     * @returns {Promise<string[]>}
     */
    async list() {
      const db = await this._getDB();
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.getAllKeys();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    
    /**
     * Clear all data from IndexedDB
     * @returns {Promise<void>}
     */
    async clear() {
      const db = await this._getDB();
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  },
  
  /**
   * In-memory cache adapter (fastest, no persistence)
   */
  memory: {
    _cache: new Map(),
    
    /**
     * Save to memory
     */
    async save(key, data) {
      this._cache.set(key, {
        data,
        timestamp: Date.now()
      });
    },
    
    /**
     * Load from memory
     */
    async load(key) {
      const entry = this._cache.get(key);
      return entry ? entry.data : null;
    },
    
    /**
     * Delete from memory
     */
    async delete(key) {
      this._cache.delete(key);
    },
    
    /**
     * List all keys
     */
    async list() {
      return Array.from(this._cache.keys());
    },
    
    /**
     * Clear cache
     */
    async clear() {
      this._cache.clear();
    },
    
    /**
     * Get cache size
     */
    size() {
      return this._cache.size;
    }
  },
  
  /**
   * API adapter (remote storage via HTTP)
   */
  api: {
    baseUrl: '',
    headers: {},
    
    /**
     * Configure API adapter
     * @param {Object} config - Configuration
     */
    configure(config) {
      this.baseUrl = config.baseUrl || '';
      this.headers = config.headers || {};
    },
    
    /**
     * Save to remote API
     * @param {string} key - Storage key
     * @param {PXSFrame|PXSAnimation} data - Data to save
     * @param {Object} [options] - Options
     */
    async save(key, data, options = {}) {
      const { compress = true } = options;
      
      let toStore = data;
      
      if (compress) {
        if (data.frames) {
          toStore = AnimationHelpers.compressAnimation(data);
        } else if (data.cells) {
          toStore = ImageHelpers.compressFrame(data);
        }
      }
      
      const response = await fetch(`${this.baseUrl}/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify(toStore)
      });
      
      if (!response.ok) {
        throw new Error(`API save failed: ${response.status}`);
      }
    },
    
    /**
     * Load from remote API
     * @param {string} key - Storage key
     */
    async load(key) {
      const response = await fetch(`${this.baseUrl}/${key}`, {
        headers: this.headers
      });
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`API load failed: ${response.status}`);
      }
      
      let data = await response.json();
      
      // Detect and decompress
      if (data.c && data.r && data.d) {
        data = ImageHelpers.decompressFrame(data);
      } else if (data.frames && data.frames[0]?.c) {
        data = AnimationHelpers.decompressAnimation(data);
      }
      
      return data;
    },
    
    /**
     * Delete from remote API
     */
    async delete(key) {
      const response = await fetch(`${this.baseUrl}/${key}`, {
        method: 'DELETE',
        headers: this.headers
      });
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`API delete failed: ${response.status}`);
      }
    },
    
    /**
     * List all keys from remote API
     */
    async list() {
      const response = await fetch(`${this.baseUrl}`, {
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`API list failed: ${response.status}`);
      }
      
      return await response.json();
    }
  },
  
  /**
   * Chunked storage for large animations
   * Stores frames individually for better loading performance
   */
  chunked: {
    adapter: null,
    
    /**
     * Configure chunked storage with a base adapter
     * @param {Object} adapter - Base storage adapter (local, indexedDB, api)
     */
    use(adapter) {
      this.adapter = adapter;
    },
    
    /**
     * Save animation with chunked frame storage
     * @param {string} key - Base key
     * @param {PXSAnimation} animation - Animation to save
     * @param {Object} [options] - Options
     */
    async save(key, animation, options = {}) {
      if (!this.adapter) {
        throw new Error('Chunked storage: No adapter configured');
      }
      
      const { chunkSize = 10 } = options;
      
      // Save metadata
      const metadata = {
        type: 'animation',
        fps: animation.fps,
        frameCount: animation.frames.length,
        cols: animation.frames[0]?.cols,
        rows: animation.frames[0]?.rows,
        metadata: animation.metadata,
        chunkSize
      };
      
      await this.adapter.save(`${key}_meta`, metadata);
      
      // Save frames in chunks
      const numChunks = Math.ceil(animation.frames.length / chunkSize);
      
      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, animation.frames.length);
        const chunk = animation.frames.slice(start, end);
        
        await this.adapter.save(`${key}_chunk_${i}`, chunk, options);
      }
    },
    
    /**
     * Load animation with chunked loading
     * @param {string} key - Base key
     * @param {Object} [options] - Options
     */
    async load(key, options = {}) {
      if (!this.adapter) {
        throw new Error('Chunked storage: No adapter configured');
      }
      
      // Load metadata
      const metadata = await this.adapter.load(`${key}_meta`);
      if (!metadata) return null;
      
      // Load all chunks
      const frames = [];
      const numChunks = Math.ceil(metadata.frameCount / metadata.chunkSize);
      
      for (let i = 0; i < numChunks; i++) {
        const chunk = await this.adapter.load(`${key}_chunk_${i}`);
        if (chunk) {
          frames.push(...chunk);
        }
      }
      
      return {
        fps: metadata.fps,
        frames,
        metadata: metadata.metadata
      };
    },
    
    /**
     * Load specific frame range (for lazy loading)
     * @param {string} key - Base key
     * @param {number} startFrame - Start frame index
     * @param {number} count - Number of frames to load
     */
    async loadRange(key, startFrame, count) {
      if (!this.adapter) {
        throw new Error('Chunked storage: No adapter configured');
      }
      
      const metadata = await this.adapter.load(`${key}_meta`);
      if (!metadata) return null;
      
      const { chunkSize } = metadata;
      const startChunk = Math.floor(startFrame / chunkSize);
      const endChunk = Math.floor((startFrame + count - 1) / chunkSize);
      
      const frames = [];
      
      for (let i = startChunk; i <= endChunk; i++) {
        const chunk = await this.adapter.load(`${key}_chunk_${i}`);
        if (chunk) {
          frames.push(...chunk);
        }
      }
      
      // Trim to exact range
      const startOffset = startFrame % chunkSize;
      return frames.slice(startOffset, startOffset + count);
    },
    
    /**
     * Delete chunked animation
     */
    async delete(key) {
      if (!this.adapter) return;
      
      const metadata = await this.adapter.load(`${key}_meta`);
      if (!metadata) return;
      
      const numChunks = Math.ceil(metadata.frameCount / metadata.chunkSize);
      
      for (let i = 0; i < numChunks; i++) {
        await this.adapter.delete(`${key}_chunk_${i}`);
      }
      
      await this.adapter.delete(`${key}_meta`);
    }
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.PXSStorage = PXSStorage;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PXSStorage;
}
export { PXSStorage };
