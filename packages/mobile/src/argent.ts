/**
 * The argent driver: the engine's `DeviceClient` implemented on Software
 * Mansion's argent (`@swmansion/argent/client`), so `mobile({ driver:
 * 'argent' })` runs the same surface, pool, and fixture as agent-device.
 *
 * argent has no sessions and no element refs: its tools take a device id
 * and normalized screen coordinates. This module keeps the device the
 * worker drives, mints refs for the nodes of each `ui-tree` it reads, and
 * turns an action on a ref into a gesture at the centre of the node's
 * bounds. Text goes through the device keyboard after a tap on the field,
 * and a fill clears the field with backspaces first. What argent has no tool
 * for fails with `UNSUPPORTED_CAPABILITY`, before anything reaches the
 * device.
 *
 * Coordinates are argent's native units, the same as agent-device's: iOS
 * points, Android pixels.
 */

import { copyFileSync, mkdirSync, readdirSync, rmdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { ArgentClient, ArgentToolArgs, ArgentToolName, CallToolOptions, UiTree, UiTreeNode } from '@swmansion/argent/client';
import type { SnapshotNode } from 'agent-device';
import { ConfigurationError, EngineError, TestError } from 'e2e/engine';
import type { DeviceConnection } from './bindings.ts';
import type { DeviceClient, DeviceSnapshot, MobilePlatform } from './options.ts';
import { invalidState, notActionable, unsupported, type Point, type Rect } from './support.ts';

/** The one argent client method this driver calls. */
export type ArgentCaller = Pick<ArgentClient, 'callTool'>;

/** Loads argent's client; tests hand in a scripted one. */
export type ArgentLoader = () => Promise<ArgentCaller>;

const ARGENT_PACKAGE = '@swmansion/argent';

/**
 * Fails at config load when the optional peer is missing, so a target that
 * names the driver never gets as far as a worker that cannot drive anything.
 */
export function assertArgentInstalled(): void {
  try {
    createRequire(import.meta.url).resolve(`${ARGENT_PACKAGE}/client`);
  } catch (cause) {
    throw new ConfigurationError(
      'INVALID_CONFIG',
      `mobile({ driver: 'argent' }) needs the optional peer dependency ${ARGENT_PACKAGE}; install it next to @e2e-dev/mobile (npm install --save-dev ${ARGENT_PACKAGE})`,
      { cause },
    );
  }
}

/** argent's own client, started on first use: it starts the local tool server the first call needs. */
const loadArgent: ArgentLoader = async () => {
  const module = await import('@swmansion/argent/client');
  return module.createArgentClient();
};

/**
 * Refuses a connection a device provider leased with a daemon or client
 * configuration: those are agent-device's, and argent drives local devices
 * only.
 */
function assertLocal(connection: DeviceConnection | undefined): void {
  if (connection?.daemon === undefined && connection?.client === undefined) return;
  throw new ConfigurationError(
    'INVALID_CONFIG',
    "mobile({ driver: 'argent' }) drives local simulators and emulators only; this device provider leased a device behind an agent-device daemon, which needs the default driver",
  );
}

/** Captures a ref stays actionable for: an action aimed from a recent observation still lands where that observation saw the node. */
const REF_GENERATIONS = 6;

/** How long a fill waits for the field it tapped to take focus before typing into it. */
const FOCUS_TIMEOUT_MS = 1_500;
const FOCUS_POLL_MS = 150;

/** How long one argent call may take before the engine gives up on it: booting and installing take longest. */
const DEFAULT_CALL_BUDGET_MS = 60_000;
const CALL_BUDGET_MS: Readonly<Record<string, number>> = {
  'boot-device': 600_000,
  'reinstall-app': 300_000,
  'restart-app': 120_000,
  'launch-app': 120_000,
  'screen-recording-stop': 120_000,
};

/** What a call that names its own deadline gets beyond it, for the round trip to the tool server. */
const OWN_DEADLINE_MARGIN_MS = 5_000;

/** Per-key time a typing call is allowed on top of its base budget: argent types 50 ms a key on iOS. */
const PER_KEY_BUDGET_MS = 100;

/** The budget of one call: its tool's, plus time for every key a typing call sends. */
function callBudget(name: ArgentToolName, args: unknown): number {
  // A call with its own deadline (a wait for a still screen) gets that deadline and a margin, not the default.
  const own = isRecord(args) && typeof args.timeoutMs === 'number' ? args.timeoutMs + OWN_DEADLINE_MARGIN_MS : undefined;
  const base = own ?? CALL_BUDGET_MS[name] ?? DEFAULT_CALL_BUDGET_MS;
  const text = stringField(args, 'text');
  const steps = isRecord(args) && Array.isArray(args.steps) ? args.steps.length : 0;
  return base + ((text?.length ?? 0) + steps) * PER_KEY_BUDGET_MS;
}

/** How long a launch waits for the app's first screen, and how long that screen must then hold still. */
const LAUNCH_TIMEOUT_MS = 10_000;
const LAUNCH_QUIET_MS = 500;

/** How long `home` waits for the app it left to leave the front. */
const HOME_TIMEOUT_MS = 3_000;

/** The wait for a still screen before a touch: how long the tree must hold, how often it is read, and the most it costs. */
const QUIET_STABLE_MS = 200;
const QUIET_POLL_MS = 100;
const QUIET_TIMEOUT_MS = 1_500;
const QUIET_KEYBOARD_STABLE_MS = 600;

/** How long the settle wait polls for a quiet screen after an action. */
const SETTLE_TIMEOUT_MS = 3_000;

/** Rounds of backspaces a fill sends before it gives up clearing a field that keeps text. */
const CLEAR_ROUNDS = 3;

/** How far a screen scroll drags, as a share of the screen, and for how long. */
const SCROLL_SHARE = 0.4;
const DRAG_MS = 300;

/** How long a drag holds the source before it moves, so a drag-and-drop list picks the item up. */
const DRAG_HOLD_MS = 600;

/** The longest recording argent takes; it stops on its own after this. */
const RECORDING_LIMIT_S = 600;

/** Printable ASCII: what argent's `keyboard` types key by key. Anything else is pasted. */
const TYPEABLE = /^[\x20-\x7e]*$/;

/** argent's own secret placeholder: its tool server swaps it for a value from the host's environment or `.env` files. */
const ARGENT_SECRET_PLACEHOLDER = /\{\{\s*secret:/i;

/**
 * Refuses text argent would not type as written. argent resolves
 * `{{secret:NAME}}` on the host before typing, which would let text the
 * model or the app supplies pull a value no run declared and type it where
 * the redaction ledger never sees it. A secret's value that is not printable
 * ASCII would have to go through the clipboard, so it is refused too.
 */
function assertTypeable(text: string, sensitive: boolean): void {
  if (ARGENT_SECRET_PLACEHOLDER.test(text)) {
    throw new TestError('POLICY_DENIED', 'argent resolves {{secret:...}} placeholders from the host, so the argent driver does not type text that holds one');
  }
  if (sensitive && !TYPEABLE.test(text)) {
    throw unsupported('argent types a secret key by key, which takes printable ASCII only; a secret with other characters would go through the device clipboard');
  }
}

/** One node of the newest captures, by ref: where it is and what it holds. */
interface RefEntry {
  readonly rect: Rect;
  readonly value: string | undefined;
  readonly focused: boolean;
}

interface Capture {
  readonly tree: UiTree;
  readonly nodes: SnapshotNode[];
}

/** The device selection agent-device commands carry; argent reads the same fields. */
interface Selection {
  readonly device?: string | undefined;
  readonly udid?: string | undefined;
  readonly serial?: string | undefined;
}

/** One device as argent's `list-devices` reports it. */
interface ListedDevice {
  readonly platform?: string;
  readonly udid?: string;
  readonly serial?: string;
  readonly name?: string;
  readonly avdName?: string;
  readonly model?: string;
  readonly state?: string;
}

/** The agent-device permission names onto argent's; `siri` has no argent counterpart. */
const PERMISSIONS: Readonly<Record<string, ArgentToolArgs['settings-permissions']['permission']>> = {
  camera: 'camera',
  microphone: 'microphone',
  photos: 'photos',
  contacts: 'contacts',
  notifications: 'notifications',
  calendar: 'calendar',
  location: 'location',
  reminders: 'reminders',
  motion: 'motion',
  'media-library': 'media-library',
};

/** The permission states argent sets, as agent-device names them too. */
const PERMISSION_STATES: readonly ArgentToolArgs['settings-permissions']['action'][] = ['grant', 'deny', 'reset'];

/** agent-device's rotation names onto argent's. */
const ROTATIONS: Readonly<Record<string, 'Portrait' | 'PortraitUpsideDown' | 'LandscapeLeft' | 'LandscapeRight'>> = {
  portrait: 'Portrait',
  'portrait-upside-down': 'PortraitUpsideDown',
  'landscape-left': 'LandscapeLeft',
  'landscape-right': 'LandscapeRight',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return typeof field === 'string' && field !== '' ? field : undefined;
}

function isUiTree(value: unknown): value is UiTree {
  return isRecord(value) && Array.isArray(value.roots);
}

/** XCUIElement types a touch acts on: a drag that lands on one is a tap to it. */
const CONTROL_TYPES: ReadonlySet<string> = new Set([
  'Button',
  'Cell',
  'Key',
  'Keyboard',
  'Link',
  'SearchField',
  'SecureTextField',
  'SegmentedControl',
  'Slider',
  'Stepper',
  'Switch',
  'TextField',
  'TextView',
  'Toggle',
]);

function isControl(node: SnapshotNode): boolean {
  return node.editable === true || (node.type !== undefined && CONTROL_TYPES.has(node.type));
}

/** How far a keyboard-dismissing drag travels, as a share of the screen: the surface's own drag. */
const DISMISS_DRAG_SHARE = 0.03;

/**
 * A point on the app above the keyboard with no control under it, nor
 * within a drag's reach of one: the middle column first, then the sides,
 * from just above the keyboard up to below the status bar. Undefined when
 * every candidate sits on a control.
 */
function clearSpot(screen: { readonly width: number; readonly height: number }, keyboardTop: number, controls: readonly Rect[]): Point | undefined {
  const margin = Math.max(screen.width, screen.height) * DISMISS_DRAG_SHARE * 1.5;
  const near = (point: Point, rect: Rect): boolean =>
    point.x >= rect.x - margin && point.x <= rect.x + rect.width + margin && point.y >= rect.y - margin && point.y <= rect.y + rect.height + margin;
  const step = screen.height * 0.04;
  for (const share of [0.5, 0.2, 0.8]) {
    for (let y = keyboardTop - margin; y >= screen.height * 0.12; y -= step) {
      const point = { x: screen.width * share, y };
      if (!controls.some((rect) => near(point, rect))) return point;
    }
  }
  return undefined;
}

/** Whether a root's subtree shows anything of its own: a label, value, or identifier below the root itself. */
function showsContent(root: UiTreeNode): boolean {
  const named = (node: UiTreeNode): boolean =>
    node.label !== undefined || node.value !== undefined || node.identifier !== undefined || node.children.some(named);
  return root.children.some(named);
}

function centre(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function refused(what: string): EngineError {
  return unsupported(`argent has no tool for ${what}; use the default agent-device driver for it`);
}

/** A device id as argent lists it: the UDID of an Apple simulator, the serial of an Android device. */
function idOf(device: ListedDevice): string | undefined {
  return device.udid ?? device.serial;
}

function isBooted(device: ListedDevice): boolean {
  return device.state === 'Booted' || device.state === 'device';
}

/**
 * A fraction of the screen back in native units. argent normalizes frames
 * from whole points or pixels, so the product is rounded to a thousandth:
 * 240 points come back as 240, not 239.99999999999997.
 */
function native(fraction: number, extent: number): number {
  return Math.round(fraction * extent * 1000) / 1000;
}

/**
 * The element type agent-device would report: argent's own, except that a
 * toggle button (a web checkbox, a UIKit button with toggle behaviour) is
 * the switch XCTest calls it, which `getByRole('switch')` finds.
 */
function typeOf(node: UiTreeNode): string {
  if (node.traits?.includes('toggleButton') === true) return 'Switch';
  return node.type ?? node.role;
}

/**
 * Whether no node of a subtree is on screen. iOS keeps the keyboard's
 * windows in the tree after it hides, every node flagged hidden, where
 * agent-device drops them; a subtree like that shows nothing and is left
 * out. A hidden node with a visible descendant stays, flagged.
 */
function whollyHidden(node: UiTreeNode): boolean {
  return node.hidden === true && node.children.every(whollyHidden);
}

/**
 * Flattens one `ui-tree` into agent-device's node list: document order,
 * `parentIndex` and `depth` for the tree, frames in native units, and a ref
 * per node. A node argent reports as covered (behind a system alert or an
 * in-app presentation) is left out with its subtree, as the screen shows
 * only what covers it, and so is a subtree with nothing on screen.
 */
function flatten(tree: UiTree, mintRef: () => string): SnapshotNode[] {
  const screen = tree.screen;
  const nodes: SnapshotNode[] = [];
  const visit = (node: UiTreeNode, parentIndex: number | undefined, depth: number): void => {
    if (node.covered === true || whollyHidden(node)) return;
    const index = nodes.length;
    const frame = node.frame;
    const rect =
      frame === undefined || screen === undefined
        ? undefined
        : {
            x: native(frame.x, screen.width),
            y: native(frame.y, screen.height),
            width: native(frame.width, screen.width),
            height: native(frame.height, screen.height),
          };
    const label = node.label;
    nodes.push({
      index,
      ref: mintRef(),
      depth,
      ...(parentIndex === undefined ? {} : { parentIndex }),
      type: typeOf(node),
      ...(label === undefined ? {} : { label }),
      ...(node.value === undefined ? {} : { value: node.value }),
      ...(node.identifier === undefined ? {} : { identifier: node.identifier }),
      // agent-device carries Android's content description only when it is not already the label.
      ...(node.contentDescription === undefined || node.contentDescription === label ? {} : { contentDescription: node.contentDescription }),
      ...(rect === undefined ? {} : { rect }),
      enabled: node.disabled !== true,
      visibleToUser: node.hidden !== true,
      ...(node.selected === undefined ? {} : { selected: node.selected }),
      ...(node.checked === undefined ? {} : { checked: node.checked }),
      ...(node.focused === undefined ? {} : { focused: node.focused }),
      ...(node.heading === undefined ? {} : { heading: node.heading }),
      ...(node.roleDescription === undefined ? {} : { roleDescription: node.roleDescription }),
      ...(node.editable === undefined ? {} : { editable: node.editable }),
      ...(node.password === undefined ? {} : { password: node.password }),
      ...(node.hintShowing === undefined ? {} : { hintShowing: node.hintShowing }),
      ...(node.placeholder === undefined ? {} : { placeholder: node.placeholder }),
      ...(node.bundleId === undefined ? {} : { bundleId: node.bundleId }),
    });
    for (const child of node.children) visit(child, index, depth + 1);
  };
  for (const root of tree.roots) visit(root, undefined, 0);
  return nodes;
}

/** The interaction target forms the engine sends: a ref, or a point in native units. */
type Target = { readonly ref?: string | undefined; readonly x?: number | undefined; readonly y?: number | undefined };

/** Settle options the engine spreads onto an action. */
type Settle = { readonly settle?: boolean | undefined; readonly settleQuietMs?: number | undefined };

/**
 * One device driven through argent. It learns its device from the first
 * `boot`, which the surface and the pool both send before anything else.
 */
class ArgentDevice {
  private caller: Promise<ArgentCaller> | undefined;
  private udid: string | undefined;
  private screen: { readonly width: number; readonly height: number } | undefined;
  /** The app last opened here: argent sets permissions per app, and the session has no app of its own. */
  private app: string | undefined;
  private generation = 0;
  private readonly refs = new Map<string, RefEntry>();
  /** Ref prefixes of the newest captures, oldest first. */
  private readonly generations: string[] = [];
  /** Whether the newest tree showed the soft keyboard, and whether it showed when the last touch went out. */
  private keyboardShown = false;
  private keyboardAtLastTouch = false;
  /** Where the running recording should land. */
  private recordingPath: string | undefined;

  constructor(
    private readonly platform: MobilePlatform,
    private readonly load: ArgentLoader,
  ) {}

  /**
   * One argent tool call; its failure keeps argent's message, which names the
   * tool. Every call has a deadline: the engine cannot cancel a command once
   * it is out, and waits for it before the next attempt, so a call that never
   * answers would hold the worker for good.
   */
  async call<N extends ArgentToolName>(name: N, args: ArgentToolArgs[N]): Promise<unknown> {
    this.caller ??= this.load();
    const caller = await this.caller;
    const budget = callBudget(name, args);
    // `callTool`'s rest parameters are a conditional type TypeScript cannot narrow for a generic `N`.
    const callTool = caller.callTool as <M extends ArgentToolName>(name: M, args: ArgentToolArgs[M], options: CallToolOptions) => Promise<{ data: unknown }>;
    try {
      return (await callTool(name, args, { signal: AbortSignal.timeout(budget) })).data;
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'TimeoutError') {
        throw new EngineError('ENGINE_FAILURE', `argent's ${name} did not answer in ${budget / 1000} s`, { retryable: false, cause });
      }
      throw cause;
    }
  }

  // --- devices ---

  async list(): Promise<readonly unknown[]> {
    const devices = await this.devices();
    return devices.map((device) => ({
      platform: device.platform,
      id: idOf(device),
      name: device.name ?? device.avdName ?? device.model ?? idOf(device),
      booted: isBooted(device),
    }));
  }

  private async devices(): Promise<ListedDevice[]> {
    const listing = await this.call('list-devices', {});
    const devices = isRecord(listing) && Array.isArray(listing.devices) ? (listing.devices as ListedDevice[]) : [];
    return devices.filter((device) => device.platform === this.platform);
  }

  private async avds(): Promise<string[]> {
    const listing = await this.call('list-devices', {});
    const avds = isRecord(listing) && Array.isArray(listing.avds) ? listing.avds : [];
    return avds.map((avd) => stringField(avd, 'name')).filter((name): name is string => name !== undefined);
  }

  /**
   * Picks the device a selection names and boots it when it is not running:
   * an id as it is, a name among the platform's simulators (iOS) or emulator
   * images (Android), and with neither the first booted device, else the
   * first one that can boot.
   */
  async boot(selection: Selection): Promise<void> {
    const id = selection.udid ?? selection.serial;
    const devices = await this.devices();
    if (id !== undefined) {
      const found = devices.find((device) => idOf(device) === id);
      if (found === undefined) throw this.noDevice(`id ${id}`, devices);
      this.udid = isBooted(found) ? id : await this.bootDevice({ udid: id });
      return;
    }
    const name = selection.device;
    if (name !== undefined) {
      const named = devices.filter((device) => device.name === name || device.avdName === name || device.model === name || idOf(device) === name);
      const running = named.find(isBooted);
      if (running !== undefined) {
        this.udid = idOf(running);
        return;
      }
      if (this.platform === 'android') {
        if (!(await this.avds()).includes(name)) throw this.noDevice(`name "${name}"`, devices);
        this.udid = await this.bootDevice({ avdName: name });
        return;
      }
      const stopped = named.map(idOf).find((candidate) => candidate !== undefined);
      if (stopped === undefined) throw this.noDevice(`name "${name}"`, devices);
      this.udid = await this.bootDevice({ udid: stopped });
      return;
    }
    const running = devices.find(isBooted);
    if (running !== undefined) {
      this.udid = idOf(running);
      return;
    }
    if (this.platform === 'android') {
      const [avd] = await this.avds();
      if (avd === undefined) throw this.noDevice('any name', devices);
      this.udid = await this.bootDevice({ avdName: avd });
      return;
    }
    const phone = idOf(devices.find((device) => device.name?.startsWith('iPhone') === true) ?? devices[0] ?? {});
    if (phone === undefined) throw this.noDevice('any name', devices);
    this.udid = await this.bootDevice({ udid: phone });
  }

  private async bootDevice(args: { readonly udid: string } | { readonly avdName: string }): Promise<string> {
    const booted = await this.call('boot-device', args);
    const id = stringField(booted, 'udid') ?? stringField(booted, 'serial') ?? ('udid' in args ? args.udid : undefined);
    if (id === undefined) throw new EngineError('ENGINE_FAILURE', `argent booted ${'avdName' in args ? args.avdName : 'a device'} but named no device id`, { retryable: false });
    return id;
  }

  private noDevice(by: string, devices: readonly ListedDevice[]): EngineError {
    const known = devices.map((device) => device.name ?? device.avdName ?? idOf(device)).filter((name) => name !== undefined);
    return new EngineError(
      'ENGINE_FAILURE',
      `argent lists no ${this.platform} device with ${by}${known.length === 0 ? '' : `; it lists ${[...new Set(known)].join(', ')}`}`,
      { retryable: false },
    );
  }

  /** The device every command goes to; a command before any `boot` picks one the way an empty selection does. */
  private async device(): Promise<string> {
    if (this.udid === undefined) await this.boot({});
    return this.udid as string;
  }

  // --- apps ---

  /**
   * Opens an app, a link, or a link into an app. A relaunch is argent's
   * `restart-app`; a plain open is `launch-app`, which brings a running app
   * forward. A link into an app launches the app first, then opens the URL.
   */
  async open(options: { readonly app?: string | undefined; readonly url?: string | undefined; readonly relaunch?: boolean | undefined; readonly launchArgs?: readonly string[] | undefined }): Promise<{ appBundleId?: string }> {
    const udid = await this.device();
    const { app, url } = options;
    if (app !== undefined && url === undefined && isUrl(app)) {
      await this.call('open-url', { udid, url: app });
      return {};
    }
    if (app !== undefined) {
      const launchArgs = options.launchArgs === undefined || options.launchArgs.length === 0 ? {} : { launchArgs: [...options.launchArgs] };
      await this.call(options.relaunch === true ? 'restart-app' : 'launch-app', { udid, bundleId: app, ...launchArgs });
      this.app = app;
      await this.awaitLaunch(app);
    }
    if (url !== undefined) await this.call('open-url', { udid, url });
    return app === undefined ? {} : { appBundleId: app };
  }

  /**
   * Waits for a launched app to show its first screen and hold it still.
   * argent's launch returns once the process starts, before the app has
   * drawn anything, and an app can list its controls before it takes
   * touches: a Flutter app drops a tap sent the moment its tree appears and
   * takes one half a second later. So the wait is for the app in front with
   * something of its own on screen, then for a quiet `LAUNCH_QUIET_MS`. An
   * app that shows nothing in `LAUNCH_TIMEOUT_MS` is left to the test,
   * whose own polling reports what it does show.
   */
  private async awaitLaunch(app: string): Promise<void> {
    const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
    for (;;) {
      const tree = await this.tree();
      if (tree.foregroundApp === app && tree.roots.some(showsContent)) break;
      if (Date.now() >= deadline) return;
      await sleep(FOCUS_POLL_MS);
    }
    await this.settle({ settle: true, settleQuietMs: LAUNCH_QUIET_MS });
  }

  /** argent installs a build by removing the app first: it needs the bundle id or package the build carries. */
  async install(options: { readonly app?: string | undefined; readonly appPath: string }): Promise<{ bundleId?: string; package?: string }> {
    const app = options.app;
    if (app === undefined) {
      throw unsupported("argent installs a build under its bundle id or package: name it with the target's app.bundleId or installApp's `app` option");
    }
    await this.call('reinstall-app', { udid: await this.device(), bundleId: app, appPath: options.appPath });
    return this.platform === 'android' ? { package: app } : { bundleId: app };
  }

  // --- capture ---

  /** Reads the screen's tree for the engine, minting refs for its nodes; the oldest capture's refs expire. */
  async snapshot(): Promise<DeviceSnapshot> {
    const { tree, nodes } = await this.capture(true);
    return {
      nodes,
      truncated: tree.truncated,
      ...(tree.foregroundApp === undefined ? {} : { appBundleId: tree.foregroundApp }),
      ...(tree.keyboardVisible === undefined ? {} : { keyboard: { kind: tree.keyboardVisible ? 'visible' : 'absent' } }),
    };
  }

  /**
   * One tree, flattened. Only the engine's own reads (`register`) keep their
   * refs: the looks this driver takes inside a command (has the field taken
   * focus, did the keyboard go) would otherwise expire refs the engine still
   * holds from its last observation.
   */
  private async capture(register = false): Promise<Capture> {
    const tree = await this.tree();
    this.generation += 1;
    const prefix = `g${this.generation}e`;
    let counter = 0;
    const nodes = flatten(tree, () => `${prefix}${(counter += 1)}`);
    if (!register) return { tree, nodes };
    this.generations.push(prefix);
    for (const node of nodes) {
      if (node.ref === undefined || node.rect === undefined) continue;
      this.refs.set(node.ref, { rect: node.rect, value: node.hintShowing === true ? undefined : node.value, focused: node.focused === true });
    }
    while (this.generations.length > REF_GENERATIONS) {
      const expired = this.generations.shift() as string;
      for (const ref of this.refs.keys()) if (ref.startsWith(expired)) this.refs.delete(ref);
    }
    return { tree, nodes };
  }

  private async tree(): Promise<UiTree> {
    const tree = await this.call('ui-tree', { udid: await this.device() });
    if (!isUiTree(tree)) throw new EngineError('ENGINE_FAILURE', 'argent answered ui-tree with no tree', { retryable: false });
    this.keyboardShown = tree.keyboardVisible === true;
    if (tree.screen !== undefined && tree.screen.width > 0 && tree.screen.height > 0) this.screen = tree.screen;
    return tree;
  }

  /** The screen in native units, from the newest tree, read once when none has been. */
  private async screenSize(): Promise<{ readonly width: number; readonly height: number }> {
    if (this.screen === undefined) await this.tree();
    if (this.screen === undefined) throw new EngineError('ENGINE_FAILURE', 'argent reported no screen size, so no point can be placed', { retryable: false });
    return this.screen;
  }

  /** A full-resolution screenshot, copied to `target` when one is given; argent's own file is removed. */
  async screenshot(options: { readonly path?: string | undefined; readonly normalizeStatusBar?: boolean | undefined }): Promise<{ path: string; logicalWidth: number; logicalHeight: number }> {
    if (options.normalizeStatusBar === true) throw refused('a screenshot with a normalized status bar');
    const shot = await this.call('screenshot', { udid: await this.device(), scale: 1, includeImageInContext: false });
    const image = stringField(shot, 'image');
    if (image === undefined) throw new EngineError('ENGINE_FAILURE', 'argent answered screenshot with no image', { retryable: false });
    const screen = await this.screenSize();
    if (options.path === undefined) return { path: image, logicalWidth: screen.width, logicalHeight: screen.height };
    copyFileSync(image, options.path);
    rmSync(image, { force: true });
    return { path: options.path, logicalWidth: screen.width, logicalHeight: screen.height };
  }

  // --- input ---

  /** The point an action on `target` lands on, in native units. */
  private pointOf(target: Target): Point {
    if (target.ref !== undefined) return centre(this.entry(target.ref).rect);
    if (target.x !== undefined && target.y !== undefined) return { x: target.x, y: target.y };
    throw unsupported('argent acts on a node or a point, not a selector');
  }

  private entry(ref: string): RefEntry {
    const entry = this.refs.get(ref.startsWith('@') ? ref.slice(1) : ref);
    if (entry === undefined) throw new EngineError('NODE_STALE', `node ${ref} belongs to a screen read too long ago`, { retryable: true });
    return entry;
  }

  /** A point as argent takes it: fractions of the screen. */
  private async normalized(point: Point): Promise<{ x: number; y: number }> {
    const screen = await this.screenSize();
    return { x: point.x / screen.width, y: point.y / screen.height };
  }

  async tap(target: Target & { readonly count?: number | undefined } & Settle): Promise<void> {
    await this.quiet();
    const at = await this.normalized(this.pointOf(target));
    await this.call('gesture-tap', { udid: await this.device(), ...at, ...(target.count === undefined || target.count <= 1 ? {} : { clickCount: target.count }) });
    await this.settle(target);
  }

  async longPress(target: Target & { readonly durationMs?: number | undefined } & Settle): Promise<void> {
    await this.quiet();
    const at = await this.normalized(this.pointOf(target));
    await this.call('gesture-custom', {
      udid: await this.device(),
      events: [
        { type: 'Down', ...at },
        { type: 'Up', ...at, delayMs: target.durationMs ?? 1_000 },
      ],
    });
    await this.settle(target);
  }

  /** A drag from one point to another that ends where it was aimed: no fling. */
  async swipe(from: Point, to: Point, durationMs = DRAG_MS): Promise<void> {
    const start = await this.normalized(from);
    const end = await this.normalized(to);
    await this.call('gesture-swipe', {
      udid: await this.device(),
      fromX: start.x,
      fromY: start.y,
      toX: end.x,
      toY: end.y,
      durationMs: Math.max(durationMs, 150),
      momentum: false,
    });
  }

  /** Scrolls the whole screen: a drag across its middle, against the direction the content moves. */
  async scroll(options: { readonly direction: string } & Settle): Promise<void> {
    const screen = await this.screenSize();
    const half = SCROLL_SHARE / 2;
    const middle = { x: screen.width / 2, y: screen.height / 2 };
    const dx = screen.width * half;
    const dy = screen.height * half;
    const drags: Readonly<Record<string, readonly [Point, Point]>> = {
      down: [{ x: middle.x, y: middle.y + dy }, { x: middle.x, y: middle.y - dy }],
      bottom: [{ x: middle.x, y: middle.y + dy }, { x: middle.x, y: middle.y - dy }],
      up: [{ x: middle.x, y: middle.y - dy }, { x: middle.x, y: middle.y + dy }],
      top: [{ x: middle.x, y: middle.y - dy }, { x: middle.x, y: middle.y + dy }],
      right: [{ x: middle.x + dx, y: middle.y }, { x: middle.x - dx, y: middle.y }],
      left: [{ x: middle.x - dx, y: middle.y }, { x: middle.x + dx, y: middle.y }],
    };
    const drag = drags[options.direction];
    if (drag === undefined) throw unsupported(`argent cannot scroll ${options.direction}`);
    await this.swipe(drag[0], drag[1]);
    await this.settle(options);
  }

  /** Picks the source up, holds it, carries it to the destination, and lets go. */
  async drag(source: string, destination: string): Promise<void> {
    const from = await this.normalized(centre(this.entry(source).rect));
    const to = await this.normalized(centre(this.entry(destination).rect));
    await this.call('gesture-custom', {
      udid: await this.device(),
      events: [
        { type: 'Down', ...from },
        { type: 'Move', ...from, delayMs: DRAG_HOLD_MS },
        { type: 'Move', ...to, delayMs: DRAG_MS },
        { type: 'Up', ...to, delayMs: 100 },
      ],
      interpolate: 10,
    });
  }

  /**
   * Fills a field: a tap toward its trailing edge, where the caret lands
   * after any text it holds, a wait for it to take focus, backspaces until it
   * is empty, then the text.
   */
  async fill(target: Target & { readonly text: string } & Settle, sensitive = false): Promise<void> {
    if (target.ref === undefined) throw unsupported('argent fills a node, not a point or selector');
    assertTypeable(target.text, sensitive);
    const entry = this.entry(target.ref);
    await this.quiet();
    const { rect } = entry;
    const end = { x: rect.x + rect.width - Math.min(rect.width / 4, 12), y: rect.y + rect.height / 2 };
    await this.call('gesture-tap', { udid: await this.device(), ...(await this.normalized(end)) });
    const field = entry.focused ? entry.value : await this.awaitFocus(entry.value);
    await this.clear(field);
    if (target.text !== '') await this.typeText(target.text, sensitive);
    await this.settle(target);
  }

  /** Waits for an editable node to hold focus, answering its value; the value seen before the tap when none does in time. */
  private async awaitFocus(before: string | undefined): Promise<string | undefined> {
    const deadline = Date.now() + FOCUS_TIMEOUT_MS;
    for (;;) {
      const { nodes, tree } = await this.capture();
      const focused = nodes.find((node) => node.focused === true && node.editable === true);
      if (focused !== undefined) return focused.hintShowing === true ? undefined : focused.value;
      if (tree.keyboardVisible === true || Date.now() >= deadline) return before;
      await sleep(FOCUS_POLL_MS);
    }
  }

  /** Deletes the focused field's text, a backspace per character, reading it back after each round. */
  private async clear(value: string | undefined): Promise<void> {
    let remaining = value?.length ?? 0;
    for (let round = 0; round < CLEAR_ROUNDS && remaining > 0; round += 1) {
      const keys = this.platform === 'ios' ? [{ tool: 'keyboard', args: { key: 'arrow-down' } }] : [];
      for (let key = 0; key < remaining; key += 1) keys.push({ tool: 'keyboard', args: { key: 'backspace' } });
      await this.call('run-sequence', { udid: await this.device(), steps: keys.map((step) => ({ ...step, delayMs: 0 })) });
      const { nodes } = await this.capture();
      const focused = nodes.find((node) => node.focused === true && node.editable === true);
      remaining = focused === undefined || focused.hintShowing === true ? 0 : (focused.value?.length ?? 0);
    }
  }

  /**
   * Types into the focused field: key by key for printable ASCII, through the
   * clipboard for anything else. A secret's value never goes through the
   * clipboard, where it would outlive the attempt.
   */
  async typeText(text: string, sensitive = false): Promise<void> {
    assertTypeable(text, sensitive);
    const udid = await this.device();
    if (TYPEABLE.test(text)) await this.call('keyboard', { udid, text });
    else await this.call('paste', { udid, text });
  }

  async keyboard(action: string | undefined): Promise<void> {
    const udid = await this.device();
    if (action === 'enter' || action === 'return') {
      await this.call('keyboard', { udid, key: 'enter' });
      return;
    }
    if (action === 'dismiss') {
      // Android's back closes a showing keyboard and nothing else.
      if (this.platform === 'android') {
        const tree = await this.tree();
        if (tree.keyboardVisible === true) await this.call('button', { udid, button: 'back' });
        return;
      }
      await this.dismissIosKeyboard();
      return;
    }
    throw refused(`keyboard ${action ?? 'status'}`);
  }

  /**
   * An iPhone keyboard has no key that hides it, so it goes the way a user
   * sends it away: a short drag on the app above it, which a scroll view
   * takes as the touch outside the field that dismisses it. The drag lands
   * where the tree shows no control (a drag that short is a tap to a
   * button under it), horizontal first and vertical second, with a look at
   * the keyboard after each. With no such spot the surface's own drag at the
   * centre of the screen is the fallback.
   */
  private async dismissIosKeyboard(): Promise<void> {
    const { tree, nodes } = await this.capture();
    if (tree.keyboardVisible !== true) return;
    const screen = await this.screenSize();
    const keyboardTop = nodes.find((node) => node.type === 'Keyboard')?.rect?.y ?? screen.height * 0.6;
    const controls = nodes.filter(isControl).map((node) => node.rect).filter((rect): rect is Rect => rect !== undefined);
    const spot = clearSpot(screen, keyboardTop, controls);
    if (spot === undefined) throw refused('dismissing the iOS keyboard where no control sits above it');
    const reach = { x: screen.width * DISMISS_DRAG_SHARE, y: screen.height * DISMISS_DRAG_SHARE };
    for (const to of [{ x: spot.x - reach.x, y: spot.y }, { x: spot.x, y: spot.y - reach.y }]) {
      await this.swipe(spot, to);
      if ((await this.tree()).keyboardVisible !== true) return;
    }
    throw notActionable(
      "keyboard dismissal failed: the keyboard stayed up through a horizontal and a vertical drag on the app above it. Tap the app's own Done or close control, or press Enter on the field when submitting is what you want.",
    );
  }

  /**
   * Android's back button. iOS has none: the navigation bar's back button
   * when the screen shows one (UIKit names it `BackButton`), else the swipe
   * from the left edge a navigation stack answers.
   */
  async back(settle: Settle): Promise<void> {
    const udid = await this.device();
    if (this.platform === 'android') await this.call('button', { udid, button: 'back' });
    else {
      const { nodes } = await this.capture();
      const button = nodes.findLast((node) => node.identifier === 'BackButton' && node.visibleToUser !== false && node.rect !== undefined);
      if (button?.rect !== undefined) {
        await this.call('gesture-tap', { udid, ...(await this.normalized(centre(button.rect))) });
      } else {
        await this.call('gesture-swipe', { udid, fromX: 0, fromY: 0.5, toX: 0.8, toY: 0.5, durationMs: DRAG_MS });
      }
    }
    await this.settle(settle);
  }

  /** The home screen; answers once the app has left the front, so a launch that follows is not undone by the press. */
  async home(): Promise<void> {
    const udid = await this.device();
    const before = (await this.tree()).foregroundApp;
    await this.call('button', { udid, button: 'home' });
    if (before === undefined) return;
    const deadline = Date.now() + HOME_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if ((await this.tree()).foregroundApp !== before) return;
      await sleep(FOCUS_POLL_MS);
    }
  }

  /**
   * Waits, briefly, for the screen to stop moving before a touch. XCTest
   * waits for the app to go idle before every action and argent does not:
   * a tap sent while the keyboard slides away, or a web view scrolls after
   * it, is dropped by WebKit. Best effort, and short: a screen that never
   * holds still (a spinner the tree reports) costs `QUIET_TIMEOUT_MS`.
   * While the keyboard shows, or showed at the touch before, the window is
   * longer: a touch can send it away, and a web view scrolls its page back
   * after it has left, with frames the tree reports late.
   */
  private async quiet(): Promise<void> {
    const keyboard = this.keyboardShown || this.keyboardAtLastTouch;
    this.keyboardAtLastTouch = this.keyboardShown;
    await this.call('await-screen-idle', {
      udid: await this.device(),
      timeoutMs: QUIET_TIMEOUT_MS,
      minStableMs: keyboard ? QUIET_KEYBOARD_STABLE_MS : QUIET_STABLE_MS,
      pollIntervalMs: QUIET_POLL_MS,
    }).catch(() => undefined);
  }

  /** Waits for the screen to hold still after an action; best effort, as agent-device's settle is. */
  private async settle(options: Settle): Promise<void> {
    if (options.settle !== true) return;
    await this.call('await-screen-idle', {
      udid: await this.device(),
      timeoutMs: SETTLE_TIMEOUT_MS,
      ...(options.settleQuietMs === undefined ? {} : { minStableMs: Math.max(options.settleQuietMs, 1) }),
    }).catch(() => undefined);
  }

  // --- device state ---

  async appState(): Promise<{ package: string } | { appName: string; appBundleId: string }> {
    const tree = await this.tree();
    // Android leaves `foregroundApp` unset on the launcher; the topmost window's package is what is in front.
    const app = tree.foregroundApp ?? tree.roots.find((root) => root.bundleId !== undefined)?.bundleId;
    if (app === undefined) throw invalidState('argent reports no app in the foreground');
    return this.platform === 'android' ? { package: app } : { appName: app, appBundleId: app };
  }

  async orientation(orientation: string): Promise<void> {
    const rotation = ROTATIONS[orientation];
    if (rotation === undefined) throw new TestError('INVALID_ARGUMENT', `unknown orientation "${orientation}"`);
    await this.call('rotate', { udid: await this.device(), orientation: rotation });
  }

  async fold(pose: ArgentToolArgs['fold']['posture'] & string): Promise<void> {
    await this.call('fold', { udid: await this.device(), posture: pose });
  }

  /** argent sets a permission on one app: the one last opened here. */
  async settings(options: { readonly setting: string; readonly permission?: string; readonly state?: string }): Promise<void> {
    if (options.setting !== 'permission') throw refused(`the ${options.setting} setting`);
    const permission = PERMISSIONS[options.permission ?? ''];
    if (permission === undefined) throw refused(`the ${options.permission ?? 'unnamed'} permission`);
    const action = PERMISSION_STATES.find((state) => state === options.state);
    if (action === undefined) throw new TestError('INVALID_ARGUMENT', `a permission is set to grant, deny, or reset, not ${String(options.state)}`);
    if (this.app === undefined) throw invalidState('a permission change needs an app: open one first');
    await this.call('settings-permissions', { udid: await this.device(), action, permission, bundleId: this.app });
  }

  // --- recording ---

  async record(options: { readonly action: string; readonly path?: string; readonly hideTouches?: boolean }): Promise<{ outPath?: string }> {
    const udid = await this.device();
    if (options.action === 'start') {
      this.recordingPath = options.path;
      await this.call('screen-recording-start', {
        udid,
        timeLimitSeconds: RECORDING_LIMIT_S,
        trimStatic: false,
        showTouches: options.hideTouches !== true,
      });
      return {};
    }
    const stopped = await this.call('screen-recording-stop', { udid });
    const video = stringField(stopped, 'video');
    const target = this.recordingPath;
    this.recordingPath = undefined;
    if (video === undefined) return {};
    if (target === undefined) return { outPath: video };
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(video, target);
    rmSync(video, { force: true });
    removeIfEmpty(path.dirname(video));
    return { outPath: target };
  }
}

/** argent saves a recording under `<project>/.argent/recordings`; once it is moved out, the empty folders go too. */
function removeIfEmpty(directory: string): void {
  for (let current = directory, hops = 0; hops < 2; current = path.dirname(current), hops += 1) {
    try {
      if (readdirSync(current).length > 0) return;
      rmdirSync(current);
    } catch {
      return;
    }
  }
}

function isUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * The `DeviceClient` a `mobile({ driver: 'argent' })` worker drives. Sessions
 * are the engine's bookkeeping, not argent's: listing finds none and closing
 * one ends nothing. Every command argent has no tool for throws
 * `UNSUPPORTED_CAPABILITY`.
 */
export function createArgentDeviceClient(platform: MobilePlatform, connection?: DeviceConnection, load: ArgentLoader = loadArgent): DeviceClient {
  assertLocal(connection);
  const device = new ArgentDevice(platform, load);
  const refuse = (what: string) => async (): Promise<never> => {
    throw refused(what);
  };
  return {
    devices: {
      list: () => device.list(),
      boot: async (options) => device.boot(options ?? {}),
    },
    sessions: {
      list: async () => [],
      close: async () => ({}),
    },
    apps: {
      open: (options) => device.open(options),
      close: refuse('terminating an app'),
      install: (options) => device.install(options),
      reinstall: (options) => device.install(options),
    },
    capture: {
      snapshot: () => device.snapshot(),
      screenshot: (options) => device.screenshot(options ?? {}),
    },
    interactions: {
      press: (options) => device.tap(options),
      longPress: (options) => device.longPress(options),
      hover: refuse('hovering'),
      fill: (options, input) => device.fill(options, input?.sensitive === true),
      type: (options) => device.typeText(options.text),
      scroll: (options) => device.scroll(options),
      swipe: (options) => device.swipe(options.from, options.to),
      drag: (options) => device.drag(options.source, options.destination),
      pan: (options) => device.swipe({ x: options.x, y: options.y }, { x: options.x + options.dx, y: options.y + options.dy }, options.durationMs),
    },
    command: {
      keyboard: (options) => device.keyboard(options?.action),
      back: (options) => device.back(options ?? {}),
      home: () => device.home(),
      alert: refuse('accepting or dismissing a system alert; tap its button on screen'),
      appState: () => device.appState(),
      clipboard: refuse('the clipboard'),
      orientation: (options) => device.orientation(options.orientation),
      fold: async (options) => {
        if (options.pose === undefined) throw refused('fold keyframes');
        await device.fold(options.pose);
      },
      // argent has no automation runner to start ahead of the first command.
      prepare: async () => ({}),
    },
    settings: {
      update: (options) => device.settings(options),
    },
    recording: {
      record: (options) => device.record(options),
    },
  };
}
