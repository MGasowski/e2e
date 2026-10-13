"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { E2E_OUTLINE_BUTTON } from "./outline-button";

/**
 * Bento grid shell for the server-rendered testimonial cards. Every card is in
 * the HTML so all post links stay crawlable; the extras are display:none until
 * "Show more" flips data-expanded on the group. Cards keep source order (no
 * dense packing), so testimonials.json is ordered to fill whole rows.
 */
export function TestimonialsExpander({
  hiddenCount,
  children,
}: {
  hiddenCount: number;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const expand = () => {
    // The button unmounts on expand; commit synchronously so the first revealed
    // card is focusable right away (React's documented flushSync use).
    flushSync(() => setExpanded(true));
    listRef.current?.querySelector<HTMLElement>("[data-testimonial-extra] a")?.focus();
    analytics.track(analyticsEvents.e2eTestimonialsExpanded, {
      location: "e2e_testimonials",
      revealed_count: hiddenCount,
    });
  };

  return (
    <div data-expanded={expanded ? "" : undefined} className="group/testimonials mt-12">
      <div className="relative">
        <ul
          ref={listRef}
          id={listId}
          aria-label="Posts about e2e on X"
          className="grid grid-cols-1 gap-px p-px md:grid-cols-2 lg:grid-cols-3"
        >
          {children}
        </ul>
        {expanded ? null : (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-background"
          />
        )}
      </div>
      {expanded ? null : (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            aria-expanded={false}
            aria-controls={listId}
            onClick={expand}
            className={cn(
              E2E_OUTLINE_BUTTON,
              "flex h-10 w-full cursor-pointer items-center justify-center gap-2 px-5 text-[13px] leading-5 sm:w-auto",
            )}
          >
            Show more
            <span className="text-white/50">({hiddenCount})</span>
          </button>
        </div>
      )}
    </div>
  );
}
