import type { CodeTokenColor } from "./code-colors";

export type HeroDoc = { signature: string; description: string };
type TokenSpec = { text: string; color?: CodeTokenColor; doc?: HeroDoc };
/** `key` is the token's character offset within its line, a stable render key. */
export type HeroToken = TokenSpec & { key: string };
export type HeroLine = { key: string; tokens: HeroToken[] };
export type HeroExample = { id: string; label: string; lines: HeroLine[] };

/** Hover documentation sourced from https://e2e.tester.army/docs (reference pages). */
const DOCS = {
  test: {
    signature: "test(title: string, fn: TestFn): TestCase",
    description:
      "Registers one test synchronously during module evaluation. Fixtures such as app, agent, and screen are acquired on first use.",
  },
  expect: {
    signature: "expect(actual: Locator): AsyncExpectation",
    description:
      "Waits for an app condition. Locator assertions retry until they pass or time out; expect(value) checks a value immediately.",
  },
  open: {
    signature: "app.open(path?: string): Promise<void>",
    description:
      "Opens the app: the declared URL, a path relative to it, or any absolute http(s) URL.",
  },
  act: {
    signature: "agent.act(instruction: string, options?: ActOptions): Promise<ActResult>",
    description:
      "Plans and executes one bounded multi-action flow. The agent chooses and performs the actions, then returns when the goal passes or throws when it fails.",
  },
  assert: {
    signature: "agent.assert(assertion: string, options?: AssertOptions): Promise<void>",
    description:
      "Judges a natural-language assertion against one fresh observation of the screen. Throws ASSERTION_FAILED on a false judgment.",
  },
  getByRole: {
    signature: "screen.getByRole(role: Role, options?: RoleOptions): Locator",
    description:
      "Creates a lazy role query, resolved when an action, read, or assertion runs. Prefer role and name first, label second, test ID last.",
  },
  getByTestId: {
    signature: "screen.getByTestId(id: string): Locator",
    description: "Creates a lazy test-id query, for controls the semantic queries cannot name.",
  },
  tap: {
    signature: "locator.tap(options?: TapOptions): Promise<void>",
    description:
      "Taps exactly one matching actionable node. click is an alias, so the same test drives web and mobile.",
  },
  toContainText: {
    signature: "toContainText(expected: TextMatch): Promise<void>",
    description:
      "Waits for contained normalized text, retrying until it passes or the assertion timeout runs out.",
  },
  toHaveCount: {
    signature: "toHaveCount(count: number): Promise<void>",
    description: "Waits for the query to resolve to exactly that many matches.",
  },
  toBeVisible: {
    signature: "toBeVisible(options?: { timeout?: number }): Promise<void>",
    description:
      "Waits for visibility, retrying until it passes or the assertion timeout runs out.",
  },
  setAppearance: {
    signature: "device.setAppearance(mode: 'light' | 'dark'): Promise<void>",
    description:
      "Sets the system appearance. Deterministic device management with no model call; it appears as a device.setAppearance step in the report.",
  },
  setNetwork: {
    signature: "device.setNetwork(state: 'online' | 'offline'): Promise<void>",
    description: "Toggles the device's Wi-Fi. Deterministic device management with no model call.",
  },
  mobilePackage: {
    signature: "import { test } from '@e2e-dev/mobile'",
    description:
      "The mobile engine: iOS simulators and Android emulators. Importing test from @e2e-dev/mobile types the device fixture.",
  },
} satisfies Record<string, HeroDoc>;

const t = (text: string, color?: CodeTokenColor, doc?: HeroDoc): TokenSpec => ({
  text,
  color,
  doc,
});
const kw = (text: string) => t(text, "kw");
const str = (text: string, doc?: HeroDoc) => t(text, "str", doc);
const fn = (text: string, doc?: HeroDoc) => t(text, "fn", doc);
const line = (key: string, ...specs: TokenSpec[]): HeroLine => {
  let offset = 0;
  const tokens = specs.map((spec) => {
    const token = { ...spec, key: String(offset) };
    offset += spec.text.length;
    return token;
  });
  return { key, tokens };
};
const blank = (key: string): HeroLine => ({ key, tokens: [] });

const e2eImport = (key: string) =>
  line(
    key,
    kw("import"),
    t(" { "),
    t("test", undefined, DOCS.test),
    t(", "),
    t("expect", undefined, DOCS.expect),
    t(" } "),
    kw("from"),
    t(" "),
    str("'e2e'"),
    t(";"),
  );

const checkoutExample: HeroExample = {
  id: "checkout",
  label: "checkout.e2e.ts",
  lines: [
    e2eImport("ck-import"),
    blank("ck-gap-1"),
    line(
      "ck-test",
      fn("test", DOCS.test),
      t("("),
      str("'a member upgrades to Pro'"),
      t(", "),
      kw("async"),
      t(" ({ app, agent, screen }) => {"),
    ),
    line(
      "ck-open",
      t("  "),
      kw("await"),
      t(" app."),
      fn("open", DOCS.open),
      t("("),
      str("'/settings/billing'"),
      t(");"),
    ),
    blank("ck-gap-2"),
    line(
      "ck-act",
      t("  "),
      kw("await"),
      t(" agent."),
      fn("act", DOCS.act),
      t("("),
      str("'upgrade the workspace to the Pro plan'"),
      t(");"),
    ),
    line(
      "ck-assert",
      t("  "),
      kw("await"),
      t(" agent."),
      fn("assert", DOCS.assert),
      t("("),
      str("'the invoice preview shows a prorated amount'"),
      t(");"),
    ),
    blank("ck-gap-3"),
    line(
      "ck-expect",
      t("  "),
      kw("await"),
      t(" "),
      fn("expect", DOCS.expect),
      t("(screen."),
      fn("getByRole", DOCS.getByRole),
      t("("),
      str("'status'"),
      t("))."),
      fn("toContainText", DOCS.toContainText),
      t("("),
      str("'Pro'"),
      t(");"),
    ),
    line("ck-close", t("});")),
  ],
};

const todosExample: HeroExample = {
  id: "todos",
  label: "todos.e2e.ts",
  lines: [
    e2eImport("td-import"),
    blank("td-gap-1"),
    line(
      "td-test",
      fn("test", DOCS.test),
      t("("),
      str("'todos round-trip'"),
      t(", "),
      kw("async"),
      t(" ({ app, agent, screen }) => {"),
    ),
    line(
      "td-open",
      t("  "),
      kw("await"),
      t(" app."),
      fn("open", DOCS.open),
      t("("),
      str("'/todos'"),
      t(");"),
    ),
    blank("td-gap-2"),
    line(
      "td-act-1",
      t("  "),
      kw("await"),
      t(" agent."),
      fn("act", DOCS.act),
      t("("),
      str('\'add todos "Buy milk" and "Walk the dog"\''),
      t(");"),
    ),
    line(
      "td-act-2",
      t("  "),
      kw("await"),
      t(" agent."),
      fn("act", DOCS.act),
      t("("),
      str("'complete the first todo'"),
      t(");"),
    ),
    line(
      "td-assert",
      t("  "),
      kw("await"),
      t(" agent."),
      fn("assert", DOCS.assert),
      t("("),
      str("'only one todo remains open'"),
      t(");"),
    ),
    blank("td-gap-3"),
    line(
      "td-tap",
      t("  "),
      kw("await"),
      t(" screen."),
      fn("getByRole", DOCS.getByRole),
      t("("),
      str("'tab'"),
      t(", { name: "),
      str("'Done'"),
      t(" })."),
      fn("tap", DOCS.tap),
      t("();"),
    ),
    line(
      "td-expect",
      t("  "),
      kw("await"),
      t(" "),
      fn("expect", DOCS.expect),
      t("(screen."),
      fn("getByTestId", DOCS.getByTestId),
      t("("),
      str("'todo'"),
      t("))."),
      fn("toHaveCount", DOCS.toHaveCount),
      t("(1);"),
    ),
    line("td-close", t("});")),
  ],
};

const mobileExample: HeroExample = {
  id: "mobile",
  label: "mobile.e2e.ts",
  lines: [
    line(
      "mb-import-1",
      kw("import"),
      t(" { "),
      t("test", undefined, DOCS.test),
      t(" } "),
      kw("from"),
      t(" "),
      str("'@e2e-dev/mobile'", DOCS.mobilePackage),
      t(";"),
    ),
    line(
      "mb-import-2",
      kw("import"),
      t(" { "),
      t("expect", undefined, DOCS.expect),
      t(" } "),
      kw("from"),
      t(" "),
      str("'e2e'"),
      t(";"),
    ),
    blank("mb-gap-1"),
    line(
      "mb-test",
      fn("test", DOCS.test),
      t("("),
      str("'offline in dark mode'"),
      t(", "),
      kw("async"),
      t(" ({ agent, device, screen }) => {"),
    ),
    line(
      "mb-appearance",
      t("  "),
      kw("await"),
      t(" device."),
      fn("setAppearance", DOCS.setAppearance),
      t("("),
      str("'dark'"),
      t(");"),
    ),
    line(
      "mb-network",
      t("  "),
      kw("await"),
      t(" device."),
      fn("setNetwork", DOCS.setNetwork),
      t("("),
      str("'offline'"),
      t(");"),
    ),
    blank("mb-gap-2"),
    line(
      "mb-act",
      t("  "),
      kw("await"),
      t(" agent."),
      fn("act", DOCS.act),
      t("("),
      str("'go to General, then About'"),
      t(");"),
    ),
    blank("mb-gap-3"),
    line(
      "mb-expect",
      t("  "),
      kw("await"),
      t(" "),
      fn("expect", DOCS.expect),
      t("(screen."),
      fn("getByRole", DOCS.getByRole),
      t("("),
      str("'button'"),
      t(", { name: "),
      str("/^iOS Version/"),
      t(" }))"),
    ),
    line("mb-visible", t("    ."), fn("toBeVisible", DOCS.toBeVisible), t("();")),
    line("mb-close", t("});")),
  ],
};

export const HERO_EXAMPLES: HeroExample[] = [checkoutExample, todosExample, mobileExample];
