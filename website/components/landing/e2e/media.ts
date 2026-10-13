/** Whether the visitor asked the OS to minimize motion. */
export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Whether the viewport is at the `lg` breakpoint, where /e2e switches to its desktop layout. */
export function isDesktopViewport() {
  return window.matchMedia("(min-width: 64rem)").matches;
}
