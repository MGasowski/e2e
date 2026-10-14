"use client";

import Link from "next/link";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { ArrowRightIcon } from "../arrow-icons";
import { PortraitCanvas } from "../particles/portrait-canvas";
import type { LiveSessionCtaLocation } from "./save-seat";
import { E2E_EXPLAINED_RECORDING, INTRO_SESSION } from "./sessions-data";

/* The tiles follow the floating live-session banner's anatomy: a flat dark
   panel, media cut out in the top-right corner fading into the panel, a
   date/person row, and a full-width white button. */
const CARD_CLASS =
  "group relative flex min-h-[236px] flex-col border border-white/20 bg-ta-grey-500 p-5 transition-colors hover:border-white/40";
const CARD_EYEBROW_CLASS = "font-mono text-[11px] uppercase leading-4 tracking-[0.05em] text-white";
const CARD_TITLE_CLASS = "mt-2 text-[22px] leading-[27px] tracking-[-0.02em] text-ta-sand-50";
const CARD_META_ROW_CLASS = "mb-3 flex items-start justify-between gap-3 pt-6 font-mono uppercase";
/* min-h reserves the three-line date height on one-line metas (duration), so
   every tile stays the same height whichever filter tab is active. */
const CARD_META_LEFT_CLASS =
  "min-h-12 whitespace-nowrap text-[11px] leading-4 tracking-[0.05em] text-white/70";
const CARD_META_RIGHT_CLASS = "min-w-0 truncate text-[10px] leading-4 tracking-[0.02em] text-white";
const CARD_BUTTON_CLASS =
  "flex h-10 w-full items-center justify-center gap-2.5 bg-white/90 font-mono text-xs uppercase text-ta-grey-500 transition-colors inset-ring-[0.5px] inset-ring-white/80 group-hover:bg-white";
/* Text and media share a row; the media centers vertically beside the text,
   inside the tile padding so it never touches the border. */
/* The row reserves the tall portrait's height even on media-less or
   shorter-media tiles, so filtering never changes tile sizes between tabs. */
const CARD_BODY_ROW_CLASS = "flex min-h-[140px] flex-1 items-start gap-3";
const CARD_TEXT_COL_CLASS = "flex min-w-0 flex-1 flex-col";
const CARD_MEDIA_CLASS = "relative aspect-[146/140] w-[42%] max-w-[146px] shrink-0 self-center";
const CARD_MEDIA_FADE_CLASS =
  "absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-ta-grey-500";

/** Internal link that counts a seat-saving click before navigating to the session page. */
export function SaveSeatLink({
  location,
  className,
  children,
}: {
  location: LiveSessionCtaLocation;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={INTRO_SESSION.path}
      onClick={() => analytics.track(analyticsEvents.e2eWebinarCtaClicked, { location })}
      className={className}
    >
      {children}
    </Link>
  );
}

export function UpcomingSessionCard({ location }: { location: LiveSessionCtaLocation }) {
  return (
    <SaveSeatLink location={location} className={CARD_CLASS}>
      <span className={CARD_BODY_ROW_CLASS}>
        <span className={CARD_TEXT_COL_CLASS}>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-1.5 shrink-0 bg-ta-red-300" />
            <span className={CARD_EYEBROW_CLASS}>Live session + Q&amp;A</span>
          </span>
          <span className={CARD_TITLE_CLASS}>{INTRO_SESSION.title}</span>
        </span>
        <span className={CARD_MEDIA_CLASS}>
          <PortraitCanvas options={{ revealMs: 0, interactive: false }} />
          <span aria-hidden="true" className={CARD_MEDIA_FADE_CLASS} />
        </span>
      </span>
      <span className={CARD_META_ROW_CLASS}>
        <span className={CARD_META_LEFT_CLASS}>
          {INTRO_SESSION.dateDayLabel}
          <br />
          {INTRO_SESSION.times[0]} · {INTRO_SESSION.times[1]}
          <br />
          {INTRO_SESSION.times[2]}
        </span>
        <span className={CARD_META_RIGHT_CLASS}>
          {INTRO_SESSION.host.name} · {INTRO_SESSION.host.role}
        </span>
      </span>
      <span className={CARD_BUTTON_CLASS}>
        Save my seat
        <ArrowRightIcon />
      </span>
    </SaveSeatLink>
  );
}

export function RecordingCard({ location }: { location: LiveSessionCtaLocation }) {
  return (
    <a
      href={E2E_EXPLAINED_RECORDING.url}
      target="_blank"
      rel="noreferrer"
      onClick={() =>
        analytics.track(analyticsEvents.e2eSessionRecordingClicked, {
          location,
          title: E2E_EXPLAINED_RECORDING.title,
        })
      }
      className={CARD_CLASS}
    >
      <span className={CARD_BODY_ROW_CLASS}>
        <span className={CARD_TEXT_COL_CLASS}>
          <span className={CARD_EYEBROW_CLASS}>Recording</span>
          <span className={CARD_TITLE_CLASS}>{E2E_EXPLAINED_RECORDING.title}</span>
        </span>
        {/* The e2e wordmark stands in for the video thumbnail, set like the header lockup. */}
        <span
          aria-hidden="true"
          className="type-h2 flex w-[48%] max-w-[176px] shrink-0 items-center justify-center self-center text-[64px] leading-none tracking-[-0.06em] text-ta-sand-50"
        >
          e2e
        </span>
      </span>
      <span className={CARD_META_ROW_CLASS}>
        <span className={CARD_META_LEFT_CLASS}>{E2E_EXPLAINED_RECORDING.durationLabel}</span>
        <span className={CARD_META_RIGHT_CLASS}>
          {INTRO_SESSION.host.name} · {INTRO_SESSION.host.role}
        </span>
      </span>
      <span className={CARD_BUTTON_CLASS}>
        Watch now
        <ArrowRightIcon />
      </span>
    </a>
  );
}

export function SuggestTopicCard() {
  return (
    <a
      href="/discord"
      target="_blank"
      rel="noreferrer"
      className="flex min-h-[236px] flex-col items-center justify-center gap-3 border border-dashed border-white/20 px-6 py-12 text-center transition-colors hover:border-white/40 sm:col-span-2 sm:min-h-0 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:py-7 lg:col-span-1 lg:min-h-[236px] lg:flex-col lg:gap-3 lg:py-12"
    >
      <span className="font-mono text-xs uppercase leading-4 tracking-[0.1em] text-white/50">
        More sessions in the works
      </span>
      <span className="flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-white">
        Suggest a topic on Discord
        <ArrowRightIcon />
      </span>
    </a>
  );
}
