"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../media";
import { PortraitCanvas } from "../particles/portrait-canvas";
import { INTRO_SESSION } from "./sessions-data";

const MAX_TILT_DEG = 5;
const HOVER_SCALE = 1.02;
/* The sparse star mask passes little light overall, so the glare runs
   brighter than the old dense masks to keep individual specks visible. */
const MAX_GLARE_OPACITY = 0.9;
/** Exponential-smoothing time constant; the card settles in roughly 3x this. */
const SMOOTHING_TAU_MS = 90;

/* The glare shines through a sparse starfield like the hero background: a
   seeded tile (not Math.random, so every render tiles the same) of mostly
   isolated 2px specks, dim with a few bright ones, matching the firefly
   canvas's scattered squares. */
const GRAIN_TILE = 40;
const GRAIN_CELLS = (() => {
  let seed = 20261022;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rects: string[] = [];
  for (let y = 0; y < GRAIN_TILE; y++) {
    for (let x = 0; x < GRAIN_TILE; x++) {
      const value = rand();
      if (value < 0.85) continue;
      let alpha = "0.3";
      if (value > 0.97) alpha = "1";
      else if (value > 0.92) alpha = "0.6";
      rects.push(
        `<rect x='${x}' y='${y}' width='1' height='1' fill='white' fill-opacity='${alpha}'/>`,
      );
    }
  }
  return rects.join("");
})();
const SPARKLE_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${GRAIN_TILE} ${GRAIN_TILE}'>${GRAIN_CELLS}</svg>`,
)}")`;

/* Silver-white only: the glare lightens, it never tints, and the center stays
   dim enough that the portrait reads through it. */
const GLARE_BACKGROUND =
  "radial-gradient(farthest-corner circle at var(--holo-gx, 50%) var(--holo-gy, 50%), rgb(255 255 255 / 0.8) 4%, rgb(222 226 232 / 0.45) 26%, rgb(255 255 255 / 0.12) 48%, transparent 70%)";

/**
 * The host portrait as a holographic trading card: it sits still, tilts in 3D
 * toward the cursor, and a dither-masked silver-white glare trails the
 * pointer. The point-cloud portrait itself stays still - the card is the
 * interactive object now, not the particles.
 */
export function HostHoloCard({
  className,
  caption = true,
}: {
  className?: string;
  /** The session page shows name and bio beside the card, so it hides the caption. */
  caption?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const card = cardRef.current;
    if (!frame || !card) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    type Channels = { rx: number; ry: number; gx: number; gy: number; glare: number; zoom: number };
    const current: Channels = { rx: 0, ry: 0, gx: 0.5, gy: 0.5, glare: 0, zoom: 1 };
    const target: Channels = { ...current };
    const channels = Object.keys(current) as (keyof Channels)[];
    let raf = 0;
    let last = 0;

    const apply = () => {
      card.style.setProperty("--holo-rx", `${current.rx.toFixed(3)}deg`);
      card.style.setProperty("--holo-ry", `${current.ry.toFixed(3)}deg`);
      card.style.setProperty("--holo-gx", `${(current.gx * 100).toFixed(2)}%`);
      card.style.setProperty("--holo-gy", `${(current.gy * 100).toFixed(2)}%`);
      card.style.setProperty("--holo-glare", current.glare.toFixed(3));
      card.style.setProperty("--holo-zoom", current.zoom.toFixed(4));
    };

    const tick = (now: number) => {
      const dt = Math.min(now - (last || now), 64);
      last = now;
      const blend = 1 - Math.exp(-dt / SMOOTHING_TAU_MS);
      let settled = true;
      for (const channel of channels) {
        current[channel] += (target[channel] - current[channel]) * blend;
        if (Math.abs(target[channel] - current[channel]) > 0.001) settled = false;
      }
      apply();
      if (settled) {
        raf = 0;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // The untransformed frame is measured instead of the tilted card, so the
    // pointer math never feeds back into itself.
    const onMove = (event: PointerEvent) => {
      const rect = frame.getBoundingClientRect();
      const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
      target.ry = (x - 0.5) * 2 * MAX_TILT_DEG;
      target.rx = (0.5 - y) * 2 * MAX_TILT_DEG;
      target.gx = x;
      target.gy = y;
      target.glare = MAX_GLARE_OPACITY;
      target.zoom = HOVER_SCALE;
      wake();
    };
    const onLeave = () => {
      Object.assign(target, { rx: 0, ry: 0, glare: 0, zoom: 1 });
      wake();
    };

    frame.addEventListener("pointermove", onMove);
    frame.addEventListener("pointerleave", onLeave);
    return () => {
      frame.removeEventListener("pointermove", onMove);
      frame.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={className}>
      <div ref={frameRef} className="h-full w-full [perspective:600px]">
        <div
          ref={cardRef}
          className="relative flex h-full w-full flex-col rounded-[6px] border border-white/15 bg-ta-grey-500 p-3 shadow-[0_32px_64px_rgb(0_0_0/0.55)] will-change-transform [transform-style:preserve-3d]"
          style={{
            transform:
              "scale(var(--holo-zoom, 1)) rotateX(var(--holo-rx, 0deg)) rotateY(var(--holo-ry, 0deg)) translateZ(0.01px)",
          }}
        >
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[4px] bg-background">
            <PortraitCanvas options={{ revealMs: 650, interactive: false }} />
            {caption ? (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background"
                />
                <p className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-2.5 font-mono text-sm uppercase leading-[14px] tracking-[0.08em]">
                  <span className="text-white/50">Host</span>
                  <span className="font-medium text-white">
                    {INTRO_SESSION.host.name} · {INTRO_SESSION.host.role}
                  </span>
                </p>
              </>
            ) : null}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[6px] mix-blend-screen"
            style={{
              opacity: "var(--holo-glare, 0)",
              backgroundImage: GLARE_BACKGROUND,
              maskImage: SPARKLE_MASK,
              maskSize: "80px 80px",
              maskRepeat: "repeat",
            }}
          />
        </div>
      </div>
    </div>
  );
}
