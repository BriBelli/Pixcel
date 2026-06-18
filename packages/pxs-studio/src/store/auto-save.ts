// Auto-Save System - Figma-style automatic persistence
// Saves work automatically to prevent data loss
// Uses IndexedDB for large grids, localStorage for small grids

import { usePXSStore, type PXSCell } from './pxs-store';
import historyManager from './history-manager';

export interface SavedProject {
  id: string;
  name: string;
  timestamp: number;
  grid: {
    cols: number;
    rows: number;
    cells: PXSCell[];
  };
  animation?: {
    frames: Array<{ cols: number; rows: number; cells: PXSCell[] }>;
    fps: number;
    loop: boolean;
  };
  metadata: {
    version: string;
    createdAt: number;
    lastModified: number;
    cellCount: number;
    compressed?: boolean;
  };
}

// Compressed format for large grids - stores only colors in order
export interface CompressedProject {
  id: string;
  name: string;
  timestamp: number;
  cols: number;
  rows: number;
  colors: string; // Comma-separated colors in row-major order
  metadata: {
    version: string;
    createdAt: number;
    lastModified: number;
    cellCount: number;
    compressed: true;
  };
}

export interface AutoSaveConfig {
  enabled: boolean;
  intervalMs: number;
  maxBackups: number;
  storageKey: string;
  localStorageThreshold: number; // Max cells for localStorage (default: 5000)
}

const DEFAULT_CONFIG: AutoSaveConfig = {
  enabled: true,
  intervalMs: 30000, // 30 seconds
  maxBackups: 3, // Reduced from 5 to save space
  storageKey: 'pxs-autosave',
  localStorageThreshold: 5000, // Use IndexedDB for grids larger than this
};

const DB_NAME = 'pxs-studio';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

class AutoSaveManager {
  private config: AutoSaveConfig = DEFAULT_CONFIG;
  private intervalId: NodeJS.Timeout | null = null;
  private lastSaveTimestamp: number = 0;
  private listeners: Set<(timestamp: number) => void> = new Set();
  private isInitialized: boolean = false;
  private db: IDBDatabase | null = null;

  constructor() {
    // Load config from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const savedConfig = localStorage.getItem('pxs-autosave-config');
        if (savedConfig) {
          this.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
        }
      } catch (e) {
        console.warn('Failed to load auto-save config:', e);
      }
    }
  }

  // Initialize IndexedDB
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  // Initialize auto-save (call once when app loads)
  async init(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.isInitialized = true;
    
    // Initialize IndexedDB
    try {
      await this.initDB();
    } catch (e) {
      console.warn('IndexedDB not available, using localStorage only');
    }
    
    // Load last saved project
    await this.loadLastProject();
    
    // Start auto-save interval if enabled
    if (this.config.enabled) {
      this.start();
    }

    // Save on page unload (sync only for small grids)
    window.addEventListener('beforeunload', () => {
      const state = usePXSStore.getState();
      const cellCount = state.grid.cells.size;
      if (cellCount <= this.config.localStorageThreshold) {
        this.saveToLocalStorageSync();
      }
    });

    console.log('✅ Auto-save initialized');
  }

  // Start auto-save interval
  start(): void {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      if (historyManager.hasUnsavedChanges()) {
        this.saveNow();
      }
    }, this.config.intervalMs);

    console.log(`🔄 Auto-save started (every ${this.config.intervalMs / 1000}s)`);
  }

  // Stop auto-save interval
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏹ Auto-save stopped');
  }

  // Compress cells for storage
  private compressCells(cells: PXSCell[], cols: number, rows: number): string {
    // Create a sorted array of colors in row-major order
    const colorGrid: string[] = new Array(cols * rows).fill('#0d1117');
    for (const cell of cells) {
      const idx = cell.y * cols + cell.x;
      colorGrid[idx] = cell.color;
    }
    return colorGrid.join(',');
  }

  // Decompress cells from storage
  private decompressCells(colors: string, cols: number, rows: number): PXSCell[] {
    const colorArray = colors.split(',');
    const cells: PXSCell[] = [];
    for (let i = 0; i < colorArray.length; i++) {
      const x = i % cols;
      const y = Math.floor(i / cols);
      cells.push({
        x,
        y,
        color: colorArray[i] || '#0d1117',
        opacity: 1,
      });
    }
    return cells;
  }

  // Sync save to localStorage (for beforeunload)
  private saveToLocalStorageSync(): void {
    try {
      const state = usePXSStore.getState();
      const cells = Array.from(state.grid.cells.values());
      const { cols, rows } = state.grid;

      // Use compressed format
      const compressed: CompressedProject = {
        id: 'current',
        name: 'Untitled Project',
        timestamp: Date.now(),
        cols,
        rows,
        colors: this.compressCells(cells, cols, rows),
        metadata: {
          version: '4.0.0',
          createdAt: this.lastSaveTimestamp || Date.now(),
          lastModified: Date.now(),
          cellCount: cells.length,
          compressed: true,
        },
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(compressed));
    } catch (e) {
      // Silent fail for beforeunload
    }
  }

  // Save current state immediately
  async saveNow(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const state = usePXSStore.getState();
      const cells = Array.from(state.grid.cells.values());
      const cellCount = cells.length;
      const { cols, rows } = state.grid;

      // For large grids, use IndexedDB
      if (cellCount > this.config.localStorageThreshold && this.db) {
        await this.saveToIndexedDB(cells, cols, rows);
      } else {
        // For small grids, use localStorage with compression
        this.saveToLocalStorage(cells, cols, rows);
      }

      // Mark as saved in history
      historyManager.markSaved();
      
      this.lastSaveTimestamp = Date.now();
      this.notifyListeners(this.lastSaveTimestamp);

      console.log('💾 Auto-saved at', new Date(this.lastSaveTimestamp).toLocaleTimeString());
      return true;
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      return false;
    }
  }

  // Save to localStorage (for small grids)
  private saveToLocalStorage(cells: PXSCell[], cols: number, rows: number): void {
    const compressed: CompressedProject = {
      id: 'current',
      name: 'Untitled Project',
      timestamp: Date.now(),
      cols,
      rows,
      colors: this.compressCells(cells, cols, rows),
      metadata: {
        version: '4.0.0',
        createdAt: this.lastSaveTimestamp || Date.now(),
        lastModified: Date.now(),
        cellCount: cells.length,
        compressed: true,
      },
    };

    localStorage.setItem(this.config.storageKey, JSON.stringify(compressed));
  }

  // Save to IndexedDB (for large grids)
  private async saveToIndexedDB(cells: PXSCell[], cols: number, rows: number): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) throw new Error('IndexedDB not available');

    const project: SavedProject = {
      id: 'current',
      name: 'Untitled Project',
      timestamp: Date.now(),
      grid: { cols, rows, cells },
      metadata: {
        version: '4.0.0',
        createdAt: this.lastSaveTimestamp || Date.now(),
        lastModified: Date.now(),
        cellCount: cells.length,
      },
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(project);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save backup (keeps multiple versions) - only for small grids
  private saveBackup(project: CompressedProject): void {
    // Skip backups for large grids to save space
    if (project.metadata.cellCount > this.config.localStorageThreshold) return;

    try {
      const backupsKey = `${this.config.storageKey}-backups`;
      const backupsJson = localStorage.getItem(backupsKey);
      let backups: CompressedProject[] = backupsJson ? JSON.parse(backupsJson) : [];

      // Add new backup
      backups.unshift(project);

      // Keep only maxBackups
      if (backups.length > this.config.maxBackups) {
        backups = backups.slice(0, this.config.maxBackups);
      }

      localStorage.setItem(backupsKey, JSON.stringify(backups));
    } catch (error) {
      console.warn('Failed to save backup:', error);
    }
  }

  // Load the last saved project
  async loadLastProject(): Promise<SavedProject | null> {
    if (typeof window === 'undefined') return null;

    try {
      // First try IndexedDB (for large projects)
      const idbProject = await this.loadFromIndexedDB();
      if (idbProject) {
        this.applyProject(idbProject);
        console.log('📂 Loaded last project from IndexedDB', new Date(idbProject.timestamp).toLocaleTimeString());
        return idbProject;
      }

      // Then try localStorage
      const json = localStorage.getItem(this.config.storageKey);
      if (!json) return null;

      const data = JSON.parse(json);
      
      // Check if it's compressed format
      if ('colors' in data && data.metadata?.compressed) {
        const compressed = data as CompressedProject;
        const cells = this.decompressCells(compressed.colors, compressed.cols, compressed.rows);
        const project: SavedProject = {
          id: compressed.id,
          name: compressed.name,
          timestamp: compressed.timestamp,
          grid: {
            cols: compressed.cols,
            rows: compressed.rows,
            cells,
          },
          metadata: {
            ...compressed.metadata,
            compressed: false,
          },
        };
        this.applyProject(project);
        console.log('📂 Loaded last project from', new Date(project.timestamp).toLocaleTimeString());
        return project;
      } else {
        // Old uncompressed format
        const project = data as SavedProject;
        this.applyProject(project);
        console.log('📂 Loaded last project from', new Date(project.timestamp).toLocaleTimeString());
        return project;
      }
    } catch (error) {
      console.warn('Failed to load last project:', error);
      return null;
    }
  }

  // Load from IndexedDB
  private async loadFromIndexedDB(): Promise<SavedProject | null> {
    if (!this.db) {
      try {
        await this.initDB();
      } catch {
        return null;
      }
    }
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current');

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  }

  // Get all backups
  getBackups(): CompressedProject[] {
    if (typeof window === 'undefined') return [];

    try {
      const backupsJson = localStorage.getItem(`${this.config.storageKey}-backups`);
      return backupsJson ? JSON.parse(backupsJson) : [];
    } catch (error) {
      console.warn('Failed to load backups:', error);
      return [];
    }
  }

  // Load a specific backup
  loadBackup(index: number): SavedProject | null {
    const backups = this.getBackups();
    if (index < 0 || index >= backups.length) return null;

    const compressed = backups[index];
    const cells = this.decompressCells(compressed.colors, compressed.cols, compressed.rows);
    const project: SavedProject = {
      id: compressed.id,
      name: compressed.name,
      timestamp: compressed.timestamp,
      grid: {
        cols: compressed.cols,
        rows: compressed.rows,
        cells,
      },
      metadata: {
        ...compressed.metadata,
        compressed: false,
      },
    };
    this.applyProject(project);
    return project;
  }

  // Apply a project to the store
  private applyProject(project: SavedProject): void {
    const cellsMap = new Map<string, PXSCell>();
    project.grid.cells.forEach((cell) => {
      cellsMap.set(`${cell.x}-${cell.y}`, cell);
    });

    usePXSStore.setState((state) => ({
      grid: {
        ...state.grid,
        cols: project.grid.cols,
        rows: project.grid.rows,
        cells: cellsMap,
      },
    }));

    // Push to history (but don't create duplicate for load)
    historyManager.push('load', 'Loaded project', project.grid);
    historyManager.markSaved();
  }

  // Clear all saved data
  clearAll(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(this.config.storageKey);
    localStorage.removeItem(`${this.config.storageKey}-backups`);
    console.log('🗑 Cleared all saved data');
  }

  // Get/set config
  getConfig(): AutoSaveConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...config };

    // Save config
    if (typeof window !== 'undefined') {
      localStorage.setItem('pxs-autosave-config', JSON.stringify(this.config));
    }

    // Restart interval if needed
    if (this.intervalId) {
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    }
  }

  // Get last save timestamp
  getLastSaveTimestamp(): number {
    return this.lastSaveTimestamp;
  }

  // Get time since last save in seconds
  getTimeSinceLastSave(): number {
    if (this.lastSaveTimestamp === 0) return 0;
    return Math.floor((Date.now() - this.lastSaveTimestamp) / 1000);
  }

  // Subscribe to save events
  subscribe(listener: (timestamp: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(timestamp: number): void {
    this.listeners.forEach((listener) => listener(timestamp));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export project as JSON
  exportProject(): string {
    const state = usePXSStore.getState();
    const cells = Array.from(state.grid.cells.values());

    const project: SavedProject = {
      id: this.generateId(),
      name: 'Exported Project',
      timestamp: Date.now(),
      grid: {
        cols: state.grid.cols,
        rows: state.grid.rows,
        cells,
      },
      metadata: {
        version: '4.0.0',
        createdAt: Date.now(),
        lastModified: Date.now(),
        cellCount: cells.length,
      },
    };

    return JSON.stringify(project, null, 2);
  }

  // Import project from JSON
  importProject(json: string): boolean {
    try {
      const project: SavedProject = JSON.parse(json);
      this.applyProject(project);
      return true;
    } catch (error) {
      console.error('Failed to import project:', error);
      return false;
    }
  }
}

// Singleton instance
export const autoSaveManager = new AutoSaveManager();

export default autoSaveManager;
