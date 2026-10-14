"use client";

import { Check, Copy } from "lucide-react";
import { Fragment } from "react";
import { useCopy } from "../use-copy";

const cursorUrl = (prompt: string) => `https://cursor.com/link/prompt?text=${encodeURIComponent(prompt)}`;

/** The prompt's text as Mintlify shows it: a paragraph per blank-line block, `code` in backticks. */
function PromptText({ text }: { text: string }) {
  return (
    <div className="docs-prompt-text">
      {text.split(/\n{2,}/).map((block, index) => (
        <p key={index} className="whitespace-pre-line">
          {block.split(/(`[^`\n]+`)/).map((part, partIndex) =>
            part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
              <code key={partIndex}>{part.slice(1, -1)}</code>
            ) : (
              <Fragment key={partIndex}>{part}</Fragment>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

function CursorIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3" fill="currentColor">
      <path d="M11.925 24 22.35 18V6L11.925 0 1.5 6v12l10.425 6Zm0-2.31L3.5 16.82V7.18l8.425 4.87v9.64Zm1-9.64 8.425-4.87v9.64l-8.425 4.87v-9.64ZM4.5 5.44 11.925 1.15l7.425 4.29-7.425 4.29L4.5 5.44Z" />
    </svg>
  );
}

/** A prompt for a coding agent, with a copy button and a link that opens it in Cursor (Mintlify's `<Prompt>`). */
export function Prompt({ description, actions = ["copy"] }: { description: string; actions?: string[] }) {
  const { copied, copy } = useCopy();
  return (
    <div className="docs-prompt">
      <PromptText text={description} />
      <div className="docs-prompt-actions">
        {actions.includes("copy") && (
          <button
            type="button"
            aria-label="Copy prompt"
            title={copied ? "Copied" : "Copy prompt"}
            className="docs-button docs-prompt-copy"
            onClick={() => void copy(description)}
          >
            {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" strokeWidth={1.5} />}
          </button>
        )}
        {actions.includes("cursor") && (
          <a className="docs-button" href={cursorUrl(description)} target="_blank" rel="noreferrer">
            <CursorIcon />
            Open in Cursor
          </a>
        )}
      </div>
    </div>
  );
}
