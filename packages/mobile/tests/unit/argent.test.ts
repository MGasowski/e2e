/**
 * The argent driver over a scripted argent client: what each engine command
 * becomes as argent tool calls, the tree it projects, and what it refuses.
 * The last block runs the whole surface on it through the contract.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UiTree, UiTreeNode } from '@swmansion/argent/client';
import { EngineError, type OperationContext } from 'e2e/engine';
import { createArgentDeviceClient, type ArgentCaller } from '../../src/argent.ts';
import { buildEngine, mobile } from '../../src/engine.ts';
import { AgentDeviceSurface } from '../../src/surface.ts';
import { PROJECT_ROOT } from '../helpers/harness.ts';
import { ignoreTrace, noSecrets } from '../helpers/secrets.ts';

/** The tool calls `@swmansion/argent/client` received in this file: only `mobile()` loads it, the rest inject a loader. */
const moduleCalls = vi.hoisted(() => [] as string[]);
vi.mock('@swmansion/argent/client', () => ({
  createArgentClient: () => ({
    callTool: async (tool: string) => {
      moduleCalls.push(tool);
      return { data: tool === 'list-devices' ? { devices: [{ platform: 'ios', udid: 'MOCKED', name: 'iPhone', state: 'Booted' }] } : {} };
    },
  }),
}));

type Responder = (args: Record<string, unknown>) => unknown;

interface Call {
  readonly tool: string;
  readonly args: Record<string, unknown>;
}

const UDID = '2C905727-A9A7-4A45-92E7-5F47F43847A3';

const node = (fields: Partial<UiTreeNode>): UiTreeNode => ({ role: 'AXGroup', children: [], ...fields });

/** The SwiftUI example's form, as argent's ui-tree reports it on a 402 x 874 point iPhone. */
function formTree(overrides: { readonly value?: string; readonly focused?: boolean; readonly keyboard?: boolean } = {}): UiTree {
  return {
    schemaVersion: 1,
    source: 'ax-service',
    screen: { width: 402, height: 874 },
    roots: [
      node({
        type: 'Application',
        label: 'with-swiftui',
        bundleId: 'dev.e2e.examples.swiftui',
        frame: { x: 0, y: 0, width: 1, height: 1 },
        children: [
          node({ role: 'AXHeading', type: 'StaticText', label: 'Say hello', heading: true, frame: { x: 0.05, y: 0.25, width: 0.4, height: 0.05 } }),
          node({
            role: 'AXTextField',
            type: 'TextField',
            label: 'Name',
            identifier: 'name',
            editable: true,
            placeholder: 'Ada Lovelace',
            frame: { x: 0.1, y: 0.5, width: 0.8, height: 0.05 },
            ...(overrides.value === undefined ? { hintShowing: true } : { value: overrides.value }),
            ...(overrides.focused === true ? { focused: true } : {}),
          }),
          node({ role: 'AXButton', type: 'Button', label: 'GREET', identifier: 'greet', frame: { x: 0.05, y: 0.6, width: 0.9, height: 0.05 } }),
          node({ role: 'AXButton', type: 'Button', label: 'Behind', covered: true, frame: { x: 0, y: 0.9, width: 1, height: 0.05 } }),
        ],
      }),
    ],
    truncated: false,
    keyboardVisible: overrides.keyboard ?? false,
    foregroundApp: 'dev.e2e.examples.swiftui',
    unsupportedFields: [],
  };
}

const DEVICES = {
  devices: [
    { platform: 'ios', udid: UDID, name: 'iPhone 17 Pro', state: 'Booted' },
    { platform: 'ios', udid: 'OTHER', name: 'iPhone Air', state: 'Shutdown' },
    { platform: 'android', serial: 'emulator-5554', state: 'device', avdName: 'pixel' },
  ],
  avds: [{ name: 'pixel' }],
};

function scripted(initial: Readonly<Record<string, Responder>> = {}) {
  const responders = new Map<string, Responder>(Object.entries({ 'list-devices': () => DEVICES, 'ui-tree': () => formTree(), ...initial }));
  const calls: Call[] = [];
  const caller = {
    callTool: async (tool: string, args: Record<string, unknown> = {}) => {
      calls.push({ tool, args });
      const responder = responders.get(tool);
      return { data: responder === undefined ? {} : responder(args) };
    },
  } as unknown as ArgentCaller;
  return {
    calls,
    tools: () => calls.map((call) => call.tool),
    respond: (tool: string, responder: Responder) => responders.set(tool, responder),
    client: (platform: 'ios' | 'android' = 'ios') => createArgentDeviceClient(platform, undefined, async () => caller),
  };
}

let scratch: string;

beforeEach(() => {
  scratch = mkdtempSync(path.join(tmpdir(), 'e2e-argent-'));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('device selection', () => {
  it('drives the first booted device of the platform when nothing names one', async () => {
    const argent = scripted();
    const client = argent.client();
    await client.devices.boot({ platform: 'ios' });
    await client.apps.open({ app: 'dev.e2e.examples.swiftui' });
    expect(argent.calls.find((call) => call.tool === 'launch-app')).toEqual({ tool: 'launch-app', args: { udid: UDID, bundleId: 'dev.e2e.examples.swiftui' } });
  });

  it('boots a named simulator that is shut down', async () => {
    const argent = scripted({ 'boot-device': (args) => ({ udid: args.udid, booted: true }) });
    const client = argent.client();
    await client.devices.boot({ platform: 'ios', device: 'iPhone Air' });
    expect(argent.calls.find((call) => call.tool === 'boot-device')?.args).toEqual({ udid: 'OTHER' });
  });

  it('boots an Android emulator image by name when no running emulator has it', async () => {
    const argent = scripted({
      'list-devices': () => ({ devices: [], avds: [{ name: 'pixel' }] }),
      'boot-device': () => ({ platform: 'android', serial: 'emulator-5556', booted: true }),
    });
    const client = argent.client('android');
    await client.devices.boot({ platform: 'android', device: 'pixel' });
    await client.command.back({});
    expect(argent.calls.at(-1)).toEqual({ tool: 'button', args: { udid: 'emulator-5556', button: 'back' } });
  });

  it('names the devices it knows when the selection matches none', async () => {
    const argent = scripted();
    await expect(argent.client().devices.boot({ platform: 'ios', device: 'iPhone 99' })).rejects.toThrow(/no ios device with name "iPhone 99"; it lists iPhone 17 Pro, iPhone Air/);
  });

  it('lists devices the way the pool reads agent-device inventory', async () => {
    const argent = scripted();
    expect(await argent.client().devices.list({ platform: 'ios' })).toEqual([
      { platform: 'ios', id: UDID, name: 'iPhone 17 Pro', booted: true },
      { platform: 'ios', id: 'OTHER', name: 'iPhone Air', booted: false },
    ]);
  });

  it('gives up on a call argent never answers, naming the tool', async () => {
    const caller = {
      callTool: (_tool: string, _args: unknown, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason))),
    } as unknown as ArgentCaller;
    const realTimeout = AbortSignal.timeout;
    AbortSignal.timeout = () => realTimeout.call(AbortSignal, 5);
    try {
      const client = createArgentDeviceClient('ios', undefined, async () => caller);
      await expect(client.devices.list({})).rejects.toMatchObject({ code: 'ENGINE_FAILURE', message: "argent's list-devices did not answer in 60 s" });
    } finally {
      AbortSignal.timeout = realTimeout;
    }
  });

  it('refuses a provider lease behind an agent-device daemon', () => {
    expect(() => createArgentDeviceClient('ios', { daemon: { baseUrl: 'https://daemon.example' } }, async () => ({}) as ArgentCaller)).toThrow(
      /local simulators and emulators only/,
    );
  });
});

describe('the tree', () => {
  it('flattens ui-tree into agent-device nodes in native units, leaving covered nodes out', async () => {
    const argent = scripted();
    const snapshot = await argent.client().capture.snapshot({});
    const nodes = snapshot.nodes ?? [];
    expect(nodes.map((entry) => entry.label)).toEqual(['with-swiftui', 'Say hello', 'Name', 'GREET']);
    expect(nodes[2]).toMatchObject({
      index: 2,
      parentIndex: 0,
      depth: 1,
      type: 'TextField',
      identifier: 'name',
      editable: true,
      hintShowing: true,
      placeholder: 'Ada Lovelace',
      enabled: true,
      visibleToUser: true,
    });
    expect(nodes[2]?.rect).toEqual({ x: 40.2, y: 437, width: 321.6, height: 43.7 });
    expect(snapshot).toMatchObject({ appBundleId: 'dev.e2e.examples.swiftui', truncated: false, keyboard: { kind: 'absent' } });
  });

  it('reports a toggle button as the switch XCTest calls it, with its state', async () => {
    const tree = formTree();
    const app = tree.roots[0] as UiTreeNode;
    const terms = node({ role: 'AXButton', type: 'Button', label: 'I accept the terms', traits: ['button', 'toggleButton'], checked: false });
    const argent = scripted({ 'ui-tree': () => ({ ...tree, roots: [{ ...app, children: [...app.children, terms] }] }) });
    const nodes = (await argent.client().capture.snapshot({})).nodes ?? [];
    expect(nodes.find((entry) => entry.label === 'I accept the terms')).toMatchObject({ type: 'Switch', checked: false });
  });

  it('leaves out a subtree with nothing on screen, and keeps a hidden node over a visible one', async () => {
    const tree = formTree();
    const app = tree.roots[0] as UiTreeNode;
    const keyboard = node({ type: 'Keyboard', hidden: true, children: [node({ type: 'Key', label: 'Q', hidden: true })] });
    const clipped = node({ type: 'Other', label: 'Clip', hidden: true, children: [node({ type: 'Button', label: 'Peeking' })] });
    const argent = scripted({ 'ui-tree': () => ({ ...tree, roots: [{ ...app, children: [...app.children, keyboard, clipped] }] }) });
    const labels = ((await argent.client().capture.snapshot({})).nodes ?? []).map((entry) => [entry.label, entry.visibleToUser]);
    expect(labels).not.toContainEqual(['Q', false]);
    expect(labels).toContainEqual(['Clip', false]);
    expect(labels).toContainEqual(['Peeking', true]);
  });
});

describe('input', () => {
  it('waits for the screen to hold still before a touch, as XCTest does', async () => {
    const argent = scripted();
    await argent.client().interactions.press({ x: 201, y: 437 });
    const touches = argent.calls.filter((call) => call.tool === 'await-screen-idle' || call.tool === 'gesture-tap');
    expect(touches.map((call) => call.tool)).toEqual(['await-screen-idle', 'gesture-tap']);
    expect(touches[0]?.args).toEqual({ udid: UDID, timeoutMs: 1_500, minStableMs: 200, pollIntervalMs: 100 });
  });

  it('waits longer around a touch that may send the keyboard away', async () => {
    let keyboard = true;
    const argent = scripted({ 'ui-tree': () => formTree({ keyboard }) });
    const client = argent.client();
    await client.capture.snapshot({});
    await client.interactions.press({ x: 201, y: 437 });
    keyboard = false;
    await client.capture.snapshot({});
    await client.interactions.press({ x: 201, y: 437 });
    await client.interactions.press({ x: 201, y: 437 });
    const waits = argent.calls.filter((call) => call.tool === 'await-screen-idle').map((call) => call.args.minStableMs);
    expect(waits).toEqual([600, 600, 200]);
  });

  it('taps the centre of a node, as a fraction of the screen', async () => {
    const argent = scripted();
    const client = argent.client();
    const snapshot = await client.capture.snapshot({});
    const greet = snapshot.nodes?.find((entry) => entry.identifier === 'greet');
    await client.interactions.press({ ref: `@${greet?.ref ?? ''}`, count: 2 });
    const tap = argent.calls.at(-1);
    expect(tap?.tool).toBe('gesture-tap');
    expect(tap?.args.x).toBeCloseTo(0.5);
    expect(tap?.args.y).toBeCloseTo(0.625);
    expect(tap?.args.clickCount).toBe(2);
  });

  it('refuses a ref no recent capture minted as stale, so the harness re-observes', async () => {
    const argent = scripted();
    const error = await argent.client().interactions.press({ ref: '@g9e1' }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(EngineError);
    expect((error as EngineError).code).toBe('NODE_STALE');
  });

  it("keeps the engine's refs through the looks a command takes on its own", async () => {
    const argent = scripted();
    const client = argent.client();
    const greet = (await client.capture.snapshot({})).nodes?.find((entry) => entry.identifier === 'greet');
    for (let look = 0; look < 8; look += 1) await client.command.back({});
    await client.interactions.press({ ref: `@${greet?.ref ?? ''}` });
    expect(argent.calls.at(-1)?.tool).toBe('gesture-tap');
  });

  it('waits for the quiet window when the engine asks the action to settle', async () => {
    const argent = scripted();
    await argent.client().interactions.press({ x: 201, y: 437, settle: true, settleQuietMs: 150 });
    expect(argent.calls.at(-1)).toEqual({ tool: 'await-screen-idle', args: { udid: UDID, timeoutMs: 3_000, minStableMs: 150 } });
  });

  it('fills a field: taps its trailing edge, waits for focus, clears what it holds, then types', async () => {
    let focused = false;
    let value: string | undefined = 'Grace';
    const argent = scripted({
      'ui-tree': () => formTree({ ...(value === undefined ? {} : { value }), focused, keyboard: focused }),
      'gesture-tap': () => {
        focused = true;
        return { tapped: true };
      },
      'run-sequence': () => {
        value = undefined;
        return {};
      },
    });
    const client = argent.client();
    const snapshot = await client.capture.snapshot({});
    const field = snapshot.nodes?.find((entry) => entry.identifier === 'name');
    // oxlint-disable-next-line unicorn/no-array-fill-with-reference-type -- the device fill, not Array#fill
    await client.interactions.fill({ ref: `@${field?.ref ?? ''}`, text: 'Ada' });
    expect(argent.tools()).toEqual(['list-devices', 'ui-tree', 'await-screen-idle', 'gesture-tap', 'ui-tree', 'run-sequence', 'ui-tree', 'keyboard']);
    const tap = argent.calls.find((call) => call.tool === 'gesture-tap');
    expect(tap?.args.x).toBeGreaterThan(0.85);
    const sequence = argent.calls.find((call) => call.tool === 'run-sequence')?.args.steps as { args: { key: string } }[];
    expect(sequence.map((step) => step.args.key)).toEqual(['arrow-down', 'backspace', 'backspace', 'backspace', 'backspace', 'backspace']);
    expect(argent.calls.at(-1)).toEqual({ tool: 'keyboard', args: { udid: UDID, text: 'Ada' } });
  });

  it("refuses text holding argent's secret placeholder before argent can resolve it from the host", async () => {
    const argent = scripted();
    const client = argent.client();
    await expect(client.interactions.type({ text: 'hi {{secret:GITHUB_TOKEN}}' })).rejects.toMatchObject({ code: 'POLICY_DENIED' });
    const snapshot = await client.capture.snapshot({});
    const field = snapshot.nodes?.find((entry) => entry.identifier === 'name');
    // oxlint-disable-next-line unicorn/no-array-fill-with-reference-type -- the device fill, not Array#fill
    await expect(client.interactions.fill({ ref: `@${field?.ref ?? ''}`, text: '{{ secret:X}}' })).rejects.toMatchObject({ code: 'POLICY_DENIED' });
    expect(argent.tools()).not.toContain('keyboard');
    expect(argent.tools()).not.toContain('paste');
  });

  it('never routes a secret through the clipboard', async () => {
    const argent = scripted();
    const client = argent.client();
    const snapshot = await client.capture.snapshot({});
    const field = snapshot.nodes?.find((entry) => entry.identifier === 'name');
    // oxlint-disable-next-line unicorn/no-array-fill-with-reference-type -- the device fill, not Array#fill
    await expect(client.interactions.fill({ ref: `@${field?.ref ?? ''}`, text: 'pässword' }, { sensitive: true })).rejects.toMatchObject({ code: 'UNSUPPORTED_CAPABILITY' });
    expect(argent.tools()).not.toContain('paste');
  });

  it('gives a typing call time for every key it sends', async () => {
    const budgets: number[] = [];
    const realTimeout = AbortSignal.timeout;
    AbortSignal.timeout = (ms: number) => {
      budgets.push(ms);
      return realTimeout.call(AbortSignal, ms);
    };
    try {
      const argent = scripted();
      await argent.client().interactions.type({ text: 'x'.repeat(1_000) });
    } finally {
      AbortSignal.timeout = realTimeout;
    }
    expect(budgets.at(-1)).toBe(60_000 + 1_000 * 100);
  });

  it('pastes text the keyboard cannot type key by key', async () => {
    const argent = scripted();
    await argent.client().interactions.type({ text: 'Zoë' });
    expect(argent.calls.at(-1)).toEqual({ tool: 'paste', args: { udid: UDID, text: 'Zoë' } });
  });

  it('scrolls the screen with a drag that does not fling', async () => {
    const argent = scripted();
    await argent.client().interactions.scroll({ direction: 'down' });
    expect(argent.calls.at(-1)).toMatchObject({ tool: 'gesture-swipe', args: { fromX: 0.5, fromY: 0.7, toX: 0.5, momentum: false } });
  });

  it('presses back with the button on Android and an edge swipe on iOS', async () => {
    const android = scripted({ 'ui-tree': () => ({ ...formTree(), screen: { width: 1080, height: 2400 } }) });
    await android.client('android').command.back({});
    expect(android.calls.at(-1)).toEqual({ tool: 'button', args: { udid: 'emulator-5554', button: 'back' } });
    const ios = scripted();
    await ios.client().command.back({});
    expect(ios.calls.at(-1)).toMatchObject({ tool: 'gesture-swipe', args: { fromX: 0, toX: 0.8 } });
  });

  it("taps the navigation bar's back button on iOS when the screen shows one", async () => {
    const tree = formTree();
    const app = tree.roots[0] as UiTreeNode;
    const back = node({ type: 'Button', label: 'Home', identifier: 'BackButton', frame: { x: 0, y: 0.06, width: 0.2, height: 0.05 } });
    const argent = scripted({ 'ui-tree': () => ({ ...tree, roots: [{ ...app, children: [back, ...app.children] }] }) });
    await argent.client().command.back({});
    const tap = argent.calls.at(-1);
    expect(tap?.tool).toBe('gesture-tap');
    expect(tap?.args.x).toBeCloseTo(0.1);
    expect(tap?.args.y).toBeCloseTo(0.085);
  });

  it('answers home once the app has left the front, so a launch after it sticks', async () => {
    let pressed = false;
    let reads = 0;
    const argent = scripted({
      button: () => {
        pressed = true;
        return {};
      },
      'ui-tree': () => {
        if (pressed) reads += 1;
        return { ...formTree(), foregroundApp: pressed && reads > 2 ? 'com.apple.springboard' : 'dev.e2e.examples.swiftui' };
      },
    });
    await argent.client().command.home();
    expect(reads).toBe(3);
  });

  it('dismisses an Android keyboard with back only while it shows', async () => {
    const argent = scripted({ 'ui-tree': () => formTree({ keyboard: false }) });
    await argent.client('android').command.keyboard({ action: 'dismiss' });
    expect(argent.tools()).not.toContain('button');
  });

  it('drags an iOS keyboard away from a spot above it with no control under it', async () => {
    let keyboard = true;
    const argent = scripted({
      'ui-tree': () => formTree({ keyboard }),
      'gesture-swipe': () => {
        keyboard = false;
        return {};
      },
    });
    await argent.client().command.keyboard({ action: 'dismiss' });
    const drags = argent.calls.filter((call) => call.tool === 'gesture-swipe');
    expect(drags).toHaveLength(1);
    const from = { x: drags[0]?.args.fromX as number, y: drags[0]?.args.fromY as number };
    // The form's field spans 0.5-0.55 and its button 0.6-0.65 of the height, the full middle width: the drag starts on neither.
    expect(from.y < 0.45 || from.y > 0.7).toBe(true);
    expect(drags[0]?.args.toY).toBe(from.y);
  });

  it('leaves the iOS keyboard to the surface when every spot above it is a control', async () => {
    const tree = formTree({ keyboard: true });
    const app = tree.roots[0] as UiTreeNode;
    const wall = node({ type: 'Button', label: 'Wall', frame: { x: 0, y: 0, width: 1, height: 1 } });
    const argent = scripted({ 'ui-tree': () => ({ ...tree, roots: [{ ...app, children: [...app.children, wall] }] }) });
    await expect(argent.client().command.keyboard({ action: 'dismiss' })).rejects.toMatchObject({ code: 'UNSUPPORTED_CAPABILITY' });
    expect(argent.tools()).not.toContain('gesture-swipe');
  });
});

describe('apps and device state', () => {
  it('relaunches with restart-app and the launch arguments', async () => {
    const argent = scripted();
    const result = await argent.client().apps.open({ app: 'dev.e2e.examples.swiftui', relaunch: true, launchArgs: ['-flag'] });
    expect(argent.calls.find((call) => call.tool === 'restart-app')).toEqual({
      tool: 'restart-app',
      args: { udid: UDID, bundleId: 'dev.e2e.examples.swiftui', launchArgs: ['-flag'] },
    });
    expect(result).toEqual({ appBundleId: 'dev.e2e.examples.swiftui' });
  });

  it('waits for the launched app to show its screen and hold it still before answering', async () => {
    let reads = 0;
    const argent = scripted({
      'ui-tree': () => {
        reads += 1;
        // The first reads see the launch screen of the app before: nothing of its own yet.
        return reads < 3 ? { ...formTree(), roots: [node({ type: 'Application' })], foregroundApp: 'com.apple.springboard' } : formTree();
      },
    });
    await argent.client().apps.open({ app: 'dev.e2e.examples.swiftui', relaunch: true });
    expect(argent.tools().slice(-4)).toEqual(['ui-tree', 'ui-tree', 'ui-tree', 'await-screen-idle']);
    expect(argent.calls.at(-1)?.args).toMatchObject({ minStableMs: 500 });
  });

  it('opens a link into an app by launching the app first', async () => {
    const argent = scripted();
    await argent.client().apps.open({ app: 'dev.e2e.examples.swiftui', url: 'hello://greet' });
    expect(argent.tools().filter((tool) => tool === 'launch-app' || tool === 'open-url')).toEqual(['launch-app', 'open-url']);
  });

  it('installs a build by reinstalling it under its bundle id', async () => {
    const argent = scripted();
    expect(await argent.client().apps.install({ app: 'dev.e2e.examples.swiftui', appPath: '/build/Hello.app' })).toEqual({ bundleId: 'dev.e2e.examples.swiftui' });
    expect(argent.calls.at(-1)).toEqual({ tool: 'reinstall-app', args: { udid: UDID, bundleId: 'dev.e2e.examples.swiftui', appPath: '/build/Hello.app' } });
    await expect(argent.client().apps.install({ appPath: '/build/Hello.app' })).rejects.toMatchObject({ code: 'UNSUPPORTED_CAPABILITY' });
  });

  it('sets a permission on the app last opened', async () => {
    const argent = scripted();
    const client = argent.client();
    await expect(client.settings.update({ setting: 'permission', permission: 'camera', state: 'grant' })).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await client.apps.open({ app: 'dev.e2e.examples.swiftui' });
    await client.settings.update({ setting: 'permission', permission: 'camera', state: 'grant' });
    expect(argent.calls.at(-1)).toEqual({
      tool: 'settings-permissions',
      args: { udid: UDID, action: 'grant', permission: 'camera', bundleId: 'dev.e2e.examples.swiftui' },
    });
  });

  it('refuses what argent has no tool for, before the device sees it', async () => {
    const argent = scripted();
    const client = argent.client();
    for (const refused of [
      client.apps.close({}),
      client.command.alert({ action: 'accept' }),
      client.command.clipboard({ action: 'read' }),
      client.settings.update({ setting: 'appearance', state: 'dark' }),
      client.interactions.hover({ x: 1, y: 1 }),
      client.capture.screenshot({ normalizeStatusBar: true }),
    ]) {
      await expect(refused).rejects.toMatchObject({ code: 'UNSUPPORTED_CAPABILITY' });
    }
    expect(argent.tools()).not.toContain('gesture-tap');
  });

  it('answers the foreground app from the tree', async () => {
    const argent = scripted();
    expect(await argent.client().command.appState({})).toEqual({ appName: 'dev.e2e.examples.swiftui', appBundleId: 'dev.e2e.examples.swiftui' });
    expect(await argent.client('android').command.appState({})).toEqual({ package: 'dev.e2e.examples.swiftui' });
  });

  it('copies the screenshot where the engine asked and removes argent\'s file', async () => {
    const shot = path.join(scratch, 'argent.png');
    writeFileSync(shot, 'png');
    const argent = scripted({ screenshot: () => ({ image: shot }) });
    const target = path.join(scratch, 'screenshot.png');
    expect(await argent.client().capture.screenshot({ path: target })).toEqual({ path: target, logicalWidth: 402, logicalHeight: 874 });
    expect(readFileSync(target, 'utf8')).toBe('png');
    expect(existsSync(shot)).toBe(false);
  });

  it('moves the recording into the attempt and removes the folders argent made for it', async () => {
    const recordings = path.join(scratch, 'project', '.argent', 'recordings');
    const video = path.join(recordings, 'screen.mp4');
    const argent = scripted({
      'screen-recording-start': () => ({ status: 'recording' }),
      'screen-recording-stop': () => {
        writeFileSync(video, 'mp4');
        return { video };
      },
    });
    const { mkdirSync } = await import('node:fs');
    mkdirSync(recordings, { recursive: true });
    const client = argent.client();
    const target = path.join(scratch, 'attempt', 'video', 'video.mp4');
    await client.recording.record({ action: 'start', path: target, hideTouches: true });
    expect(argent.calls.at(-1)?.args).toMatchObject({ showTouches: false, trimStatic: false });
    expect(await client.recording.record({ action: 'stop' })).toEqual({ outPath: target });
    expect(readFileSync(target, 'utf8')).toBe('mp4');
    expect(existsSync(path.join(scratch, 'project', '.argent'))).toBe(false);
  });
});

describe('the engine on argent', () => {
  function operation(): OperationContext {
    return { signal: new AbortController().signal, timeoutMs: 30_000, runId: 'run-1', attemptId: 'a1', origin: 'test' };
  }

  it('observes the screen and taps a located node through argent', async () => {
    const argent = scripted();
    const engine = buildEngine(new AgentDeviceSurface({ platform: 'ios', driver: 'argent' }, () => argent.client()));
    await engine.init!({
      runId: 'run-1',
      targetName: 'ios',
      projectRoot: PROJECT_ROOT,
      app: { bundleId: 'dev.e2e.examples.swiftui' },
      env: {},
      headed: false,
      workerSlot: 0,
      log: () => undefined,
      signal: new AbortController().signal,
    });
    await engine.startAttempt!({ attemptId: 'a1', artifactsDir: scratch, signal: new AbortController().signal, resolveSecret: noSecrets, ...ignoreTrace });
    await engine.session!.restart!(operation());
    const snapshot = await engine.observe!(operation());
    expect(snapshot.location).toBe('dev.e2e.examples.swiftui');
    expect(snapshot.viewport).toEqual({ width: 402, height: 874 });
    const [greet] = await engine.locate!({ kind: 'selector', selector: 'id=greet' }, operation());
    expect(greet?.role).toBe('button');
    await engine.perform!(greet!.ref, { kind: 'tap' }, operation());
    expect(argent.tools()).toContain('restart-app');
    expect(argent.calls.at(-1)?.tool).toBe('gesture-tap');
  });

  it("drives the device through argent's client when mobile() names the driver", async () => {
    const engine = mobile({ platform: 'ios', driver: 'argent' });
    await engine.init!({
      runId: 'run-1',
      targetName: 'ios',
      projectRoot: PROJECT_ROOT,
      app: { bundleId: 'dev.e2e.examples.swiftui' },
      env: {},
      headed: false,
      workerSlot: 0,
      log: () => undefined,
      signal: new AbortController().signal,
    });
    expect(moduleCalls).toContain('list-devices');
  });

  it('refuses a device provider with the argent driver before anything is leased', () => {
    let leased = false;
    const provider = {
      name: 'hosted',
      acquire: async () => {
        leased = true;
        return { id: 'lease' };
      },
      release: async () => undefined,
    };
    expect(() => mobile({ platform: 'ios', driver: 'argent', device: provider as never })).toThrow(/device provider leases devices behind agent-device/);
    expect(leased).toBe(false);
  });

  it('rejects an unknown driver at config load', () => {
    expect(() => mobile({ platform: 'ios', driver: 'appium' as never })).toThrow(/`driver` must be "agent-device" or "argent"/);
  });
});
