"use client";

import { useEffect, useRef } from "react";
import { revealDelay } from "./reveal-style";

const BLOCKS: { text: string; highlight?: boolean }[][] = [
  [{ text: "Most AI tests start from scratch." }, { text: "Every single time." }],
  [
    { text: "e2e remembers your agent's actions", highlight: true },
    { text: "and replays them when possible," },
    { text: "without calling the model again." },
  ],
  [{ text: "Less repeated reasoning." }, { text: "Fewer tokens. Lower costs.", highlight: true }],
];

/**
 * Scroll-lit manifesto in the Powder style: the block nearest the viewport
 * middle is fully lit and the rest dim toward the design's 20%, in both
 * scroll directions. Brightness is smoothed over time (fast attack, slower
 * release) instead of snapped to position, so a fast flick still flashes
 * every block one by one as it crosses the middle.
 */
export function E2eWhy() {
  const blockRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    const current = BLOCKS.map(() => 0.2);
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const vh = window.innerHeight;
      const focus = vh * 0.5;
      const inner = vh * 0.06;
      const outer = vh * 0.22;

      const dists = blockRefs.current.map((el) => {
        if (!el) return Infinity;
        const rect = el.getBoundingClientRect();
        return Math.abs(rect.top + rect.height / 2 - focus);
      });
      const nearest = dists.indexOf(Math.min(...dists));

      let settling = false;
      blockRefs.current.forEach((el, index) => {
        if (!el) return;
        const dist = dists[index];
        const t = Math.min(1, Math.max(0, 1 - (dist - inner) / (outer - inner)));
        const eased = t * t * (3 - 2 * t);
        // the nearest block is always fully lit while the section is on
        // screen, so no scroll speed can skip past a block unlit
        const target = index === nearest && dist < vh * 0.45 ? 1 : 0.2 + 0.8 * eased;
        const rate = target > current[index] ? 20 : 8;
        current[index] += (target - current[index]) * (1 - Math.exp(-rate * dt));
        if (Math.abs(target - current[index]) > 0.002) settling = true;
        else current[index] = target;
        el.style.opacity = current[index].toFixed(3);
        // key lines turn accent-orange only while their block is lit
        el.toggleAttribute("data-lit", current[index] > 0.85);
      });
      if (settling) raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <section className="mx-auto flex w-full max-w-[608px] flex-col gap-10 px-6 pt-[90px] md:pt-[200px]">
      <p
        data-reveal
        className="font-mono text-xs uppercase leading-[23px] tracking-[0.05em] text-white/70"
      >
        [01] Why e2e
      </p>
      {BLOCKS.map((lines, index) => (
        <p
          key={lines[0].text}
          ref={(node) => {
            blockRefs.current[index] = node;
          }}
          data-reveal-slide
          style={revealDelay(index + 1)}
          className="group text-[clamp(26px,2.5vw,32px)] leading-[1.375] text-ta-sand-50 opacity-20"
        >
          {lines.map((line, lineIndex) => (
            <span
              key={line.text}
              className={
                line.highlight
                  ? "transition-colors duration-[350ms] ease-out group-data-lit:text-ta-orange-300"
                  : undefined
              }
            >
              {lineIndex > 0 && <br />}
              {line.text}
            </span>
          ))}
        </p>
      ))}
    </section>
  );
}
