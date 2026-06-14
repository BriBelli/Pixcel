import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Types
export interface PXSCell {
  x: number;
  y: number;
  color: string;
  opacity?: number;
}

export interface PXSFrame {
  cols: number;
  rows: number;
  cells: PXSCell[];
  metadata?: Record<string, any>;
}

export interface PXSAnimation {
  fps: number;
  frames: PXSFrame[];
  metadata?: {
    name?: string;
    loop?: boolean;
    duration?: number;
  };
}

export type RendererType = 'html' | 'canvas' | 'webgl';
export type ToolType = 'pen' | 'fill' | 'eraser' | 'select' | 'eyedropper';

interface GridState {
  cols: number;
  rows: number;
  cells: Map<string, PXSCell>;
  renderer: RendererType;
  cellWidth: number;
  cellHeight: number;
  bordersVisible: boolean;
}

interface AnimationState {
  frames: PXSFrame[];
  currentFrame: number;
  playing: boolean;
  fps: number;
  loop: boolean;
}

interface UIState {
  selectedCells: string[];
  activeTool: ToolType;
  sidebarCollapsed: boolean;
  activeTab: 'resolution' | 'effects' | 'image' | 'animation' | 'gallery';
  inspectorOpen: boolean;
  chatPanelOpen: boolean;
}

interface PXSStore {
  // Grid State
  grid: GridState;
  
  // Animation State
  animation: AnimationState;
  
  // UI State
  ui: UIState;
  
  // Performance metrics
  performance: {
    fps: number;
    frameTime: number;
    memory: number;
  };
  
  // Actions
  actions: {
    // Grid actions
    createGrid: (cols: number, rows: number) => Promise<void>;
    updateCell: (x: number, y: number, color: string, opacity?: number) => void;
    updateCells: (updates: Array<{ x: number; y: number; color: string; opacity?: number }>) => void;
    clearGrid: () => void;
    setRenderer: (renderer: RendererType) => void;
    toggleBorders: () => void;
    
    // Animation actions
    loadAnimation: (animation: PXSAnimation) => void;
    playAnimation: () => void;
    pauseAnimation: () => void;
    stopAnimation: () => void;
    goToFrame: (index: number) => void;
    nextFrame: () => void;
    prevFrame: () => void;
    addFrame: (frame: PXSFrame, index?: number) => void;
    removeFrame: (index: number) => void;
    duplicateFrame: (index: number) => void;
    updateFrame: (index: number, frame: PXSFrame) => void;
    
    // UI actions
    setActiveTool: (tool: ToolType) => void;
    selectCells: (cells: string[]) => void;
    toggleSidebar: () => void;
    setActiveTab: (tab: UIState['activeTab']) => void;
    openInspector: () => void;
    closeInspector: () => void;
    toggleChatPanel: () => void;
    
    // Performance tracking
    updatePerformance: (metrics: Partial<PXSStore['performance']>) => void;
    
    // Data export/import
    exportData: () => string;
    importData: (data: string) => void;
  };
}

// Create store with devtools
export const usePXSStore = create<PXSStore>()(
  devtools(
    (set, get) => ({
      // Initial grid state
      grid: {
        cols: 40,
        rows: 30,
        cells: new Map(),
        renderer: 'html',
        cellWidth: 10,
        cellHeight: 10,
        bordersVisible: false,
      },
      
      // Initial animation state
      animation: {
        frames: [],
        currentFrame: 0,
        playing: false,
        fps: 30,
        loop: true,
      },
      
      // Initial UI state
      ui: {
        selectedCells: [],
        activeTool: 'pen',
        sidebarCollapsed: false,
        activeTab: 'resolution',
        inspectorOpen: false,
        chatPanelOpen: true,
      },
      
      // Initial performance metrics
      performance: {
        fps: 0,
        frameTime: 0,
        memory: 0,
      },
      
      // Actions
      actions: {
        // Grid actions
        createGrid: async (cols, rows) => {
          // This will be handled by GridWorker
          set((state) => ({
            grid: {
              ...state.grid,
              cols,
              rows,
              cells: new Map(),
            },
          }));
        },
        
        updateCell: (x, y, color, opacity) => {
          set((state) => {
            const key = `${x}-${y}`;
            const newCells = new Map(state.grid.cells);
            newCells.set(key, { x, y, color, opacity });
            return {
              grid: {
                ...state.grid,
                cells: newCells,
              },
            };
          });
        },
        
        updateCells: (updates) => {
          set((state) => {
            const newCells = new Map(state.grid.cells);
            for (const update of updates) {
              const key = `${update.x}-${update.y}`;
              newCells.set(key, update);
            }
            return {
              grid: {
                ...state.grid,
                cells: newCells,
              },
            };
          });
        },
        
        clearGrid: () => {
          set((state) => ({
            grid: {
              ...state.grid,
              cells: new Map(),
            },
          }));
        },
        
        setRenderer: (renderer) => {
          set((state) => ({
            grid: {
              ...state.grid,
              renderer,
            },
          }));
        },
        
        toggleBorders: () => {
          set((state) => ({
            grid: {
              ...state.grid,
              bordersVisible: !state.grid.bordersVisible,
            },
          }));
        },
        
        // Animation actions
        loadAnimation: (animation) => {
          set({
            animation: {
              frames: animation.frames,
              currentFrame: 0,
              playing: false,
              fps: animation.fps,
              loop: animation.metadata?.loop ?? true,
            },
          });
        },
        
        playAnimation: () => {
          set((state) => ({
            animation: {
              ...state.animation,
              playing: true,
            },
          }));
        },
        
        pauseAnimation: () => {
          set((state) => ({
            animation: {
              ...state.animation,
              playing: false,
            },
          }));
        },
        
        stopAnimation: () => {
          set((state) => ({
            animation: {
              ...state.animation,
              playing: false,
              currentFrame: 0,
            },
          }));
        },
        
        goToFrame: (index) => {
          set((state) => ({
            animation: {
              ...state.animation,
              currentFrame: Math.max(0, Math.min(index, state.animation.frames.length - 1)),
            },
          }));
        },
        
        nextFrame: () => {
          const state = get();
          const nextIndex = (state.animation.currentFrame + 1) % state.animation.frames.length;
          set({
            animation: {
              ...state.animation,
              currentFrame: nextIndex,
            },
          });
        },
        
        prevFrame: () => {
          const state = get();
          const prevIndex = state.animation.currentFrame === 0 
            ? state.animation.frames.length - 1 
            : state.animation.currentFrame - 1;
          set({
            animation: {
              ...state.animation,
              currentFrame: prevIndex,
            },
          });
        },
        
        addFrame: (frame, index) => {
          set((state) => {
            const frames = [...state.animation.frames];
            if (index !== undefined) {
              frames.splice(index, 0, frame);
            } else {
              frames.push(frame);
            }
            return {
              animation: {
                ...state.animation,
                frames,
              },
            };
          });
        },
        
        removeFrame: (index) => {
          set((state) => {
            const frames = state.animation.frames.filter((_, i) => i !== index);
            return {
              animation: {
                ...state.animation,
                frames,
                currentFrame: Math.min(state.animation.currentFrame, frames.length - 1),
              },
            };
          });
        },
        
        duplicateFrame: (index) => {
          set((state) => {
            const frames = [...state.animation.frames];
            const frameToDuplicate = frames[index];
            frames.splice(index + 1, 0, { ...frameToDuplicate });
            return {
              animation: {
                ...state.animation,
                frames,
              },
            };
          });
        },
        
        updateFrame: (index, frame) => {
          set((state) => {
            const frames = [...state.animation.frames];
            frames[index] = frame;
            return {
              animation: {
                ...state.animation,
                frames,
              },
            };
          });
        },
        
        // UI actions
        setActiveTool: (tool) => {
          set((state) => ({
            ui: {
              ...state.ui,
              activeTool: tool,
            },
          }));
        },
        
        selectCells: (cells) => {
          set((state) => ({
            ui: {
              ...state.ui,
              selectedCells: cells,
            },
          }));
        },
        
        toggleSidebar: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              sidebarCollapsed: !state.ui.sidebarCollapsed,
            },
          }));
        },
        
        setActiveTab: (tab) => {
          set((state) => ({
            ui: {
              ...state.ui,
              activeTab: tab,
            },
          }));
        },
        
        openInspector: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              inspectorOpen: true,
            },
          }));
        },
        
        closeInspector: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              inspectorOpen: false,
            },
          }));
        },

        toggleChatPanel: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              chatPanelOpen: !state.ui.chatPanelOpen,
            },
          }));
        },
        
        // Performance tracking
        updatePerformance: (metrics) => {
          set((state) => ({
            performance: {
              ...state.performance,
              ...metrics,
            },
          }));
        },
        
        // Data export/import
        exportData: () => {
          const state = get();
          const data = {
            grid: {
              cols: state.grid.cols,
              rows: state.grid.rows,
              cells: Array.from(state.grid.cells.values()),
            },
            animation: state.animation,
          };
          return JSON.stringify(data, null, 2);
        },
        
        importData: (data) => {
          try {
            const parsed = JSON.parse(data);
            // Implementation will be added
          } catch (error) {
            console.error('Failed to import data:', error);
          }
        },
      },
    }),
    {
      name: 'pxs-studio-store',
    }
  )
);

// Selectors for optimized access
export const selectGrid = (state: PXSStore) => state.grid;
export const selectAnimation = (state: PXSStore) => state.animation;
export const selectUI = (state: PXSStore) => state.ui;
export const selectPerformance = (state: PXSStore) => state.performance;
export const selectActions = (state: PXSStore) => state.actions;
