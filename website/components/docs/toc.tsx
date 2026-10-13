"use client";

import { AlignLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { TocEntry } from "@/lib/docs/remark-docs";
import { cn } from "@/lib/utils";

/** The section the reader is in: the last heading above the top fifth of the viewport. */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  useEffect(() => {
    if (ids.length === 0) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.2 + 100;
        let current = ids[0];
        for (const id of ids) {
          const element = document.getElementById(id);
          if (element && element.getBoundingClientRect().top <= line) current = id;
        }
        // At the bottom of the page, the last sections can never reach the line.
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = ids[ids.length - 1];
        setActive(current);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ids]);
  return active;
}

/** "On this page": the page's `##` and `###` headings, with the current one marked. */
export function TableOfContents({ entries }: { entries: TocEntry[] }) {
  const [ids] = useState(() => entries.map((entry) => entry.id));
  const active = useActiveHeading(ids);
  if (entries.length === 0) return null;
  return (
    <div role="navigation" aria-label="On this page" className="docs-toc">
      <p className="docs-toc-heading">
        <AlignLeft aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
        On this page
      </p>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={cn("docs-toc-link", entry.depth === 3 && "is-nested", entry.id === active && "is-active")}
              aria-current={entry.id === active ? "location" : undefined}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
