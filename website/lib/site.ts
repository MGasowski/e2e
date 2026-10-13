import { PRODUCTION_ORIGIN } from "./docs/source";

/**
 * The origin absolute URLs in metadata resolve against: `SITE_URL` when set
 * (a local build checked by `apps/website-e2e` sets it to itself), the
 * deployment on Vercel, else production.
 */
export const siteUrl = new URL(
  process.env.SITE_URL ??
    (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : PRODUCTION_ORIGIN),
);

/** Where the landing page is published: the Tester Army site serves `/e2e` from this one. */
export const LANDING_CANONICAL = "https://tester.army/e2e";
