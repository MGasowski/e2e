"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { ArrowRightIcon } from "./arrow-icons";
import { prefersReducedMotion } from "./media";
import { dispatchBurstFrom } from "./particles/burst";
import { PortraitCanvas } from "./particles/portrait-canvas";
import { LIVE_SESSION_ENDS } from "./sessions/save-seat";
import { INTRO_SESSION } from "./sessions/sessions-data";

/** Breath after hydration so the build-up isn't lost in the page's own paint. */
const APPEAR_DELAY_MS = 600;

const DISSOLVE_PITCH = 7;
/* The page-load entrance earns a slow build-up; minimize/expand replays the
   same pixel effect fast so toggling never feels sluggish. */
const ENTRANCE_DISSOLVE_MS = 800;
const TOGGLE_DISSOLVE_MS = 180;
const ENTRANCE_PORTRAIT_MS = 650;
/** Toggles draw the cached portrait instantly; only the entrance assembles. */
const TOGGLE_PORTRAIT_MS = 0;

/** Analytics `location` of the banner's events. */
const LOCATION = "e2e_webinar_banner";

const trackCta = () => analytics.track(analyticsEvents.e2eWebinarCtaClicked, { location: LOCATION });

/**
 * Materializes `el` out of square pixels: a canvas mask starts empty and fills
 * cell by cell in random order, so the banner assembles from bitmap particles
 * like the page's other canvases. Runs via useLayoutEffect so the first frame
 * is already fully masked (no flash of the finished banner).
 */
function usePixelDissolve<T extends HTMLElement>(durationMs: number) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const cols = Math.ceil(rect.width / DISSOLVE_PITCH);
    const rows = Math.ceil(rect.height / DISSOLVE_PITCH);
    const canvas = document.createElement("canvas");
    canvas.width = cols * DISSOLVE_PITCH;
    canvas.height = rows * DISSOLVE_PITCH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // biased toward filling bottom rows first, so the tile visibly builds
    // upward from the page edge instead of reading as a uniform fade
    const thresholds = Float32Array.from(
      { length: cols * rows },
      (_, c) => Math.random() * 0.55 + (1 - ((c / cols) | 0) / rows) * 0.45,
    );

    const clearMask = () => {
      el.style.removeProperty("-webkit-mask-image");
      el.style.removeProperty("mask-image");
      el.style.removeProperty("-webkit-mask-size");
      el.style.removeProperty("mask-size");
    };
    const applyMask = (eased: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgb(255, 255, 255)";
      for (let c = 0; c < thresholds.length; c++) {
        if (thresholds[c] > eased) continue;
        ctx.fillRect(
          (c % cols) * DISSOLVE_PITCH,
          ((c / cols) | 0) * DISSOLVE_PITCH,
          DISSOLVE_PITCH,
          DISSOLVE_PITCH,
        );
      }
      const url = `url(${canvas.toDataURL()})`;
      el.style.setProperty("-webkit-mask-image", url);
      el.style.setProperty("mask-image", url);
      el.style.setProperty("-webkit-mask-size", "100% 100%");
      el.style.setProperty("mask-size", "100% 100%");
    };

    applyMask(0);
    let raf = 0;
    // the clock starts on the first painted frame, not at effect time:
    // hydration can block the main thread past DISSOLVE_MS and the animation
    // would clear itself before ever drawing
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      if (t >= 1) {
        clearMask();
        return;
      }
      applyMask(t * t * (3 - 2 * t));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearMask();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [durationMs]);

  return ref;
}

/**
 * Floating "Intro to e2e" webinar invite, pinned to the bottom
 * right: the host portrait renders as a still point cloud, "Save my seat"
 * leads to the session's page, and the card minimizes to a compact bar.
 */
export function E2eWebinarBanner() {
  const [view, setView] = useState<"hidden" | "card" | "bar">("hidden");
  // Phones only get the full-screen sheet (with its dimmed overlay) when the
  // visitor taps the bar. A desktop window narrowed to phone width keeps the
  // bar instead of covering the page with a sheet nobody asked for.
  const [sheetRequested, setSheetRequested] = useState(false);
  // Set by the first minimize or expand: later dissolves run fast.
  const [quick, setQuick] = useState(false);

  // Every visit resets: desktop opens with the full card, phones with the
  // docked bar (the sheet would cover too much unasked). Minimizing lasts
  // only until the next page load.
  useEffect(() => {
    if (Date.now() >= LIVE_SESSION_ENDS) return;
    const desktop = window.matchMedia("(min-width: 40rem)").matches;
    const timer = window.setTimeout(() => setView(desktop ? "card" : "bar"), APPEAR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (view === "hidden") return null;

  const minimize = () => {
    setQuick(true);
    setSheetRequested(false);
    setView("bar");
    analytics.track(analyticsEvents.e2eWebinarBannerMinimized, { location: LOCATION });
  };
  const expand = () => {
    setQuick(true);
    setSheetRequested(true);
    setView("card");
  };

  return (
    <aside
      aria-label="Live session: Intro to e2e"
      data-floating-promo=""
      className="fixed inset-x-0 bottom-0 z-40 sm:inset-x-auto sm:bottom-6 sm:right-6"
    >
      {view === "card" ? (
        <>
          <div className="max-sm:hidden">
            <WebinarCard onMinimize={minimize} quick={quick} />
          </div>
          <div className="sm:hidden">
            {sheetRequested ? (
              <MobileSheet onClose={minimize} quick={quick} />
            ) : (
              <MobileDockBar onExpand={expand} quick={quick} />
            )}
          </div>
        </>
      ) : (
        <>
          <div className="max-sm:hidden">
            <WebinarBar onExpand={expand} quick={quick} />
          </div>
          <div className="sm:hidden">
            <MobileDockBar onExpand={expand} quick={quick} />
          </div>
        </>
      )}
    </aside>
  );
}

/**
 * Phone expanded state per the mobile design: a full-width panel docked to the
 * bottom edge (not floating) over a dimmed page, with "Save my seat" leading
 * to the session's page, closable back down to the docked bar.
 */
function MobileSheet({ onClose, quick }: { onClose: () => void; quick: boolean }) {
  const ref = usePixelDissolve<HTMLDivElement>(quick ? TOGGLE_DISSOLVE_MS : ENTRANCE_DISSOLVE_MS);

  return (
    <>
      <div aria-hidden className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="relative border-t border-white/20 bg-ta-grey-500 p-5 pb-6">
        <div className="absolute right-8 top-10 h-[180px] w-[140px]">
          <PortraitCanvas
            options={{
              revealMs: quick ? TOGGLE_PORTRAIT_MS : ENTRANCE_PORTRAIT_MS,
              interactive: false,
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-ta-grey-500" />
        </div>
        <div className="relative flex items-start justify-between">
          <p className="font-mono text-[11px] uppercase leading-4 tracking-[0.05em] text-white">
            Live session + Q&amp;A
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close live session banner"
            className="-mr-2.5 -mt-2.5 flex size-10 items-center justify-center text-white/80 transition-colors hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
              <path
                d="M2 2L12 12M12 2L2 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="square"
              />
            </svg>
          </button>
        </div>
        <p className="relative mt-1 pr-[172px] font-mono text-[11px] uppercase leading-4 tracking-[0.05em] text-white/70">
          {INTRO_SESSION.dateDayLabel}
          <br />
          {INTRO_SESSION.times[0]} · {INTRO_SESSION.times[1]}
          <br />
          {INTRO_SESSION.times[2]}
        </p>
        <p className="relative mt-4 pr-[172px] text-3xl leading-9 tracking-[-0.02em] text-ta-sand-50">
          Intro to e2e
        </p>
        <Link
          href={INTRO_SESSION.path}
          onClick={trackCta}
          className="relative mt-5 flex h-12 w-full items-center justify-center gap-2.5 bg-white/90 font-mono text-xs uppercase text-ta-grey-500 transition-colors inset-ring-[0.5px] inset-ring-white/80 hover:bg-white"
        >
          Save my seat
          <ArrowRightIcon />
        </Link>
      </div>
    </>
  );
}

/** Phone collapsed state: a slim full-width strip docked to the bottom edge. */
function MobileDockBar({ onExpand, quick }: { onExpand: () => void; quick: boolean }) {
  const ref = usePixelDissolve<HTMLButtonElement>(
    quick ? TOGGLE_DISSOLVE_MS : ENTRANCE_DISSOLVE_MS,
  );

  return (
    <button
      ref={ref}
      type="button"
      onClick={onExpand}
      aria-label="Expand live session banner"
      className="relative flex h-14 w-full items-center border-t border-white/20 bg-ta-grey-500 text-left"
    >
      <span className="relative block h-full w-14 shrink-0 self-stretch overflow-hidden">
        <PortraitCanvas
          options={{
            revealMs: quick ? TOGGLE_PORTRAIT_MS : ENTRANCE_PORTRAIT_MS,
            interactive: false,
            zoom: 1.15,
            focusY: 0.44,
          }}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-3">
        <span className="truncate font-mono text-[9px] uppercase leading-3 tracking-[0.08em] text-white/50">
          Oct 22 · {INTRO_SESSION.timesLabel}
        </span>
        <span className="truncate text-sm leading-[18px] tracking-[-0.01em] text-ta-sand-50">
          Intro to e2e
        </span>
      </span>
      <span className="mr-2 flex size-10 shrink-0 items-center justify-center text-white">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
          <path
            d="M2 8L6 4L10 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="square"
          />
        </svg>
      </span>
    </button>
  );
}

function WebinarCard({ onMinimize, quick }: { onMinimize: () => void; quick: boolean }) {
  const ref = usePixelDissolve<HTMLDivElement>(quick ? TOGGLE_DISSOLVE_MS : ENTRANCE_DISSOLVE_MS);

  useEffect(() => {
    if (ref.current) dispatchBurstFrom(ref.current);
  }, [ref]);

  return (
    <div
      ref={ref}
      className="relative flex h-[204px] w-[min(365px,calc(100vw-32px))] flex-col border border-white/20 bg-ta-grey-500 p-4 shadow-[0_20px_48px_rgb(0_0_0/0.45)]"
    >
      <div className="absolute right-0 top-0 h-[136px] w-[146px]">
        <PortraitCanvas
          options={{
            revealMs: quick ? TOGGLE_PORTRAIT_MS : ENTRANCE_PORTRAIT_MS,
            interactive: true,
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-ta-grey-500" />
      </div>
      <div className="relative flex flex-col gap-1.5 pr-[150px]">
        <p className="font-mono text-[10px] uppercase leading-3.5 tracking-[0.05em] text-white">
          Live session + Q&amp;A
        </p>
        <p className="text-xl leading-6 tracking-[-0.02em] text-ta-sand-50">
          Intro to
          <br />
          e2e
        </p>
      </div>
      <div className="relative mb-2.5 mt-auto flex items-start justify-between gap-3">
        <span className="whitespace-nowrap font-mono text-[11px] uppercase leading-4 tracking-[0.05em] text-white/70">
          {INTRO_SESSION.dateDayLabel}
          <br />
          {INTRO_SESSION.times[0]} · {INTRO_SESSION.times[1]}
          <br />
          {INTRO_SESSION.times[2]}
        </span>
        <span className="min-w-0 self-end truncate font-mono text-[10px] uppercase leading-4 tracking-[0.02em] text-white">
          Kacper · DevRel, e2e
        </span>
      </div>
      <Link
        href={INTRO_SESSION.path}
        onClick={trackCta}
        className="relative flex h-9 w-full items-center justify-center gap-2.5 bg-white/90 font-mono text-xs uppercase text-ta-grey-500 transition-colors inset-ring-[0.5px] inset-ring-white/80 hover:bg-white"
      >
        Save my seat
        <ArrowRightIcon />
      </Link>
      <button
        type="button"
        onClick={onMinimize}
        aria-label="Minimize live session banner"
        className="absolute right-0 top-0 z-10 flex size-10 items-center justify-center text-white/90 transition-colors hover:text-white"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="shrink-0">
          <path
            d="M2.67 9.33H6.67V13.33M13.33 6.67H9.33V2.67M9.33 6.67L14 2M2 14L6.67 9.33"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function WebinarBar({ onExpand, quick }: { onExpand: () => void; quick: boolean }) {
  const ref = usePixelDissolve<HTMLButtonElement>(
    quick ? TOGGLE_DISSOLVE_MS : ENTRANCE_DISSOLVE_MS,
  );

  return (
    <button
      ref={ref}
      type="button"
      onClick={onExpand}
      aria-label="Expand live session banner"
      className="relative flex h-11 w-[272px] items-center border border-white/20 bg-ta-grey-500 text-left transition-colors hover:border-white/40"
    >
      <span className="relative block h-full w-11 shrink-0 self-stretch overflow-hidden">
        <PortraitCanvas
          options={{
            revealMs: quick ? TOGGLE_PORTRAIT_MS : ENTRANCE_PORTRAIT_MS,
            interactive: false,
            zoom: 1.15,
            focusY: 0.44,
          }}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-3">
        <span className="truncate font-mono text-[9px] uppercase leading-3 tracking-[0.08em] text-white/50">
          Live session + Q&amp;A
        </span>
        <span className="truncate text-sm leading-[18px] tracking-[-0.01em] text-ta-sand-50">
          Intro to e2e
        </span>
      </span>
      <span className="flex size-9 shrink-0 items-center justify-center text-white">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
          <path
            d="M2.5 9.5L9.5 2.5M4 2.5H9.5V8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="square"
          />
        </svg>
      </span>
    </button>
  );
}
