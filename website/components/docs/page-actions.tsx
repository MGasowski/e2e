"use client";

import { Check, ChevronDown, Copy, FileText } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { SiClaude, SiOpenai } from "react-icons/si";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { useCopy } from "./use-copy";
import { onMenuKeyDown, useDismiss } from "./use-dismiss";

// eslint-disable-next-line @next/next/no-img-element -- small static brand marks
const brand = (src: string) => <img src={src} alt="" aria-hidden="true" className="docs-menu-tool-icon size-4" />;

const ask = (url: string) => `Read this documentation page, so I can ask questions about it:\n\n${url}`;

/** Where the menu sends a reader to ask an AI tool about the page (Mintlify's contextual menu, as `docs.json` set it). */
const TOOLS: { label: string; description: string; icon: ReactNode; href: (url: string) => string }[] = [
  {
    label: "Open in ChatGPT",
    description: "Ask questions about this page",
    icon: <SiOpenai aria-hidden="true" className="size-4" />,
    href: (url) => `https://chatgpt.com/?hints=search&q=${encodeURIComponent(ask(url))}`,
  },
  {
    label: "Open in Claude",
    description: "Ask questions about this page",
    icon: <SiClaude aria-hidden="true" className="size-4" />,
    href: (url) => `https://claude.ai/new?q=${encodeURIComponent(ask(url))}`,
  },
  {
    label: "Open in Codex",
    description: "Ask Codex about this page",
    icon: brand("/docs/images/contextual/codex.svg"),
    href: (url) => `codex://new?prompt=${encodeURIComponent(ask(url))}`,
  },
  {
    label: "Open in Claude Code",
    description: "Ask Claude Code about this page",
    icon: brand("/docs/images/contextual/claude-code.svg"),
    href: (url) => `claude-cli://open?q=${encodeURIComponent(ask(url))}`,
  },
  {
    label: "Open in Cursor",
    description: "Ask Cursor about this page",
    icon: brand("/docs/images/contextual/cursor.svg"),
    href: (url) => `https://cursor.com/link/prompt?text=${encodeURIComponent(ask(url))}`,
  },
];

const fetched = new Map<string, Promise<string>>();

const loadMarkdown = (path: string) => {
  let pending = fetched.get(path);
  if (!pending) {
    pending = fetch(path).then((response) => {
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.text();
    });
    pending.catch(() => fetched.delete(path));
    fetched.set(path, pending);
  }
  return pending;
};

/**
 * "Copy page" and its menu beside the page title: the page as markdown, to
 * copy or view, and links that hand it to an AI tool. `markdownPath` is the
 * page's `.md` twin; `markdownUrl` is its address on the published site.
 */
export function PageActions({ markdownPath, markdownUrl }: { markdownPath: string; markdownUrl: string }) {
  const { copied, copy } = useCopy();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const copyPage = () => {
    analytics.track(analyticsEvents.docsPageCopied);
    void copy(() => loadMarkdown(markdownPath));
  };

  return (
    <div id="page-context-menu" ref={root} className="docs-page-actions">
      <button type="button" className="docs-page-actions-copy" onClick={copyPage} onPointerEnter={() => void loadMarkdown(markdownPath).catch(() => {})}>
        {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" strokeWidth={1.6} />}
        <span>Copy page</span>
      </button>
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="docs-page-actions-more"
        onClick={() => setOpen(!open)}
      >
        <ChevronDown aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
      </button>
      {open && (
        <div role="menu" aria-label="Page actions" className="docs-menu right-0 w-72" onKeyDown={onMenuKeyDown}>
          <button
            type="button"
            role="menuitem"
            className="docs-menu-item is-rich"
            onClick={() => {
              copyPage();
              close();
            }}
          >
            <Copy aria-hidden="true" className="size-4" strokeWidth={1.6} />
            <span className="flex flex-col">
              <span>Copy page</span>
              <span className="docs-menu-item-description">Copy the page as markdown for LLMs</span>
            </span>
          </button>
          <a role="menuitem" className="docs-menu-item is-rich" href={markdownPath} target="_blank" rel="noreferrer" onClick={close}>
            <FileText aria-hidden="true" className="size-4" strokeWidth={1.6} />
            <span className="flex flex-col">
              <span>View as Markdown</span>
              <span className="docs-menu-item-description">View this page as plain text</span>
            </span>
          </a>
          {TOOLS.map((tool) => (
            <a
              key={tool.label}
              role="menuitem"
              className="docs-menu-item is-rich"
              href={tool.href(markdownUrl)}
              target="_blank"
              rel="noreferrer"
              onClick={close}
            >
              {tool.icon}
              <span className="flex flex-col">
                <span>{tool.label}</span>
                <span className="docs-menu-item-description">{tool.description}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
