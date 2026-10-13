"use client";

import { useEffect, useRef } from "react";
import { mountDustScene } from "./dust-scene";

/**
 * Invisible until a copy button's click burst: a patch of dither squares
 * sprays outward from the click and dissolves. Covers its positioned parent.
 */
export function ButtonDust({ density = 0.3 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountDustScene(canvas, density);
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block h-full w-full"
    />
  );
}
