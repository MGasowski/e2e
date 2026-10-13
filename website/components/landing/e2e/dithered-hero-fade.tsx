"use client";

import { useEffect, useRef } from "react";
import { canvasBufferSize, reportCanvasFailure } from "./canvas-buffer";

/* Same stops as the old CSS overlay gradient; alpha of rgb(17 17 17). */
const STOPS: [number, number][] = [
  [0, 0.1],
  [0.3, 0],
  [0.65, 0.58],
  [0.96, 1],
  [1, 1],
];

function alphaAt(t: number) {
  for (let i = 1; i < STOPS.length; i++) {
    const [p0, a0] = STOPS[i - 1];
    const [p1, a1] = STOPS[i];
    if (t <= p1) return a0 + ((a1 - a0) * (t - p0)) / (p1 - p0);
  }
  return STOPS[STOPS.length - 1][1];
}

/**
 * A CSS gradient over this near-black range only has a handful of
 * distinguishable shades, so it renders as visible bands. Painting the same
 * fade per pixel with jittered alpha (dither) reads as perfectly smooth.
 */
export function DitheredHeroFade() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    let lastWidth = -1;
    let lastHeight = -1;
    const paint = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      delete canvas.dataset.rendered;
      canvas.width = 0;
      canvas.height = 0;
      const size = canvasBufferSize(width, height);
      if (!size) return;
      try {
        const { width: w, height: h } = size;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          canvas.width = 0;
          canvas.height = 0;
          return;
        }
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          const base = alphaAt(y / h) * 255;
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            d[i] = 17;
            d[i + 1] = 17;
            d[i + 2] = 17;
            d[i + 3] = base + (Math.random() - 0.5) * 6;
          }
        }
        ctx.putImageData(img, 0, 0);
        canvas.dataset.rendered = "true";
      } catch (error) {
        canvas.width = 0;
        canvas.height = 0;
        reportCanvasFailure(error, "e2e-hero-fade");
      }
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(parent);
    return () => {
      observer.disconnect();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full bg-[linear-gradient(to_bottom,rgb(17_17_17/0.1)_0%,rgb(17_17_17/0)_30%,rgb(17_17_17/0.58)_65%,rgb(17_17_17)_96%,rgb(17_17_17)_100%)] data-[rendered=true]:bg-none"
    />
  );
}
