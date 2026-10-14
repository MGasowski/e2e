/**
 * Content for the /e2e/sessions pages. Server-safe: no browser imports, so the
 * route metadata can read titles and descriptions from here too.
 */

export const E2E_SESSIONS_PATH = "/e2e/sessions";

export const INTRO_SESSION = {
  slug: "intro-to-e2e",
  path: `${E2E_SESSIONS_PATH}/intro-to-e2e`,
  title: "Intro to e2e",
  summary:
    "A live hour on e2e, the open source framework for agentic end-to-end testing. We cover setup, caching, writing good tests, one suite on web, iOS and Android, and CI, then take your questions.",
  /** 18:00 in Warsaw. Europe and the US are both still on summer time on Oct 22. */
  startsAt: "2026-10-22T16:00:00Z",
  /** 45 minutes live plus 15 minutes of Q&A. */
  endsAt: "2026-10-22T17:00:00Z",
  /**
   * Registration closes when the 3-minute stream-link campaign goes out (17:57
   * CEST), so every confirmation's promise of that email still holds. From then
   * the session page links straight to the stream.
   */
  registrationClosesAt: "2026-10-22T15:57:00Z",
  /**
   * One format everywhere (site, emails, email header): San Francisco, New York,
   * then Warsaw, all in 12-hour time with the same separator.
   */
  dateLabel: "Thu, Oct 22 · 9 AM PT · 12 PM ET · 6 PM CEST",
  dateDayLabel: "Thu, Oct 22",
  timesLabel: "9 AM PT · 12 PM ET · 6 PM CEST",
  /** The same three times, for layouts that stack them. */
  times: ["9 AM PT", "12 PM ET", "6 PM CEST"],
  /** Where the stream plays; YouTube resolves /live to the channel's current or next stream. */
  watchUrl: "https://www.youtube.com/@TesterArmy/live",
  description:
    "e2e is an open source testing framework for web and mobile apps. A test can use exact locators, goals in plain language that an agent completes, or both. This session covers what you need to use it day to day, from the first setup to tests on every pull request, and ends with open Q&A.",
  agenda: [
    {
      title: "How to set it up",
      body: "Add e2e with npx e2e init or one prompt to your coding agent.",
    },
    {
      title: "How caching works",
      body: "Verified agent steps replay on the next run without calling the model.",
    },
    {
      title: "Good practices for writing tests",
      body: "Pick a locator or a goal for each step, and keep secrets away from the model.",
    },
    {
      title: "One suite on web, iOS and Android",
      body: "Run the same test in Chromium, an iPhone simulator and an Android emulator.",
    },
    {
      title: "Running it on CI",
      body: "Run the suite on GitHub Actions and get the results as a pull request comment.",
    },
  ],
  closing:
    "Open Q&A follows, for questions about your own app, your CI or moving over from Playwright.",
  host: {
    name: "Kacper",
    role: "DevRel, e2e",
    socials: [
      { platform: "linkedin", href: "https://www.linkedin.com/in/kacperkapusciak/" },
      { platform: "x", href: "https://x.com/kacperkapusciak" },
    ],
  },
} as const;

export const E2E_EXPLAINED_RECORDING = {
  title: "e2e Explained in 2 minutes",
  url: "https://www.youtube.com/watch?v=NEawZb6Hssw",
  durationLabel: "02:01",
} as const;

/** One upcoming live session plus one recording, shown in the gallery count. */
export const SESSION_COUNT_LABEL = "All sessions · 02";
