"use client";

import { type ReactNode, useState } from "react";

/** A titled section that opens in place, a native `<details>` that also reports its state on the summary. */
export function Accordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="docs-accordion" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary aria-expanded={open}>
        <span aria-hidden="true" className="docs-accordion-chevron">
          {/* Mintlify's solid caret, pointing right while closed. */}
          <svg viewBox="0 0 18 18" fill="currentColor" className="size-3">
            <path d="M6.2 3.6a.8.8 0 0 1 1.25-.66l6.6 5.4a.85.85 0 0 1 0 1.32l-6.6 5.4a.8.8 0 0 1-1.25-.66z" />
          </svg>
        </span>
        <span>{title}</span>
      </summary>
      <div className="docs-accordion-body">{children}</div>
    </details>
  );
}
