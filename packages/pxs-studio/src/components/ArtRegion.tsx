'use client';

/**
 * ART REGION — the flubber mechanism, kept simple (UI-LAYER-CHARTER §3).
 *
 * One shared, responsive rect: the focal-art "safe area" = the viewport INSET by the
 * persistent edge chrome (left nav rail, right AI accordion, the floating top bar) plus a
 * small pad. The canvas sizes + centers its art WITHIN this region (so the art never renders
 * under the chrome); the floating panels dock to the OUTER walls just OUTSIDE it. The rect is
 * exposed via {@link useArtRegion} so the canvas, the panels, and (later) the agent can all
 * read the same coordinates.
 *
 * This is deliberately NOT a dynamic collision solver — the inset-safe-area + edge-docking IS
 * the mechanism. It recomputes on viewport resize AND when the right accordion expands/collapses
 * (its right inset changes), via a ResizeObserver on the document body + the live insets prop.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/** The persistent edge-chrome geometry, in CSS px. All floating chrome derives from these. */
export const CHROME = {
  /** Left NavRail width (the one persistent UI anchor). */
  navW: 72,
  /** Floating top-bar height (the glass header). */
  topBarH: 40,
  /** Top-bar's offset from the viewport top (it floats, not flush). */
  topBarGap: 12,
  /** A small breathing pad between the chrome walls and the art safe-area. */
  pad: 12,
} as const;

/** The four insets (CSS px) carving the art region out of the viewport. */
export interface ArtRegionInsets {
  /** Left inset = nav rail (the right inset is supplied live — it tracks the accordion). */
  left: number;
  /** Right inset = the AI accordion's reserved width. */
  right: number;
  /** Top inset = top-bar gap + height. */
  top: number;
  /** Bottom inset. */
  bottom: number;
}

/** A simple rect — the art safe-area in viewport coordinates. */
export interface ArtRegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArtRegion {
  /** The insets carving the region out of the viewport. */
  insets: ArtRegionInsets;
  /** The resolved safe-area rect (viewport-inset-by-insets, never negative). */
  rect: ArtRegionRect;
  /** Live viewport size the rect was computed from. */
  viewport: { width: number; height: number };
}

const ArtRegionContext = createContext<ArtRegion | null>(null);

/**
 * Provide the art region. The host (Studio) passes the live right-inset (the AI accordion's
 * reserved width — expanded width when open, the collapsed rail width otherwise); left/top/bottom
 * derive from {@link CHROME}. The rect recomputes on viewport resize and whenever `rightInset`
 * changes (accordion toggle / drag-resize).
 */
export function ArtRegionProvider({
  rightInset,
  children,
}: {
  rightInset: number;
  children: React.ReactNode;
}) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  // Recompute responsively on viewport resize. (The accordion-toggle case flows through the
  // `rightInset` prop + the useMemo below, so no extra listener is needed for it.)
  useEffect(() => {
    const measure = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    // A ResizeObserver on <body> catches container/zoom changes a plain resize event can miss.
    const ro = new ResizeObserver(measure);
    if (typeof document !== 'undefined') ro.observe(document.body);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, []);

  const value = useMemo<ArtRegion>(() => {
    const insets: ArtRegionInsets = {
      left: CHROME.navW + CHROME.pad,
      right: rightInset + CHROME.pad,
      top: CHROME.topBarGap + CHROME.topBarH + CHROME.pad,
      bottom: CHROME.pad,
    };
    const width = Math.max(0, viewport.width - insets.left - insets.right);
    const height = Math.max(0, viewport.height - insets.top - insets.bottom);
    return {
      insets,
      rect: { x: insets.left, y: insets.top, width, height },
      viewport,
    };
  }, [rightInset, viewport]);

  return <ArtRegionContext.Provider value={value}>{children}</ArtRegionContext.Provider>;
}

/** Read the shared art region. Returns null outside a provider (callers should guard). */
export function useArtRegion(): ArtRegion | null {
  return useContext(ArtRegionContext);
}
