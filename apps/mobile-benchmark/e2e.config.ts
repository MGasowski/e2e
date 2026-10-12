import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';
import { github } from '@e2e-dev/github';

/**
 * Deterministic suite against the benchmark app on an iOS simulator and an
 * Android emulator. Every attempt opens the app fresh on its home list, so
 * each test taps into its own scenario first. The app must already be on the
 * device (`pnpm ios` / `pnpm android` build and install it), or point
 * `E2E_MOBILE_BENCHMARK_IOS_APP` / `E2E_MOBILE_BENCHMARK_ANDROID_APP` at a
 * simulator `.app` or an `.apk`: the target takes it as `app.appPath` and the
 * `build` fixture in `tests/fixtures.ts` installs it once per device.
 * CI does exactly that in `.github/workflows/mobile.yml`, one target per job,
 * and pins the iOS target to the simulator it booted through
 * `E2E_MOBILE_BENCHMARK_IOS_DEVICE`. There the GitHub reporter posts each
 * job's run as one pull request comment named by
 * `E2E_MOBILE_BENCHMARK_COMMENT` (`ios`, `android agent`, ...), the way the
 * web benchmark's `key` names its two; unset, as on a Mac, nothing is posted.
 */
const APP_ID = 'dev.e2e.benchmark';

const comment = process.env.E2E_MOBILE_BENCHMARK_COMMENT;

/**
 * The simulators the iOS target drives: the UDIDs in
 * `E2E_MOBILE_BENCHMARK_IOS_DEVICE`, comma-separated, one worker each; unset,
 * every booted simulator. CI boots two and lists both.
 */
const iosDevices = process.env.E2E_MOBILE_BENCHMARK_IOS_DEVICE?.split(',')
  .map((udid) => udid.trim())
  .filter((udid) => udid !== '');

/**
 * What drives the devices: agent-device unless `E2E_MOBILE_BENCHMARK_DRIVER`
 * names `argent`, which runs the same suites on Software Mansion's argent.
 */
const driver = process.env.E2E_MOBILE_BENCHMARK_DRIVER === 'argent' ? 'argent' : undefined;

/**
 * The replay cache keys on the app identity, not the driver, and the two
 * drivers read different trees: argent targets record under their own
 * identity, so they never replay or overwrite the committed recordings.
 */
const identitySuffix = driver === 'argent' ? '-argent' : '';

export const ios = mobile({
  platform: 'ios',
  driver,
  device: iosDevices === undefined || iosDevices.length !== 1 ? iosDevices : iosDevices[0],
  session: 'e2e-mobile-benchmark-ios',
  // A control that just moved waits this long to come to rest before a tap;
  // an unmoved one is tapped at once, so the budget costs only after a
  // scroll. iOS reports a row's final frame from the first frame of a fling,
  // and the default half second let a tap after scrollUntilVisible land on
  // the row still passing underneath on a loaded simulator.
  transition: 1_500,
});

export const android = mobile({
  platform: 'android',
  driver,
  session: 'e2e-mobile-benchmark-android',
  // A control that arrived with the last action is found again once this
  // budget has passed, so the budget only has to outlast the transition: the
  // Modal Flow's modal slides in from below for about 700 ms on the emulator,
  // longer on a loaded CI one, and the default half second ended inside it.
  transition: 1_500,
});

export default {
  projectId: 'dev.e2e.mobile-benchmark',
  tests: 'tests/**/*.e2e.ts',
  targets: [
    {
      name: 'ios-simulator',
      engine: ios,
      app: { bundleId: APP_ID, appPath: process.env.E2E_MOBILE_BENCHMARK_IOS_APP, identity: `${APP_ID}-ios${identitySuffix}` },
    },
    {
      name: 'android-emulator',
      engine: android,
      app: { bundleId: APP_ID, appPath: process.env.E2E_MOBILE_BENCHMARK_ANDROID_APP, identity: `${APP_ID}-android${identitySuffix}` },
    },
  ],
  // One worker per simulator in the pool; an engine with fewer devices
  // narrows its own target. Each worker slot drives its own session.
  workers: Math.max(1, iosDevices?.length ?? 1),
  reporters: ['list', github(comment === undefined ? {} : { key: comment })],
  credentials: {
    // The Login Form and Flattened Login scenarios' hardcoded account; the
    // Login Form screen prints it as a hint.
    benchmark: {
      username: 'tester@tester.army',
      password: 'benchmark123',
    },
  },
} satisfies E2EConfig;
