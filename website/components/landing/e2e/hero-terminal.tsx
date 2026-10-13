"use client";

import { useEffect, useRef, useState } from "react";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { CODE_COLORS } from "./code-colors";
import {
  DOC_TOOLTIP_MAX_WIDTH,
  DocTooltip,
  type DocTooltipPlacement,
  type DocTooltipState,
} from "./hero-doc-tooltip";
import { HERO_EXAMPLES, type HeroDoc } from "./hero-examples";
import { TerminalFrame } from "./terminal-frame";

const SHOW_DELAY_MS = 150;

function placeTooltip(target: HTMLElement): DocTooltipPlacement {
  if (window.matchMedia("(max-width: 639px)").matches) return { kind: "centered" };
  const rect = target.getBoundingClientRect();
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - DOC_TOOLTIP_MAX_WIDTH - 12));
  return rect.top > 200
    ? { kind: "anchored", left, bottom: window.innerHeight - rect.top + 6 }
    : { kind: "anchored", left, top: rect.bottom + 6 };
}

export function HeroTerminal() {
  const [activeTab, setActiveTab] = useState(HERO_EXAMPLES[0].id);
  const [tooltip, setTooltip] = useState<DocTooltipState | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(showTimer.current), []);

  useEffect(() => {
    if (!tooltip) return;
    const hide = () => setTooltip(null);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", hide, { capture: true });
  }, [tooltip]);

  const example = HERO_EXAMPLES.find((e) => e.id === activeTab) ?? HERO_EXAMPLES[0];

  const scheduleTooltip = (doc: HeroDoc, target: HTMLElement) => {
    clearTimeout(showTimer.current);
    const placement = placeTooltip(target);
    showTimer.current = setTimeout(() => setTooltip({ doc, placement }), SHOW_DELAY_MS);
  };

  const hideTooltip = () => {
    clearTimeout(showTimer.current);
    setTooltip(null);
  };

  /* The centered card closes via its X or backdrop, not the token losing
     focus: the tap that hits either target blurs the token first, and closing
     on that blur would unmount the card before its buttons receive the tap. */
  const hideAnchoredTooltip = () => {
    clearTimeout(showTimer.current);
    setTooltip((current) => (current?.placement.kind === "centered" ? current : null));
  };

  const selectTab = (id: string) => {
    hideTooltip();
    setActiveTab(id);
    analytics.track(analyticsEvents.e2eHeroExampleViewed, { location: "e2e_hero", tab: id });
  };

  return (
    <TerminalFrame tabs={HERO_EXAMPLES} activeTab={activeTab} onSelectTab={selectTab} bottomFade>
      <div
        key={example.id}
        className="no-scrollbar relative z-20 flex min-h-[304px] animate-[e2e-tab-fade_0.2s_ease-out] flex-col overflow-x-auto p-5 text-left motion-reduce:animate-none sm:min-h-[364px]"
      >
        {example.lines.map((codeLine) => (
          <div
            key={codeLine.key}
            className="min-h-[22px] whitespace-pre font-mono text-[13px] leading-[22px] sm:min-h-[27px] sm:text-base sm:leading-[27px]"
          >
            {codeLine.tokens.map(({ key, text, color, doc }) => {
              const style = { color: CODE_COLORS[color ?? "plain"] };
              if (!doc) {
                return (
                  <span key={key} style={style}>
                    {text}
                  </span>
                );
              }
              return (
                <span
                  key={key}
                  tabIndex={0}
                  className="cursor-help underline decoration-white/35 decoration-dotted decoration-1 underline-offset-4 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:decoration-white/80 focus-visible:bg-white/[0.06] focus-visible:decoration-white/80"
                  style={style}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "touch") return;
                    scheduleTooltip(doc, event.currentTarget);
                  }}
                  onPointerLeave={hideAnchoredTooltip}
                  onFocus={(event) => scheduleTooltip(doc, event.currentTarget)}
                  onBlur={hideAnchoredTooltip}
                >
                  {text}
                </span>
              );
            })}
            {codeLine.tokens.length === 0 && <br />}
          </div>
        ))}
      </div>
      {tooltip && <DocTooltip {...tooltip} onClose={hideTooltip} />}
    </TerminalFrame>
  );
}
