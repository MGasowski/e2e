import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { bypassHeaders, landingBase } from './support/site.ts';

/**
 * Every test runs on both targets, and a stored screenshot is per target and
 * per OS (`<name>-desktop-linux.png`), so the two sizes never share a
 * baseline. Tests open absolute URLs from `support/site.ts`; `app.url` is the
 * landing page only because a target needs one.
 */
const engine = (width: number, height: number) =>
  web({
    viewport: { width, height },
    locale: 'en-US',
    timezoneId: 'UTC',
    ...(Object.keys(bypassHeaders).length > 0 ? { headers: bypassHeaders } : {}),
  });

export default {
  projectId: 'dev.e2e.website-e2e',
  tests: 'tests/**/*.e2e.ts',
  targets: [
    { name: 'desktop', engine: engine(1440, 1000), app: { url: landingBase.href } },
    { name: 'mobile', engine: engine(390, 844), app: { url: landingBase.href } },
  ],
  // The suite loads a few hundred production pages a run. Three workers keep
  // it quick without looking like an attack to the sites' bot protection;
  // `--workers` raises it against a local website/ build.
  workers: 3,
  // Production over the network: one retry absorbs a slow edge or CDN miss,
  // and the report still marks the test flaky.
  retries: 1,
  timeout: 120_000,
  assertionTimeout: 15_000,
  reporters: ['list'],
} satisfies E2EConfig;
