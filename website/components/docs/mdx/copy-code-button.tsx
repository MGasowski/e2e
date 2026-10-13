"use client";

import { Check, Copy } from "lucide-react";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useCopy } from "../use-copy";

export function CopyCodeButton({ code, className }: { code: string; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      aria-label="Copy the contents from the code block"
      title={copied ? "Copied" : "Copy"}
      onClick={() => {
        void copy(code);
        analytics.track(analyticsEvents.docsCodeCopied);
      }}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center text-faint transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-1 focus-visible:outline-line-strong",
        className,
      )}
    >
      {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" strokeWidth={1.6} />}
    </button>
  );
}
