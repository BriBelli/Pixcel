'use client';

import { useMemo } from 'react';
import FramePreview from './FramePreview';
import { GALLERY_ENTRIES } from '../data/gallery';
import type { PXSFrame } from '../store/pxs-store';

interface Props {
  onEnter: () => void;
}

const FEATURED = [
  'owl-live-32',
  'dragon-live-48b',
  'race-car-pipeline-32',
  'wizard-anchored-32',
  'cat-32',
  'robot-32',
  'monkey-32',
  'saguaro-16',
];

const FEATURES = [
  {
    icon: '👁',
    title: 'Eyes open',
    body: 'It sees its own work after every stroke and fixes what it sees — never composing blind.',
  },
  {
    icon: '◆',
    title: 'Sculptor cascade',
    body: 'Shape → elements → refine → detail → polish → QA. Carved coarse-to-fine, like a statue.',
  },
  {
    icon: '🎨',
    title: 'Art director',
    body: 'An independent critic gates every phase to a 96% bar and recalls drift before it sets.',
  },
  {
    icon: '↺',
    title: 'Pause & resume',
    body: 'Step away and come back. Every piece is checkpointed and finishable later — like real art.',
  },
];

export default function LandingPage({ onEnter }: Props) {
  const pieces = useMemo(() => {
    const byId = new Map(GALLERY_ENTRIES.map((e) => [e.id, e]));
    return FEATURED.map((id) => byId.get(id)).filter(Boolean) as { id: string; title: string; frame: PXSFrame }[];
  }, []);

  return (
    <div className="relative h-screen overflow-y-auto bg-background text-text-primary">
      <style>{`
        @keyframes pxFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pxGlow { 0%,100%{opacity:.5} 50%{opacity:.85} }
      `}</style>

      {/* Ambient glow + faint pixel grid */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(1100px 520px at 50% -10%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(800px 500px at 85% 20%, rgba(59,130,246,0.12), transparent 55%)',
          animation: 'pxGlow 7s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(circle at 50% 30%, black, transparent 75%)',
        }}
      />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="sticky top-0 z-20 backdrop-blur-md bg-background/70 border-b border-border/60">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-accent-purple text-lg">✦</span>
              <span className="font-semibold tracking-tight">Pixcel</span>
              <span className="hidden sm:inline text-[11px] text-text-muted ml-2 px-2 py-0.5 rounded-full border border-border">
                the pixel-art IDE
              </span>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <a href="#gallery" className="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors">
                Gallery
              </a>
              <a href="#how" className="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors">
                How it works
              </a>
              <button
                onClick={onEnter}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-colors"
              >
                Open Studio
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background-secondary/60 text-[12px] text-text-secondary mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            Live Artisan · powered by Claude Opus 4.8
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05]">
            Pixel art,
            <br />
            <span className="bg-gradient-to-r from-primary via-accent-purple to-primary-light bg-clip-text text-transparent">
              sculpted like a human.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-text-secondary leading-relaxed">
            Pixcel doesn&apos;t one-shot a blob. Its Live Artisan blocks in the shape, then refines,
            details, and polishes — eyes open the whole time, an art director gating every phase.
            Watch real art get made, cell by cell.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <button
              onClick={onEnter}
              className="group px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold transition-all shadow-lg shadow-primary/20"
            >
              Open the Studio
              <span className="inline-block ml-1.5 transition-transform group-hover:translate-x-0.5">→</span>
            </button>
            <a
              href="#gallery"
              className="px-6 py-3 rounded-xl border border-border bg-background-secondary/60 hover:border-border-hover text-text-secondary hover:text-text-primary font-medium transition-colors"
            >
              See the gallery
            </a>
          </div>

          {/* Featured pieces, gently floating */}
          <div className="mt-16 flex items-end justify-center gap-4 sm:gap-6 flex-wrap">
            {pieces.slice(0, 5).map((p, i) => (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-background-secondary/70 p-3 shadow-xl shadow-black/30 hover:scale-105 transition-transform"
                style={{ animation: `pxFloat ${5 + (i % 3)}s ease-in-out ${i * 0.4}s infinite` }}
              >
                <FramePreview frame={p.frame} size={i === 1 ? 132 : 104} />
              </div>
            ))}
          </div>
        </header>

        {/* How it works */}
        <section id="how" className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-text-muted mb-10">
            How the Live Artisan works
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-background-secondary/50 p-5 hover:border-accent-purple/40 hover:bg-background-secondary transition-colors"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="font-semibold mb-1.5">{f.title}</div>
                <p className="text-sm text-text-muted leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Gallery */}
        <section id="gallery" className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Made cell-by-cell</h2>
            <p className="mt-2 text-text-secondary">Real pieces from the Live Artisan — no filters, no quantizing. Pure reasoning on a grid.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {pieces.map((p) => (
              <button
                key={p.id}
                onClick={onEnter}
                className="group rounded-xl border border-border bg-background-secondary/50 p-4 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-background-secondary transition-colors"
              >
                <div className="transition-transform group-hover:scale-105">
                  <FramePreview frame={p.frame} size={120} />
                </div>
                <span className="text-[11px] text-text-muted group-hover:text-text-secondary">{p.title}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold tracking-tight">
            Your canvas is <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">waiting.</span>
          </h2>
          <p className="mt-4 text-text-secondary">Open the Studio and watch the artist work — or pick up a brush yourself.</p>
          <button
            onClick={onEnter}
            className="mt-8 px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-lg transition-colors shadow-lg shadow-primary/20"
          >
            Start creating →
          </button>
        </section>

        <footer className="border-t border-border/60">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-text-muted">
            <div className="flex items-center gap-2">
              <span className="text-accent-purple">✦</span> Pixcel — images are data, not files.
            </div>
            <div>Powered by Claude Opus 4.8</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
