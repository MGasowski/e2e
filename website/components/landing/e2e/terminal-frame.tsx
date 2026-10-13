"use client";

import { cn } from "@/lib/utils";

type TerminalTab = { id: string; label: string };

type TerminalHeaderProps =
  | { title: string; tabs?: never; activeTab?: never; onSelectTab?: never }
  | { title?: never; tabs: TerminalTab[]; activeTab: string; onSelectTab: (id: string) => void };

/**
 * Editor-window chrome for the /e2e code mocks: a title bar with either a
 * plain filename or selectable tabs.
 */
export function TerminalFrame({
  title,
  tabs,
  activeTab,
  onSelectTab,
  children,
  className,
  bottomFade,
}: TerminalHeaderProps & {
  children: React.ReactNode;
  className?: string;
  /**
   * Dissolves the window chrome into the page background toward the bottom.
   * Sits above the frame but below the code, which stays fully readable when
   * the code layer is elevated ("relative z-20"). The bottom border is not
   * drawn: on high-DPR phones the overlay and the border can round to
   * different device pixels, leaking a hairline through the hero meadow.
   */
  bottomFade?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col border border-[rgb(78_78_78)] bg-[rgb(30_30_30)] text-left",
        bottomFade && "border-b-transparent",
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-stretch overflow-x-auto border-b border-[rgb(78_78_78)] bg-[rgb(26_26_26)]">
        <div
          aria-hidden="true"
          className="hidden shrink-0 items-center gap-1.5 px-4 min-[480px]:flex sm:px-6"
        >
          <span className="size-2 rounded-[2px] bg-[rgb(120_120_120)]" />
          <span className="size-2 rounded-[2px] bg-[rgb(120_120_120)]" />
          <span className="size-2 rounded-[2px] bg-[rgb(120_120_120)]" />
        </div>
        {tabs ? (
          <div className="flex items-stretch min-[480px]:border-l min-[480px]:border-[rgb(78_78_78)]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center whitespace-nowrap border-r border-[rgb(78_78_78)] px-4 font-mono text-[13px] transition-colors",
                  tab.id === activeTab
                    ? "bg-[rgb(30_30_30)] text-[rgb(230_237_243)]"
                    : "text-[rgb(110_110_110)] hover:bg-[rgb(30_30_30)]/60 hover:text-[rgb(180_180_180)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="flex shrink-0 items-center whitespace-nowrap px-4 font-mono text-[13px] text-[rgb(230_237_243)] min-[480px]:px-0">
            {title}
          </span>
        )}
      </div>
      {children}
      {bottomFade && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px z-10 bg-[linear-gradient(to_bottom,rgb(17_17_17/0)_8%,rgb(17_17_17/0.65)_50%,rgb(17_17_17)_82%)]"
        />
      )}
    </div>
  );
}
