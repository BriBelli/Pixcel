'use client';

import { useEffect } from 'react';
import { usePXSStore, selectGrid, selectAnimation, selectActions } from '../store/pxs-store';

export default function Studio() {
  const grid = usePXSStore(selectGrid);
  const animation = usePXSStore(selectAnimation);
  const actions = usePXSStore(selectActions);

  useEffect(() => {
    // Initialize default grid
    actions.createGrid(40, 30);
  }, [actions]);

  return (
    <div className="flex h-screen flex-col bg-background text-text-primary">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-background-elevated px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="text-2xl">⬢</div>
          <div>
            <h1 className="text-lg font-bold">PXS Studio</h1>
            <p className="text-xs text-text-muted">v4.0.0 • Production Architecture</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-accent-green/10 px-3 py-1">
            <span className="text-sm text-accent-green">Ready</span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-80 border-r border-border bg-background-elevated overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Grid Configuration</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Dimensions</span>
                  <span className="text-primary">{grid.cols}×{grid.rows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Cells</span>
                  <span className="text-primary">{grid.cols * grid.rows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Renderer</span>
                  <span className="text-primary uppercase">{grid.renderer}</span>
                </div>
              </div>
            </div>
            
            {animation.frames.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Animation</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Frames</span>
                    <span className="text-primary">{animation.frames.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">FPS</span>
                    <span className="text-primary">{animation.fps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Current</span>
                    <span className="text-primary">{animation.currentFrame + 1}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 flex flex-col items-center justify-center bg-background p-8">
          <div className="text-center space-y-6 max-w-2xl">
            <div className="text-6xl mb-4">🚀</div>
            
            <h2 className="text-3xl font-bold">
              Phase 4: Production Architecture
            </h2>
            
            <p className="text-lg text-text-secondary leading-relaxed">
              Welcome to PXS Studio v4.0! The monorepo is now set up with:
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-left">
              <Feature icon="📦" title="@pxs/core" description="Headless library extracted" />
              <Feature icon="🎨" title="Next.js + React" description="Studio app shell ready" />
              <Feature icon="🗃️" title="Zustand" description="State management configured" />
              <Feature icon="⚡" title="Web Workers" description="Ready for implementation" />
            </div>
            
            <div className="pt-6 space-y-3">
              <div className="px-4 py-2 rounded-lg bg-background-elevated border border-border-muted">
                <p className="text-sm text-text-muted">
                  <span className="text-accent-green">✓</span> Nx workspace configured
                </p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-background-elevated border border-border-muted">
                <p className="text-sm text-text-muted">
                  <span className="text-accent-green">✓</span> TypeScript + Tailwind configured
                </p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-background-elevated border border-border-muted">
                <p className="text-sm text-text-muted">
                  <span className="text-primary">→</span> Next: Implement GridWorker + RenderWorker
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 border-l border-border bg-background-elevated overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Performance</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">FPS</span>
                  <span className="text-accent-green">60</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Frame Time</span>
                  <span className="text-accent-green">16.7ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Memory</span>
                  <span className="text-primary">Low</span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-4">Next Steps</h2>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  <span>Implement GridWorker</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  <span>Implement RenderWorker</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  <span>Integrate OffscreenCanvas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">4.</span>
                  <span>Build component library</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg bg-background-elevated border border-border hover:border-primary transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-sm text-text-muted">{description}</p>
    </div>
  );
}
