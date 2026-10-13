"use client";

import { type ReactNode, useState } from "react";

/** Folds a long code block to its first lines, behind a "Show more" button. */
export function Expandable({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="code-expandable" data-expanded={expanded}>
      <div className="code-expandable-body">{children}</div>
      <button
        type="button"
        className="code-expandable-toggle"
        aria-expanded={expanded}
        aria-label={expanded ? "Show less code" : "Show more code"}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}
