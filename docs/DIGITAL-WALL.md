# DigitalWall — API reference

The persistent z-0 Pixcel digital wall (charter §1/§3). A **real PXS grid** — colored cells + live
effects, the Pixcel wordmark as real cells — rendered on canvas. It's a NEW consumer of the engine
(does not touch pxs-core / MatrixArtStage / live-jobs / live-art / api). Source:
[`DigitalWall.tsx`](../packages/pxs-studio/src/components/DigitalWall.tsx). Used by
[`LandingPage.tsx`](../packages/pxs-studio/src/components/LandingPage.tsx).

## Mental model (the three rules)
1. **One screen, one resolution** (like a TV). The logo and ambient are made of the *same* cells.
2. **You set the resolution (`pixels`); it never auto-changes** (Model A). A smaller logo ⇒ raise `pixels`.
3. **The logo is pixel-perfect** — it snaps to integer zoom (1×, 2×, 3× of its native 27 cells), so it
   never distorts; it can't render below 1× native.

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `pixels` | `number` | `RES.retro` (128) | **Resolution** = cells across (from the canonical ladder). You set it; never auto-changes. Lower = chunkier (retro), higher = finer (film). Rows fill the screen automatically. |
| `effect` | `WallEffect` | `'radialPulse'` | Ambient effect when no `frame` is set: `radialPulse` · `plasma` · `spiral` · `radialGradient` · `solid`. |
| `intensity` | `number` 0–1 | `0.16` | How far the ambient departs from the base bg. Low by design (`0.10` barely-there → `0.20` more alive). |
| `fps` | `number` | `18` | Ambient animation rate; the grid is static between ticks. |
| `frame` | `PXSFrame \| null` | `null` | **AI override:** an explicit frame painted verbatim (scaled to fit), suspending the ambient. Push a new frame per tick to animate (video / face / mood). |
| `gridLines` | `boolean` | `true` | Visible 1px lattice on every cell (the worktop / LED look). |
| `gridLineColor` | `string` | `--a2ui-border-default` | Gridline stroke color (read from theme at runtime if unset). |
| `gridLineAlpha` | `number` 0–1 | `0.08` | Gridline opacity — structural, not loud. |
| `showLogo` | `boolean` | `true` | Show the Pixcel wordmark as real centered cells over the ambient. |
| `logoScale` | `number` 0–1 | `0.68` | Logo size as a fraction of the screen width. Snaps to integer zoom (always crisp); held to native floor (raise `pixels` to go smaller). |
| `accent` | `string` | `#58a6ff` (brand blue) | Logo ink tint + effect hue. |
| `background` | `string` | `--a2ui-bg-app` | Base wall color (read from theme at runtime if unset). |
| `paused` | `boolean` | `false` | Freeze the wall. Also auto-paused on `prefers-reduced-motion`. |
| `onLogoLayout` | `(box) => void` | — | Reports the logo's box as fractions of the wall `{ topFrac, bottomFrac, centerXFrac, heightFrac, visible }`, recomputed on resize/prop change (not per frame). Lets floating UI (e.g. the prompt bar) anchor to the logo. |
| `className` | `string` | — | Class on the wrapper element. |

## The resolution ladder (`RES`)
One canonical vocabulary from the chunky splash wall to the final film. `pixels={RES.<tier>}`.
Source: [`lib/resolutions.ts`](../packages/pxs-studio/src/lib/resolutions.ts) (`RES` = cells across;
`RES_META` = full W×H + label + anchor for fixed-size canvases / export).

| Tier | Cells | Feel | Real anchor |
|---|---|---|---|
| `sprite` | 64 | big blocks | 64-px sprite / icon |
| `retro` | 128 | classic chunky | classic lo-res |
| `eightBit` | 256 | NES/SNES era | NES 256×240 |
| `sd` | 320 | standard-def | QVGA 320×240 |
| `p480` | 640 | SD video | DVD |
| `p720` | 1280 | HD | 720p |
| `p1080` | 1920 | Full HD | 1080p |
| `uhd` | 3840 | 4K | UHD / 4096 DCI cinema |

Low tiers ARE the chunky look (no super-pixels — fewer cells = bigger cells). High tiers are fine
grids for photoreal conversion + film export.

## Example (the splash)
```tsx
<DigitalWall
  pixels={RES.retro}     // 128 across — chunky retro
  logoScale={0.25}       // snaps to 1× native (≈21% width at retro), pixel-perfect
  intensity={0.14}       // calm "double-take" ambient
  onLogoLayout={handleLogoLayout}
  className="absolute inset-0 h-full w-full"
/>
```
