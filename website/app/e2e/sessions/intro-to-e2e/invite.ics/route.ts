import { CALENDAR_INVITE } from "@/components/landing/e2e/sessions/live-session-calendar";

/** The live session as an .ics file, linked from the confirmation and reminder emails. */
export function GET() {
  return new Response(CALENDAR_INVITE, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8; method=PUBLISH",
      "Content-Disposition": 'attachment; filename="intro-to-e2e.ics"',
    },
  });
}
