'use client';

import { useState } from 'react';
import { GALLERY_ENTRIES } from '../data/gallery';
import { applyGalleryFrame } from '../lib/apply-gallery-frame';
import type { GridData } from '../workers/grid.worker';

interface ArtGalleryTabProps {
  onGridUpdate: (gridData: GridData) => void;
}

export default function ArtGalleryTab({ onGridUpdate }: ArtGalleryTabProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadEntry = (id: string) => {
    const entry = GALLERY_ENTRIES.find((e) => e.id === id);
    if (!entry) return;

    const gridData = applyGalleryFrame(
      entry.frame,
      `Gallery: ${entry.title}`
    );
    onGridUpdate(gridData);
    setActiveId(id);
  };

  return (
    <div className="p-3 space-y-3">
      <div>
        <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
          AI Gallery
        </h3>
        <p className="mt-1 text-[10px] text-text-muted leading-relaxed">
          Prompt-driven pixel art experiments. Click a piece to load it on the canvas.
          Ask for new art in chat — it will be saved as JSON under{' '}
          <code className="text-[9px] text-text-secondary">src/data/gallery/</code>.
        </p>
      </div>

      <ul className="space-y-1.5">
        {GALLERY_ENTRIES.map((entry) => {
          const isActive = activeId === entry.id;
          const { cols, rows } = entry.frame;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => loadEntry(entry.id)}
                className={`w-full text-left rounded-md border px-2.5 py-2 transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background-tertiary hover:border-border-hover hover:bg-background-overlay'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-text-primary">
                    {entry.title}
                  </span>
                  <span className="text-[9px] font-mono text-text-muted shrink-0">
                    {cols}×{rows}
                  </span>
                </div>
                <p className="mt-1 text-[9px] text-text-muted line-clamp-2 leading-snug">
                  {entry.prompt}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
