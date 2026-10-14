/**
 * Calendar entries for the live session, shared by the add-to-calendar menus
 * and the hosted .ics route. Server-safe: no browser imports. If the time
 * changes, keep CALENDAR_UID and raise CALENDAR_SEQUENCE so calendars update
 * the existing entry instead of adding a second one.
 */
import { INTRO_SESSION } from "./sessions-data";

const SITE_URL = "https://tester.army";
const CALENDAR_UID = "e2e-webinar-20261022@tester.army";
const CALENDAR_SEQUENCE = 2;

const CALENDAR_EVENT_TITLE = `${INTRO_SESSION.title} - Live session + Q&A`;
const CALENDAR_EVENT_DETAILS = `Live session on e2e, then open Q&A. Watch: ${INTRO_SESSION.watchUrl} Details: ${SITE_URL}${INTRO_SESSION.path}`;

/** 2026-10-22T16:00:00Z -> 20261022T160000Z, the compact UTC form calendars expect. */
function toCalendarTimestamp(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const START = toCalendarTimestamp(INTRO_SESSION.startsAt);
const END = toCalendarTimestamp(INTRO_SESSION.endsAt);

/** RFC 5545 caps content lines at 75 octets; longer ones continue after CRLF + space. */
function foldLine(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    parts.push(rest.slice(0, 73));
    rest = rest.slice(73);
  }
  parts.push(rest);
  return parts.join("\r\n ");
}

export const CALENDAR_INVITE = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//TesterArmy//e2e live session//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  "BEGIN:VEVENT",
  `UID:${CALENDAR_UID}`,
  "DTSTAMP:20261014T000000Z",
  `SEQUENCE:${CALENDAR_SEQUENCE}`,
  `DTSTART:${START}`,
  `DTEND:${END}`,
  `SUMMARY:${CALENDAR_EVENT_TITLE}`,
  `DESCRIPTION:${CALENDAR_EVENT_DETAILS.replace(/,/g, "\\,")}`,
  `LOCATION:${INTRO_SESSION.watchUrl}`,
  `URL:${SITE_URL}${INTRO_SESSION.path}`,
  "BEGIN:VALARM",
  "ACTION:DISPLAY",
  `DESCRIPTION:${INTRO_SESSION.title} starts in 15 minutes`,
  "TRIGGER:-PT15M",
  "END:VALARM",
  "END:VEVENT",
  "END:VCALENDAR",
]
  .map(foldLine)
  .join("\r\n");

export const GOOGLE_CALENDAR_URL = `https://calendar.google.com/calendar/render?${new URLSearchParams(
  {
    action: "TEMPLATE",
    text: CALENDAR_EVENT_TITLE,
    dates: `${START}/${END}`,
    details: CALENDAR_EVENT_DETAILS,
    location: INTRO_SESSION.watchUrl,
  },
)}`;

export const OUTLOOK_CALENDAR_URL = `https://outlook.live.com/calendar/0/action/compose?${new URLSearchParams(
  {
    rru: "addevent",
    subject: CALENDAR_EVENT_TITLE,
    body: CALENDAR_EVENT_DETAILS,
    startdt: INTRO_SESSION.startsAt,
    enddt: INTRO_SESSION.endsAt,
    location: INTRO_SESSION.watchUrl,
  },
)}`;
