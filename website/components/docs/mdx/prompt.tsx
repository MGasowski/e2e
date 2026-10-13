"use client";

import { Check, Copy } from "lucide-react";
import { useCopy } from "../use-copy";

const cursorUrl = (prompt: string) => `https://cursor.com/link/prompt?text=${encodeURIComponent(prompt)}`;

/** A prompt for a coding agent, with a copy button and a link that opens it in Cursor (Mintlify's `<Prompt>`). */
export function Prompt({ description, actions = ["copy"] }: { description: string; actions?: string[] }) {
  const { copied, copy } = useCopy();
  return (
    <div className="docs-prompt">
      <p className="docs-prompt-text">{description}</p>
      <div className="docs-prompt-actions">
        {actions.includes("copy") && (
          <button type="button" className="docs-button" onClick={() => void copy(description)}>
            {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" strokeWidth={1.6} />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        )}
        {actions.includes("cursor") && (
          <a className="docs-button" href={cursorUrl(description)} target="_blank" rel="noreferrer">
            Open in Cursor
          </a>
        )}
      </div>
    </div>
  );
}
