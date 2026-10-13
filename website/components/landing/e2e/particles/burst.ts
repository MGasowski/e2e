/**
 * Window event that blasts every particle scene radially outward from a point
 * in viewport coordinates (fired by the /e2e copy buttons).
 */
const PARTICLE_BURST_EVENT = "e2e-firefly-burst";

export type BurstPoint = { x: number; y: number };

declare global {
  interface WindowEventMap {
    [PARTICLE_BURST_EVENT]: CustomEvent<BurstPoint>;
  }
}

/** Fires a particle burst from the center of `element`. */
export function dispatchBurstFrom(element: Element) {
  const rect = element.getBoundingClientRect();
  window.dispatchEvent(
    new CustomEvent(PARTICLE_BURST_EVENT, {
      detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    }),
  );
}

/** Calls `handler` for every burst until `signal` aborts. */
export function listenForBursts(handler: (point: BurstPoint) => void, signal: AbortSignal) {
  window.addEventListener(PARTICLE_BURST_EVENT, (event) => handler(event.detail), { signal });
}
