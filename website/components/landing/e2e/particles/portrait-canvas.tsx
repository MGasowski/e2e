"use client";

import { useEffect, useRef } from "react";
import { mountPortraitScene, type PortraitSceneOptions } from "./portrait-scene";

/* The particle canvases sample the original photo, which has the full tonal
   range the halftone needs. */
const PORTRAIT_PHOTO_SRC = "/e2e/webinar-kacper-photo.png";

/** Host portrait rendered as a halftone point cloud, covering its positioned parent. */
export function PortraitCanvas({ options }: { options: PortraitSceneOptions }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { revealMs, interactive, zoom, focusY } = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountPortraitScene(canvas, PORTRAIT_PHOTO_SRC, { revealMs, interactive, zoom, focusY });
  }, [revealMs, interactive, zoom, focusY]);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
  );
}
