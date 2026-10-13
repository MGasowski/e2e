"use client";

import { Children, type KeyboardEvent, type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { chooseCodeTab, useCodeTabChoice } from "../code-tab-choice";

/** Moves focus and selection between tabs with the arrow keys, Home, and End (WAI-ARIA tabs). */
export function onTabKeyDown(event: KeyboardEvent<HTMLElement>, count: number, current: number, select: (index: number) => void) {
  const keys: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: count - 1 };
  if (!(event.key in keys)) return;
  event.preventDefault();
  const next = (keys[event.key] + count) % count;
  select(next);
  const tabs = event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]');
  tabs[next]?.focus();
}

/**
 * Tabs over code blocks, one per package manager or language. Picking a tab
 * picks it in every group that has one with the same label, here and on later pages.
 */
export function CodeGroup({ labels, children }: { labels: string; children: ReactNode }) {
  const names = JSON.parse(labels) as string[];
  const panels = Children.toArray(children);
  const choice = useCodeTabChoice();
  const [local, setLocal] = useState(0);
  const chosen = choice === null ? -1 : names.indexOf(choice);
  const active = chosen === -1 ? local : chosen;
  const id = useId();

  const select = (index: number) => {
    setLocal(index);
    chooseCodeTab(names[index]);
  };

  return (
    <div className="code-group not-prose">
      <div
        role="tablist"
        aria-label="Code examples"
        className="code-group-tabs no-scrollbar"
        onKeyDown={(event) => onTabKeyDown(event, names.length, active, select)}
      >
        {names.map((name, index) => (
          <button
            key={`${name}-${index}`}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index)}
            className={cn("code-group-tab", index === active && "is-active")}
          >
            {name}
          </button>
        ))}
      </div>
      {panels.map((panel, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={index !== active}
          className="relative"
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
