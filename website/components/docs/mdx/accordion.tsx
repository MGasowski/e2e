"use client";

import { ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";

/** A titled section that opens in place, a native `<details>` that also reports its state on the summary. */
export function Accordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="docs-accordion" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary aria-expanded={open}>
        <ChevronRight aria-hidden="true" className="docs-accordion-chevron size-4" strokeWidth={1.6} />
        <span>{title}</span>
      </summary>
      <div className="docs-accordion-body">{children}</div>
    </details>
  );
}
