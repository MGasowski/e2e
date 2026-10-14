"use client";

import { useEffect, useRef } from "react";
import { type FireflySceneOptions, mountFireflyScene } from "./firefly-scene";

/**
 * Interactive particle background for /e2e, ported from the Paper-designed
 * firefly prototype: the bayer-dithered artwork becomes a sparse starfield of
 * squares floating on ink, the cursor repels them, and single grains
 * continuously drift upward. Covers the nearest positioned ancestor.
 */
export function FireflyCanvas({ density, rainPerSecond }: FireflySceneOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountFireflyScene(canvas, { density, rainPerSecond });
  }, [density, rainPerSecond]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 z-0 block h-full w-full touch-none"
    />
  );
}
