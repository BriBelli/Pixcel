'use client';

/**
 * A diffusion-style "materializing" loading animation — a grid of pixels shimmering in a
 * diagonal wave. Shown on the easel while the model is reasoning (no frame yet) so the canvas
 * always feels alive, like an image resolving out of noise.
 */
export default function DiffusionShimmer({ size = 340, cells = 12 }: { size?: number; cells?: number }) {
  const n = cells * cells;
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ width: size, height: size, display: 'grid', gridTemplateColumns: `repeat(${cells}, 1fr)`, gap: 2 }}
    >
      <style>{`@keyframes pxShimmer { 0%,100% { opacity:.12; transform:scale(.96) } 50% { opacity:.7; transform:scale(1) } }`}</style>
      {Array.from({ length: n }).map((_, i) => {
        const x = i % cells;
        const y = Math.floor(i / cells);
        const delay = (((x + y) % cells) * 0.11).toFixed(2);
        // subtle hue variance between blue and purple, like image-resolving noise
        const hue = (x * 7 + y * 5) % 2 === 0 ? '#5b8cff' : '#8b7bf0';
        return (
          <div
            key={i}
            style={{ background: hue, borderRadius: 2, animation: `pxShimmer 1.6s ease-in-out ${delay}s infinite` }}
          />
        );
      })}
    </div>
  );
}
