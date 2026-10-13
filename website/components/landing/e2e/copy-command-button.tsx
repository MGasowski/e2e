"use client";

import { Check, Copy } from "lucide-react";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { E2E_INIT_COMMAND } from "./links";
import { dispatchBurstFrom } from "./particles/burst";
import { useCopyFeedback } from "./use-copy-feedback";

const COPIED_RESET_MS = 1400;

/** Copyable shell command with a cursor-following rim glow; clicking bursts the particle scenes. */
export function CopyCommandButton({
  command = E2E_INIT_COMMAND,
  location,
  className,
}: {
  command?: string;
  location: "e2e_hero" | "e2e_footer";
  className?: string;
}) {
  const { copied, copy } = useCopyFeedback(COPIED_RESET_MS);

  const copyCommand = async (button: HTMLButtonElement) => {
    dispatchBurstFrom(button);
    if (await copy(command)) {
      analytics.track(analyticsEvents.e2eCommandCopied, { location });
    }
  };

  // the bright center of the rim glow follows the cursor along the button
  const trackPointer = (e: React.PointerEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    button.style.setProperty("--mx", `${x + 2.5}px`);
    button.style.setProperty("--my", `${y + 2.5}px`);
  };
  const resetPointer = (e: React.PointerEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    button.style.setProperty("--mx", "50%");
    button.style.setProperty("--my", "50%");
  };

  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      onClick={(event) => void copyCommand(event.currentTarget)}
      onPointerMove={trackPointer}
      onPointerLeave={resetPointer}
      className={cn("group relative h-12 min-w-[193px] cursor-pointer", className)}
    >
      <span
        aria-hidden="true"
        className="absolute -inset-[2.5px] bg-[radial-gradient(70px_50px_at_var(--mx,50%)_var(--my,50%),rgb(255_255_255/0.9)_0%,rgb(255_255_255/0.25)_40%,rgb(255_255_255/0)_72%)] opacity-45 blur-[4px] transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* The hairline is inset 0.5px so it never sits on the button's first
          device-pixel row, which Chrome's layer snapping drops nondeterministically
          at fractional layout offsets. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[0.5px] z-10 transition-shadow duration-300 inset-ring-[0.5px] inset-ring-white/80 group-hover:inset-ring-white"
      />
      <span className="relative flex h-12 min-w-[193px] items-center justify-between gap-5 bg-[rgb(22_22_22/0.9)] px-3.5">
        <span className="flex min-w-0 gap-1.5 whitespace-nowrap font-mono text-base leading-6 text-white">
          <span className="opacity-50">$</span>
          <span className="truncate">{command}</span>
        </span>
        <span className="relative size-4 shrink-0">
          <Copy
            aria-hidden="true"
            className={cn(
              "absolute inset-0 size-4 text-white transition-opacity",
              copied && "opacity-0",
            )}
          />
          <Check
            aria-hidden="true"
            className={cn(
              "absolute inset-0 size-4 text-white opacity-0 transition-opacity",
              copied && "opacity-100",
            )}
          />
        </span>
      </span>
    </button>
  );
}
