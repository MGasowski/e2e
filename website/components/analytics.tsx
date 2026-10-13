"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

/** Starts PostHog on the production hosts; it records page views itself from then on. */
export function Analytics() {
  useEffect(() => analytics.start(), []);
  return null;
}
