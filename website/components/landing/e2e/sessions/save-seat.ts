"use client";

import { analytics, analyticsEvents } from "@/lib/analytics";
import { CALENDAR_INVITE } from "./live-session-calendar";
import { INTRO_SESSION } from "./sessions-data";

/** Analytics `location` per surface leading to the sign-up. */
export type LiveSessionCtaLocation = "e2e_webinar_banner" | "e2e_sessions_page" | "e2e_session_detail";

/** Registration UI hides once the live session has ended. */
export const LIVE_SESSION_ENDS = Date.parse(INTRO_SESSION.endsAt);

export type CalendarMethod = "google" | "outlook" | "ics";

export function trackCalendarAdded(location: LiveSessionCtaLocation, method: CalendarMethod) {
  analytics.track(analyticsEvents.e2eWebinarCalendarAdded, { location, method });
}

export function downloadCalendarInvite(location: LiveSessionCtaLocation) {
  const url = URL.createObjectURL(new Blob([CALENDAR_INVITE], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "e2e-live-session.ics";
  link.click();
  URL.revokeObjectURL(url);
  trackCalendarAdded(location, "ics");
}
