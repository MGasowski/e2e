"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { isDesktopViewport, prefersReducedMotion } from "../media";
import { STEP_SELECTOR } from "./step-controls";

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
const SETTLE_FALLBACK_MS = 150;
/** A window scroll this soon after wheel, touch, or key input is the visitor's; later ones are not. */
const INPUT_TO_SCROLL_MS = 250;

/** Viewport-y of each step's content center; bottom padding is spacing, not content. */
function stepCenters(steps: HTMLElement[]) {
  return steps.map((el) => {
    const rect = el.getBoundingClientRect();
    const padding = Number.parseFloat(getComputedStyle(el).paddingBottom) || 0;
    return rect.top + (rect.height - padding) / 2;
  });
}

/**
 * On desktop, once the visitor's own scroll settles inside the steps, glides
 * the nearest step to the viewport center, level with the sticky terminal.
 * Scrolling on past the first or last step is never pulled back, and focus
 * and programmatic scrolls are left alone. See docs/decisions.md,
 * "/e2e configurator: steps settle on scroll end, no CSS scroll-snap".
 */
function useSettleOnStep(stepsRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const list = stepsRef.current;
    if (!list) return;
    const steps = [...list.querySelectorAll<HTMLElement>(STEP_SELECTOR)];
    if (steps.length < 2) return;

    // Passive wheel handlers run after the page has already moved, so the
    // direction comes from where the page last came to rest.
    let restY = window.scrollY;
    // The visitor's scroll stays theirs through any momentum until it ends;
    // input that scrolled a panel or nothing expires unclaimed.
    let lastInputAt = Number.NEGATIVE_INFINITY;
    let userScrolling = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const inputJustHappened = () => performance.now() - lastInputAt < INPUT_TO_SCROLL_MS;
    const markUserScroll = () => {
      lastInputAt = performance.now();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(event.key) || !(event.target instanceof Element)) return;
      if (event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === " " && event.target.closest("button, a, summary")) return;
      markUserScroll();
    };

    const settle = () => {
      const moved = window.scrollY - restY;
      restY = window.scrollY;
      const fromUser = userScrolling || inputJustHappened();
      userScrolling = false;
      lastInputAt = Number.NEGATIVE_INFINITY;
      if (!fromUser || !isDesktopViewport()) return;
      const centers = stepCenters(steps);
      const mid = window.innerHeight / 2;
      const last = centers.length - 1;
      const margin = (centers[1] - centers[0]) / 2;
      if (mid < centers[0] - margin || mid > centers[last] + margin) return;
      const nearest = centers.reduce(
        (best, center, index) =>
          Math.abs(center - mid) < Math.abs(centers[best] - mid) ? index : best,
        0,
      );
      const offset = centers[nearest] - mid;
      if (Math.abs(offset) < 2) return;
      if (nearest === last && offset < 0 && moved > 0) return;
      if (nearest === 0 && offset > 0 && moved < 0) return;
      window.scrollBy({ top: offset, behavior: prefersReducedMotion() ? "instant" : "smooth" });
    };

    const supportsScrollEnd = "onscrollend" in window;
    const onScroll = () => {
      if (inputJustHappened()) userScrolling = true;
      if (supportsScrollEnd) return;
      clearTimeout(fallback);
      fallback = setTimeout(settle, SETTLE_FALLBACK_MS);
    };
    window.addEventListener("wheel", markUserScroll, { passive: true });
    window.addEventListener("touchmove", markUserScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (supportsScrollEnd) window.addEventListener("scrollend", settle);
    return () => {
      clearTimeout(fallback);
      window.removeEventListener("wheel", markUserScroll);
      window.removeEventListener("touchmove", markUserScroll);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scrollend", settle);
      window.removeEventListener("scroll", onScroll);
    };
  }, [stepsRef]);
}

/**
 * Tracks the configurator steps against the reading line (level with the
 * centered sticky terminal on desktop, near the viewport bottom on mobile).
 *
 * - `revealedThrough`: steps up to this index have dissolved in; they reveal
 *   once, early, while still low on screen, and stay visible.
 * - `activeStep`: the step at the reading line, in both scroll directions; the
 *   terminal's highlight switches later than the reveal.
 */
export function useStepScroll() {
  const stepsRef = useRef<HTMLDivElement>(null);
  const [revealedThrough, setRevealedThrough] = useState(-1);
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    const list = stepsRef.current;
    if (!list) return;
    const steps = [...list.querySelectorAll<HTMLElement>(STEP_SELECTOR)];

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const desktop = isDesktopViewport();
      const revealZone = desktop ? vh * 0.72 : vh * 0.9;
      const activeZone = desktop ? vh * 0.55 : vh * 0.9;
      let active = -1;
      let revealed = -1;
      steps.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const anchor = rect.top + Math.min(rect.height, 260) / 2;
        if (anchor < activeZone) active = index;
        if (anchor < revealZone) revealed = index;
      });
      setActiveStep(active);
      setRevealedThrough((current) => Math.max(current, revealed));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useSettleOnStep(stepsRef);

  return { stepsRef, revealedThrough, activeStep };
}
