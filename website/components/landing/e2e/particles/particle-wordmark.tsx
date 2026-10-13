"use client";

import { useEffect, useRef } from "react";
import { mountWordmarkScene } from "./wordmark-scene";

/**
 * The footer's giant "e2e", built from the same square particles as the hero
 * field. `topOverflow` is how far (px) the host extends above the wordmark's
 * box, so the "2" can rise past the footer edge.
 */
export function ParticleWordmark({ topOverflow = 0 }: { topOverflow?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountWordmarkScene(canvas, topOverflow);
  }, [topOverflow]);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
  );
}
