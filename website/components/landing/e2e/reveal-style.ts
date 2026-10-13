import type { CSSProperties } from "react";

/** Stagger slot for a `data-reveal` element inside a `Reveal` section (70ms per step). */
export function revealDelay(index: number): CSSProperties {
  return { "--reveal-i": index } as CSSProperties;
}
