"use client";

import { useEffect, useState } from "react";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { ArrowRightIcon } from "../arrow-icons";
import { SESSION_SIGNUP_URL } from "../links";
import { GOOGLE_CALENDAR_URL, OUTLOOK_CALENDAR_URL } from "./live-session-calendar";
import { downloadCalendarInvite, trackCalendarAdded } from "./save-seat";
import { INTRO_SESSION } from "./sessions-data";

const CALENDAR_ITEM_CLASS =
  "flex h-11 items-center px-4 font-mono text-xs uppercase tracking-[0.08em] text-white/90 transition-colors hover:text-white";

/** "Add to calendar" with a small menu: Google, Outlook, or the .ics file. */
function AddToCalendarMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex w-max items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-white transition-colors hover:text-white/80"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
          <path
            d="M1.5 3H12.5V12.5H1.5V3ZM1.5 6H12.5M4.5 1.5V4M9.5 1.5V4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="square"
          />
        </svg>
        Add to calendar
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
          <path
            d="M2 4L6 8L10 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="square"
          />
        </svg>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute left-0 top-full z-20 mt-2 flex w-52 flex-col divide-y divide-white/15 bg-[rgb(22_22_22/0.95)] inset-ring-[0.5px] inset-ring-white/80"
          >
            <a
              href={GOOGLE_CALENDAR_URL}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => {
                trackCalendarAdded("e2e_session_detail", "google");
                close();
              }}
              className={CALENDAR_ITEM_CLASS}
            >
              Google Calendar
            </a>
            <a
              href={OUTLOOK_CALENDAR_URL}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => {
                trackCalendarAdded("e2e_session_detail", "outlook");
                close();
              }}
              className={CALENDAR_ITEM_CLASS}
            >
              Outlook
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                downloadCalendarInvite("e2e_session_detail");
                close();
              }}
              className={`${CALENDAR_ITEM_CLASS} text-left`}
            >
              Download .ics
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type SessionPhase = "open" | "live" | "ended";

function sessionPhase(now: number): SessionPhase {
  if (now >= Date.parse(INTRO_SESSION.endsAt)) return "ended";
  if (now >= Date.parse(INTRO_SESSION.registrationClosesAt)) return "live";
  return "open";
}

/** Re-checks every 30 s so a tab left open flips to the stream link at 17:57 CEST. */
function useSessionPhase(): SessionPhase {
  const [phase, setPhase] = useState<SessionPhase>("open");
  useEffect(() => {
    const update = () => setPhase(sessionPhase(Date.now()));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return phase;
}

/**
 * The session page's registration panel. Registration needs the Tester Army
 * app's backend, so "Save my seat" opens the app's copy of this page, which
 * holds the email form. From when the stream-link email goes out the panel
 * links to the stream, and after the session it says so.
 */
export function SaveSeatCard() {
  const phase = useSessionPhase();

  if (phase !== "open") {
    return (
      <aside className="flex h-max w-full shrink-0 flex-col gap-[18px] border border-white/15 bg-ta-grey-500 p-8 lg:sticky lg:top-8 lg:w-[420px]">
        <p className="font-mono text-xs uppercase leading-4 tracking-[0.05em] text-white/65">
          {phase === "live" ? "Live now" : "Session ended"}
        </p>
        <p className="text-[28px] leading-[34px] tracking-[-0.01em] text-ta-sand-50">
          {phase === "live" ? "We're live on YouTube" : "This session has ended"}
        </p>
        <a
          href={phase === "live" ? INTRO_SESSION.watchUrl : "https://www.youtube.com/@TesterArmy"}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 w-full items-center justify-center gap-2.5 bg-white/90 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-ta-grey-500 transition-colors hover:bg-white"
        >
          {phase === "live" ? "Watch live" : "Watch on YouTube"}
          <ArrowRightIcon />
        </a>
      </aside>
    );
  }

  return (
    <aside className="flex h-max w-full shrink-0 flex-col gap-[18px] border border-white/15 bg-ta-grey-500 p-8 lg:sticky lg:top-8 lg:w-[420px]">
      <p className="font-mono text-xs uppercase leading-4 tracking-[0.05em] text-white/65">
        Save my seat
      </p>
      <p className="text-[28px] leading-[34px] tracking-[-0.01em] text-ta-sand-50">
        Join live on Oct 22
      </p>
      <p className="font-mono text-xs uppercase leading-4 tracking-[0.05em] text-white">
        {INTRO_SESSION.dateDayLabel}
        <br />
        {INTRO_SESSION.timesLabel}
      </p>
      <a
        href={SESSION_SIGNUP_URL}
        onClick={() =>
          analytics.track(analyticsEvents.e2eWebinarCtaClicked, { location: "e2e_session_detail" })
        }
        className="mt-1.5 flex h-12 w-full items-center justify-center gap-2.5 bg-white/90 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-ta-grey-500 transition-colors hover:bg-white"
      >
        Save my seat
        <ArrowRightIcon />
      </a>
      <p className="text-[13px] leading-5 text-white/50">
        We&apos;ll email you the invite, and the recording after the session.
      </p>
      <div className="mt-1 h-px w-full bg-white/15" />
      <AddToCalendarMenu />
    </aside>
  );
}
