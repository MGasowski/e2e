"use client";

import { Children, type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { onTabKeyDown } from "./code-group";

/** Content tabs (`<Tabs><Tab title="iOS">`). `titles` comes from the build, one per `<Tab>`. */
export function Tabs({ titles, children }: { titles: string; children: ReactNode }) {
  const names = JSON.parse(titles) as string[];
  const panels = Children.toArray(children);
  const [active, setActive] = useState(0);
  const id = useId();
  return (
    <div className="docs-tabs">
      <div role="tablist" className="docs-tabs-list no-scrollbar" onKeyDown={(event) => onTabKeyDown(event, names.length, active, setActive)}>
        {names.map((name, index) => (
          <button
            key={`${name}-${index}`}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            className={cn("docs-tabs-tab", index === active && "is-active")}
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
          className="docs-tabs-panel"
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
