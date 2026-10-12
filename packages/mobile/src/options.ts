/**
 * What the device engine is given: its options, and the device client it
 * drives them through. Shared by the surface (one session per worker) and
 * the pool (the target's devices, one per worker slot).
 */

import type { AppDeployResult, AppOpenResult, CaptureScreenshotResult, CaptureSnapshotResult, createAgentDeviceClient } from 'agent-device';
import type { DeviceConnection } from './bindings.ts';
import type { DeviceProvider } from './provider.ts';

type AgentDeviceClient = ReturnType<typeof createAgentDeviceClient>;

/** One client method with agent-device's parameters and the result fields this engine reads. */
type Method<F extends (...args: never[]) => unknown, R = unknown> = (...args: Parameters<F>) => Promise<R>;

/** The snapshot fields this engine reads; `keyboard` says only whether the soft keyboard showed. */
export type DeviceSnapshot = Partial<Pick<CaptureSnapshotResult, 'nodes' | 'truncated' | 'appName' | 'appBundleId' | 'snapshotQuality'>> & {
  readonly keyboard?: { readonly kind: 'visible' | 'absent' | 'unmeasurable' } | undefined;
};

/** The screenshot fields this engine reads. */
export type DeviceScreenshot = Partial<Pick<CaptureScreenshotResult, 'path' | 'width' | 'height' | 'logicalWidth' | 'logicalHeight' | 'pixelDensity'>>;

/** What `appState` answers: the Android package in front, or the Apple session's app. */
export type DeviceAppState = { readonly package: string } | { readonly appName: string; readonly appBundleId?: string | undefined };

/** What `clipboard` answers: the text for a read, nothing in particular for a write. */
export type DeviceClipboard = { readonly action: 'read'; readonly text: string } | { readonly action: 'write' };

/**
 * The commands this engine sends a device, in agent-device's vocabulary:
 * the agent-device client is one, and the argent driver (`argent.ts`)
 * implements the same shape on argent's tools. Every result is narrowed to
 * the fields the engine reads, so a driver owes nothing more.
 */
export interface DeviceClient {
  readonly devices: {
    readonly list: Method<AgentDeviceClient['devices']['list'], readonly unknown[]>;
    readonly boot: Method<AgentDeviceClient['devices']['boot']>;
  };
  readonly sessions: {
    readonly list: Method<AgentDeviceClient['sessions']['list'], readonly unknown[]>;
    readonly close: Method<AgentDeviceClient['sessions']['close']>;
  };
  readonly apps: {
    readonly open: Method<AgentDeviceClient['apps']['open'], Partial<Pick<AppOpenResult, 'appName' | 'appBundleId'>>>;
    readonly close: Method<AgentDeviceClient['apps']['close']>;
    readonly install: Method<AgentDeviceClient['apps']['install'], Partial<Pick<AppDeployResult, 'appId' | 'bundleId' | 'package'>>>;
    readonly reinstall: Method<AgentDeviceClient['apps']['reinstall'], Partial<Pick<AppDeployResult, 'appId' | 'bundleId' | 'package'>>>;
  };
  readonly capture: {
    readonly snapshot: Method<AgentDeviceClient['capture']['snapshot'], DeviceSnapshot>;
    readonly screenshot: Method<AgentDeviceClient['capture']['screenshot'], DeviceScreenshot>;
  };
  readonly interactions: {
    readonly press: Method<AgentDeviceClient['interactions']['press']>;
    readonly longPress: Method<AgentDeviceClient['interactions']['longPress']>;
    readonly hover: Method<AgentDeviceClient['interactions']['hover']>;
    /** `input.sensitive` marks a secret's value, which a driver must not route through the clipboard. */
    readonly fill: (options: Parameters<AgentDeviceClient['interactions']['fill']>[0], input?: { readonly sensitive: boolean }) => Promise<unknown>;
    readonly type: Method<AgentDeviceClient['interactions']['type']>;
    readonly scroll: Method<AgentDeviceClient['interactions']['scroll']>;
    readonly swipe: Method<AgentDeviceClient['interactions']['swipe']>;
    readonly drag: Method<AgentDeviceClient['interactions']['drag']>;
    readonly pan: Method<AgentDeviceClient['interactions']['pan']>;
  };
  readonly command: {
    readonly keyboard: Method<AgentDeviceClient['command']['keyboard']>;
    readonly back: Method<AgentDeviceClient['command']['back']>;
    readonly home: Method<AgentDeviceClient['command']['home']>;
    readonly alert: Method<AgentDeviceClient['command']['alert']>;
    readonly appState: Method<AgentDeviceClient['command']['appState'], DeviceAppState>;
    readonly clipboard: Method<AgentDeviceClient['command']['clipboard'], DeviceClipboard>;
    readonly orientation: Method<AgentDeviceClient['command']['orientation']>;
    readonly fold: Method<AgentDeviceClient['command']['fold']>;
    readonly prepare: Method<AgentDeviceClient['command']['prepare']>;
  };
  readonly settings: {
    readonly update: Method<AgentDeviceClient['settings']['update']>;
  };
  readonly recording: {
    readonly record: Method<AgentDeviceClient['recording']['record'], { readonly outPath?: unknown; readonly recordOnlySession?: unknown }>;
  };
}

/**
 * Mints the device client for one session, with the daemon and client
 * configuration a lease supplied when a provider leased the device, else
 * against the local daemon; the seam unit tests script.
 */
export type ClientFactory = (session: string, connection?: DeviceConnection) => DeviceClient;

/** What drives the devices: agent-device (the default) or Software Mansion's argent. */
export type MobileDriver = 'agent-device' | 'argent';

export type MobilePlatform = 'ios' | 'android';

/** Every permission agent-device can grant, deny, or reset on an app: what a target's `app.permissions` and `device.openApp` may name. */
export const DEVICE_PERMISSIONS = [
  'camera',
  'microphone',
  'photos',
  'contacts',
  'notifications',
  'calendar',
  'location',
  'reminders',
  'motion',
  'siri',
  'media-library',
] as const;

/** Permissions agent-device can grant, deny, or reset on an app. */
export type DevicePermission = (typeof DEVICE_PERMISSIONS)[number];

/** A permission's state: held, refused, or not asked for yet, so the OS asks again. */
export type PermissionState = 'grant' | 'deny' | 'reset';

/** Permissions an app holds when it launches, by name. */
export type LaunchPermissions = Readonly<Partial<Record<DevicePermission, PermissionState>>>;

/**
 * Options of the device engine: which devices it drives and how. The app
 * under test is the target's `app` (`bundleId`, `appPath`,
 * `launchArguments`, `permissions`). Every optional value also accepts
 * `undefined`, so values read straight from `process.env` need no
 * conditional spread.
 */
export interface MobileOptions {
  /** Platform the target's device runs. */
  readonly platform: MobilePlatform;
  /**
   * What drives the device. `agent-device` (default) is Callstack's
   * agent-device, which this package depends on. `argent` is Software
   * Mansion's argent (`@swmansion/argent`, an optional peer dependency the
   * project installs), which drives local simulators and emulators through
   * its tool server: taps and gestures land at the centre of a node's
   * bounds, and text goes through the device keyboard. Under `argent` a
   * target needs `app.bundleId`, `device` names a local device (a provider
   * lease with a daemon is refused), and the device commands argent has no
   * tool for (`closeApp`, `alert`, `clipboard`, network, location,
   * appearance, biometrics, the keychain, a comparable screenshot) fail with
   * `UNSUPPORTED_CAPABILITY`.
   */
  readonly driver?: MobileDriver | undefined;
  /**
   * Device to use: a simulator or emulator by name, simulator UDID, or
   * emulator serial (`emulator-5554`), or a connected phone by name. A list
   * is a pool: the
   * engine declares one worker per entry and worker slot `n` drives the
   * `n`th, so `workers` at or above the pool size runs the target's files
   * across every device at once. Omitted, the pool is every booted device of
   * the platform at `prepare`, as many as the run has slots; with none booted,
   * agent-device boots one. A `DeviceProvider` leases hosted devices instead:
   * one per worker slot at `prepare`, each driven through the daemon and
   * client configuration the lease names, all released when the run ends.
   */
  readonly device?: string | readonly string[] | DeviceProvider | undefined;
  /**
   * agent-device session name, before the worker slot: slot `n` drives its
   * device under `<session>-<n>`, `e2e-<target name>-<n>` by default. One run
   * per session at a time: concurrent runs on the same session interleave
   * taps.
   */
  readonly session?: string | undefined;
  /**
   * What an observation captures. `full` (default) includes static text, so
   * judgments can read values; `interactive` keeps only actionable nodes and
   * is cheaper on screens with long lists.
   */
  readonly snapshot?: 'full' | 'interactive' | undefined;
  /**
   * How long the UI must hold still after a tap, fill, screen scroll, or
   * back before the action counts as landed, in milliseconds; `false` skips
   * the wait. The wait keeps the observation that follows an action off a
   * transition frame; the runner's own polling (`expect`, actions waiting
   * for their node) covers the rest, so a short window suffices. Default
   * 150. Every frame of a running animation changes the tree, so a 150 ms
   * window still catches a transition in flight; raise it for slow devices
   * or apps that settle in stages, or lower it to 0 to keep only the first
   * re-observation.
   */
  readonly settle?: number | false | undefined;
  /**
   * How long a control that appeared or moved with the last action is given
   * to finish arriving before a test acts on it, in milliseconds. Default
   * 500, the length of a modal or screen transition. Accessibility frames
   * report a control's final position from the first frame of a transition,
   * so this budget is the only thing that keeps a test from tapping a point
   * the control has not reached; controls already on screen at the same
   * place before the action are acted on at once. Raise it for slower
   * transitions.
   */
  readonly transition?: number | undefined;
  /**
   * Whether a video recording draws agent-device's touch indicator where a
   * test tapped. Default `true`. `false` records the plain screen, and skips
   * the pass that draws the indicator once the recording stops: on a hosted
   * daemon that pass can outlast the attempt's `cleanupTimeout`.
   */
  readonly videoTouches?: boolean | undefined;
}
