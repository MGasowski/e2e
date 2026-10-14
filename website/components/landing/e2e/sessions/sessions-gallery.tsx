"use client";

import { useState } from "react";
import { RecordingCard, SuggestTopicCard, UpcomingSessionCard } from "./session-cards";
import { SESSION_COUNT_LABEL } from "./sessions-data";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live sessions" },
  { key: "recordings", label: "Recordings" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function SessionsGallery() {
  const [filter, setFilter] = useState<FilterKey>("all");

  return (
    <section className="relative mx-auto max-w-[1200px] px-6 pt-20 sm:px-10 md:pt-[104px]">
      <div
        data-reveal
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="font-mono text-xs uppercase leading-4 tracking-[0.1em] text-white/50">
          {SESSION_COUNT_LABEL}
        </p>
        <div className="flex items-center gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={
                filter === item.key
                  ? "flex h-8 items-center bg-white/90 px-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ta-grey-500"
                  : "flex h-8 items-center border border-white/20 px-3.5 font-mono text-[11px] uppercase tracking-[0.08em] text-white/65 transition-colors hover:border-white/40 hover:text-white"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div data-reveal className="mt-6 h-px w-full bg-white/15" />
      <div
        data-reveal
        className="grid auto-cols-fr grid-cols-1 gap-5 pt-10 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filter !== "recordings" && <UpcomingSessionCard location="e2e_sessions_page" />}
        {filter !== "live" && <RecordingCard location="e2e_sessions_page" />}
        <SuggestTopicCard />
      </div>
    </section>
  );
}
