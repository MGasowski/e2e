"use client";

import { ArrowUpRight, Check, ChevronDown, Copy } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { SiClaude, SiOpenai } from "react-icons/si";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { useCopy } from "./use-copy";
import { onMenuKeyDown, useDismiss } from "./use-dismiss";

// eslint-disable-next-line @next/next/no-img-element -- small static brand marks
const brand = (src: string) => <img src={src} alt="" aria-hidden="true" className="docs-menu-tool-icon size-4" />;

const ask = (url: string) => `Read this documentation page, so I can ask questions about it:\n\n${url}`;

/** Where the menu sends a reader to ask an AI tool about the page (Mintlify's contextual menu, as `docs.json` set it). */
const TOOLS: { label: string; icon: ReactNode; external: boolean; href: (url: string) => string }[] = [
  {
    label: "Open in ChatGPT",
    icon: <SiOpenai aria-hidden="true" className="size-4" />,
    external: true,
    href: (url) => `https://chatgpt.com/?hints=search&q=${encodeURIComponent(ask(url))}`,
  },
  {
    label: "Open in Codex",
    icon: brand("/docs/images/contextual/codex.svg"),
    external: false,
    href: (url) => `codex://new?prompt=${encodeURIComponent(ask(url))}`,
  },
  {
    label: "Open in Claude",
    icon: <SiClaude aria-hidden="true" className="size-4" />,
    external: true,
    href: (url) => `https://claude.ai/new?q=${encodeURIComponent(ask(url))}`,
  },
  {
    label: "Open in Claude Code",
    icon: brand("/docs/images/contextual/claude-code.svg"),
    external: false,
    href: (url) => `claude-cli://open?q=${encodeURIComponent(ask(url))}`,
  },
  {
    label: "Open in Cursor",
    icon: brand("/docs/images/contextual/cursor.svg"),
    external: true,
    href: (url) => `https://cursor.com/link/prompt?text=${encodeURIComponent(ask(url))}`,
  },
];

/** Mintlify's Markdown mark: an M and a down arrow in a rounded frame. */
function MarkdownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 15V9l3 3 3-3v6M17 9v6m-2.5-2.5L17 15l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuItemContent({ icon, label, external }: { icon: ReactNode; label: string; external?: boolean }) {
  return (
    <>
      <span className="docs-menu-icon">{icon}</span>
      <span>{label}</span>
      {external && <ArrowUpRight aria-hidden="true" className="docs-menu-external size-3" strokeWidth={1.6} />}
    </>
  );
}

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
        <ChevronDown aria-hidden="true" className="docs-page-actions-chevron size-3.5" strokeWidth={1.6} />
      </button>
      {open && (
        <div role="menu" aria-label="Page actions" className="docs-menu docs-page-menu right-0" onKeyDown={onMenuKeyDown}>
          <button
            type="button"
            role="menuitem"
            className="docs-menu-item"
            onClick={() => {
              copyPage();
              close();
            }}
          >
            <MenuItemContent icon={<Copy aria-hidden="true" className="size-4" strokeWidth={1.5} />} label="Copy page" />
          </button>
          <a role="menuitem" className="docs-menu-item" href={markdownPath} target="_blank" rel="noreferrer" onClick={close}>
            <MenuItemContent icon={<MarkdownIcon />} label="View as Markdown" external />
          </a>
          {TOOLS.map((tool) => (
            <a
              key={tool.label}
              role="menuitem"
              className="docs-menu-item"
              href={tool.href(markdownUrl)}
              target="_blank"
              rel="noreferrer"
              onClick={close}
            >
              <MenuItemContent icon={tool.icon} label={tool.label} external={tool.external} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
