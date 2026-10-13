"use client";

import posthog from "posthog-js";

/** The PostHog project the Mintlify docs reported to (`docs/docs.json`). */
const POSTHOG_KEY = "phc_rT8hpREuSj5bRGPHP6KLKNuf4kfwhP4FEf6ahHHV2ZgH";
const POSTHOG_HOST = "https://eu.i.posthog.com";

export const analyticsEvents = {
  e2eCommandCopied: "e2e_command_copied",
  e2eConfigCopied: "e2e_config_copied",
  e2eHeroExampleViewed: "e2e_hero_example_viewed",
  e2eTestimonialsExpanded: "e2e_testimonials_expanded",
  docsCodeCopied: "docs_code_copied",
  docsPageCopied: "docs_page_copied",
  docsSearched: "docs_searched",
} as const;

type AnalyticsEvent = (typeof analyticsEvents)[keyof typeof analyticsEvents];

let started = false;

/** Reports only from the production hosts, so local and preview runs stay out of the data. */
function ready() {
  if (started) return true;
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production") return false;
  if (!/(^|\.)tester\.army$/.test(window.location.hostname)) return false;
  // Memory persistence sets no cookie, so no consent banner is needed.
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    persistence: "memory",
    disable_session_recording: true,
    capture_pageview: "history_change",
  });
  started = true;
  return true;
}

export const analytics = {
  start() {
    ready();
  },
  track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
    if (ready()) posthog.capture(event, properties);
  },
};
