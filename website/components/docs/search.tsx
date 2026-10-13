"use client";

import { CornerDownLeft, FileText, Hash, Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { analytics, analyticsEvents } from "@/lib/analytics";
import type { SearchEntry } from "@/lib/docs/feeds";
import { cn } from "@/lib/utils";

const noSubscribe = () => () => {};

let index: Promise<SearchEntry[]> | undefined;

const loadIndex = () =>
  (index ??= fetch("/docs/search.json")
    .then((response) => (response.ok ? (response.json() as Promise<SearchEntry[]>) : []))
    .catch(() => {
      index = undefined;
      return [];
    }));

const normalize = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

/**
 * Ranks pages and sections by the words they share with the query: a match in
 * a title counts most, then the page it sits on, then its text. Every word
 * must match somewhere.
 */
function rank(entries: SearchEntry[], query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const phrase = words.join(" ");
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of entries) {
    const title = normalize(entry.title);
    const page = normalize(entry.page);
    const text = normalize(entry.text);
    let score = 0;
    let all = true;
    for (const word of words) {
      const inTitle = title.includes(word);
      const inPage = page.includes(word);
      const inText = text.includes(word);
      if (!inTitle && !inPage && !inText) {
        all = false;
        break;
      }
      score += (inTitle ? 10 : 0) + (inPage ? 3 : 0) + (inText ? 1 : 0);
      if (title.startsWith(word)) score += 4;
    }
    if (!all) continue;
    if (title === phrase) score += 40;
    else if (title.includes(phrase)) score += 20;
    if (!entry.page) score += 2;
    scored.push({ entry, score });
  }
  return scored.toSorted((a, b) => b.score - a.score).slice(0, 12).map(({ entry }) => entry);
}

/** A short excerpt of `text` around the first query word it contains. */
function excerpt(text: string, query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const lower = normalize(text);
  const at = Math.min(...words.map((word) => lower.indexOf(word)).filter((position) => position >= 0), Infinity);
  if (!Number.isFinite(at) || at < 60) return text.slice(0, 140);
  return `…${text.slice(at - 40, at + 100)}`;
}

/** The search button and its dialog; Cmd+K or Ctrl+K opens it from anywhere. */
export function Search() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [active, setActive] = useState(0);
  const shortcut = useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    () => "Ctrl K",
  );

  const results = useMemo(() => rank(entries, query), [entries, query]);

  const open = useCallback(() => {
    void loadIndex().then(setEntries);
    if (!dialog.current?.open) dialog.current?.showModal();
    input.current?.select();
  }, []);

  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => analytics.track(analyticsEvents.docsSearched, { query }), 800);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (entry: SearchEntry) => {
    close();
    router.push(entry.href);
  };

  return (
    <>
      <button type="button" aria-label="Open search" onClick={open} className="docs-search-trigger">
        <SearchIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
        <span className="docs-search-placeholder">Search…</span>
        <kbd className="docs-search-kbd">{shortcut}</kbd>
      </button>
      <dialog
        ref={dialog}
        aria-label="Search the docs"
        className="docs-search-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => setQuery("")}
      >
        <div className="docs-search-panel">
          <div className="docs-search-field">
            <SearchIcon aria-hidden="true" className="size-4 shrink-0 text-faint" strokeWidth={1.6} />
            <input
              ref={input}
              type="text"
              role="combobox"
              aria-label="Search"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
              placeholder="Search the docs…"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  setActive((current) => (current + step + results.length) % Math.max(results.length, 1));
                } else if (event.key === "Enter" && results[active]) {
                  event.preventDefault();
                  go(results[active]);
                }
              }}
            />
            <button type="button" aria-label="Close search" onClick={close} className="docs-search-kbd">
              Esc
            </button>
          </div>
          <ul id={listId} role="listbox" aria-label="Results" className="docs-search-results">
            {results.map((entry, position) => (
              <li
                key={entry.href}
                id={`${listId}-${position}`}
                role="option"
                aria-selected={position === active}
                className={cn("docs-search-result", position === active && "is-active")}
                onPointerMove={() => setActive(position)}
                onClick={() => go(entry)}
              >
                {entry.page ? (
                  <Hash aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" strokeWidth={1.6} />
                ) : (
                  <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" strokeWidth={1.6} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="docs-search-result-path">
                    {entry.path}
                    {entry.page && ` › ${entry.page}`}
                  </span>
                  <span className="docs-search-result-title">{entry.title}</span>
                  {entry.text && <span className="docs-search-result-text">{excerpt(entry.text, query)}</span>}
                </span>
                <CornerDownLeft aria-hidden="true" className="docs-search-result-enter size-3.5 shrink-0" />
              </li>
            ))}
          </ul>
          {query.trim() && results.length === 0 && entries.length > 0 && (
            <p className="docs-search-empty">No results for “{query}”</p>
          )}
        </div>
      </dialog>
    </>
  );
}
