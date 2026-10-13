import type { CodeTokenColor } from "../code-colors";

export type ModelChoice =
  | "openai"
  | "claude"
  | "grok"
  | "gemini"
  | "llama"
  | "mistral"
  | "deepseek"
  | "custom";
export type ConnectionChoice = "gateway" | "openrouter" | "apikey" | "subscription";
export type EngineChoice = "web" | "mobile" | "custom";

export type ConfiguratorState = {
  model: ModelChoice;
  connection: ConnectionChoice;
  instructions: string;
  engine: EngineChoice;
  customModel: string;
  customEngine: string;
  url: string;
};

export const DEFAULT_STATE: ConfiguratorState = {
  model: "openai",
  connection: "gateway",
  instructions: "You are a QA testing agent.",
  engine: "web",
  customModel: "",
  customEngine: "",
  url: "http://localhost:3000",
};

/** Values the visitor can edit inline in the terminal. */
export type EditableField = "url" | "model" | "instructions";
export type CodeToken = { text: string; color?: CodeTokenColor; editable?: EditableField };
export type CodeLine = { key: string; tokens: CodeToken[] };

const t = (text: string, color?: CodeTokenColor): CodeToken => ({ text, color });
const edit = (text: string, field: EditableField): CodeToken => ({
  text,
  color: "str",
  editable: field,
});
const kw = (text: string) => t(text, "kw");
const str = (text: string) => t(text, "str");
const fn = (text: string) => t(text, "fn");
const cmt = (text: string) => t(text, "cmt");
const line = (key: string, ...tokens: CodeToken[]): CodeLine => ({ key, tokens });
const blank = (key: string): CodeLine => ({ key, tokens: [] });

/**
 * Model ids per provider: OpenAI and Claude ids follow the e2e docs
 * (docs/models.mdx in tester-army/e2e), the rest use the Vercel AI Gateway
 * catalog ids. Gateway and OpenRouter share the provider/model id format.
 */
const ROUTED_MODEL_IDS: Record<Exclude<ModelChoice, "custom">, string> = {
  openai: "openai/gpt-6-luna-fast",
  claude: "anthropic/claude-sonnet-5",
  grok: "xai/grok-4",
  gemini: "google/gemini-3-pro",
  llama: "meta/llama-4-maverick",
  mistral: "mistral/mistral-large-3",
  deepseek: "deepseek/deepseek-v3.2",
};

const DIRECT_PROVIDERS: Record<
  Exclude<ModelChoice, "custom">,
  { pkg: string; importName: string; modelId: string }
> = {
  openai: { pkg: "@ai-sdk/openai", importName: "openai", modelId: "gpt-6-luna-fast" },
  claude: { pkg: "@ai-sdk/anthropic", importName: "anthropic", modelId: "claude-sonnet-5" },
  grok: { pkg: "@ai-sdk/xai", importName: "xai", modelId: "grok-4" },
  gemini: { pkg: "@ai-sdk/google", importName: "google", modelId: "gemini-3-pro" },
  llama: { pkg: "@ai-sdk/groq", importName: "groq", modelId: "meta-llama/llama-4-maverick" },
  mistral: { pkg: "@ai-sdk/mistral", importName: "mistral", modelId: "mistral-large-3" },
  deepseek: { pkg: "@ai-sdk/deepseek", importName: "deepseek", modelId: "deepseek-chat" },
};

type Subscription = { pkg: string; importName: string; modelId: string; login: string };

const COPILOT: Subscription = {
  pkg: "e2e/oauth/copilot",
  importName: "copilot",
  modelId: "claude-sonnet-5",
  login: "github-copilot",
};

/**
 * Subscription sign-ins per docs/subscriptions.mdx in tester-army/e2e: ChatGPT,
 * GitHub Copilot (which also serves Claude, whose own plans are unsupported,
 * and any custom vendor id), and SuperGrok. Other models have no subscription path.
 */
const SUBSCRIPTIONS = {
  openai: {
    pkg: "e2e/oauth/chatgpt",
    importName: "chatgpt",
    modelId: "gpt-6-luna",
    login: "openai",
  },
  claude: COPILOT,
  grok: { pkg: "e2e/oauth/grok", importName: "grok", modelId: "grok-4", login: "spacexai" },
  custom: COPILOT,
} satisfies Partial<Record<ModelChoice, Subscription>>;

type SubscriptionModel = keyof typeof SUBSCRIPTIONS;
const SUBSCRIPTION_FALLBACK: SubscriptionModel = "openai";

export function hasSubscription(model: ModelChoice): model is SubscriptionModel {
  return model in SUBSCRIPTIONS;
}

/** Keeps `model` one the connection can provide; see docs/decisions.md, "/e2e configurator: subscriptions narrow the model step". */
export function withSupportedModel(state: ConfiguratorState): ConfiguratorState {
  if (state.connection !== "subscription" || hasSubscription(state.model)) return state;
  return { ...state, model: SUBSCRIPTION_FALLBACK };
}

/** The id shown for a custom model before one is typed, in the format the connection expects. */
export function customModelPlaceholder(connection: ConnectionChoice) {
  return connection === "subscription" ? "your-model-id" : "your-provider/your-model";
}

function escapeSingleQuotes(text: string) {
  return text.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

/** Custom engine names land in identifier position, so anything else is stripped. */
function sanitizeIdentifier(text: string) {
  const cleaned = text.replace(/[^A-Za-z0-9_$]/g, "");
  return /^[A-Za-z_$]/.test(cleaned) ? cleaned : "";
}

const importLine = (key: string, name: string, pkg: string) =>
  line(key, kw("import"), t(` { ${name} } `), kw("from"), t(" "), str(`'${pkg}'`), t(";"));

const CONNECTION_PACKAGES: Record<Exclude<ConnectionChoice, "apikey" | "subscription">, string> = {
  gateway: "ai",
  openrouter: "@openrouter/ai-sdk-provider",
};

type ModelSource = { importLine: CodeLine; model: CodeToken[] };

const IMPORT_KEY = "import-connection";
const call = (factory: string, ...id: CodeToken[]): CodeToken[] => [
  fn(factory),
  t("("),
  ...id,
  t("),"),
];
const quoted = (id: string) => str(`'${id}'`);
const editableId = (id: string): CodeToken[] => [str("'"), edit(id, "model"), str("'")];

/** The connection's import line and the model expression it provides. */
function modelSource(state: ConfiguratorState): ModelSource {
  const customId = state.customModel || customModelPlaceholder(state.connection);
  if (state.connection === "gateway" || state.connection === "openrouter") {
    const id = state.model === "custom" ? customId : ROUTED_MODEL_IDS[state.model];
    return {
      importLine: importLine(IMPORT_KEY, state.connection, CONNECTION_PACKAGES[state.connection]),
      model: call(state.connection, ...editableId(id)),
    };
  }
  if (state.connection === "subscription") {
    const subscription =
      SUBSCRIPTIONS[hasSubscription(state.model) ? state.model : SUBSCRIPTION_FALLBACK];
    const { tokens } = importLine(IMPORT_KEY, subscription.importName, subscription.pkg);
    return {
      importLine: line(
        IMPORT_KEY,
        ...tokens,
        t(" "),
        cmt(`// npx e2e login ${subscription.login}`),
      ),
      model:
        state.model === "custom"
          ? call(subscription.importName, ...editableId(customId))
          : call(subscription.importName, quoted(subscription.modelId)),
    };
  }
  if (state.model === "custom") {
    return {
      importLine: line(IMPORT_KEY, cmt("// import your provider's AI SDK package")),
      model: [t("yourModel"), t(", "), cmt("// any AI SDK model instance")],
    };
  }
  const provider = DIRECT_PROVIDERS[state.model];
  return {
    importLine: importLine(IMPORT_KEY, provider.importName, provider.pkg),
    model: call(provider.importName, quoted(provider.modelId)),
  };
}

function engineImports(state: ConfiguratorState): CodeLine[] {
  if (state.engine === "web") return [importLine("import-engine", "web", "@e2e-dev/web")];
  if (state.engine === "mobile") {
    return [
      importLine("import-engine", "mobile", "@e2e-dev/mobile"),
      importLine("import-engine-tools", "mobileTools", "@e2e-dev/mobile/tools"),
    ];
  }
  return [line("import-engine", cmt("// bring any UI: implement the engine contract"))];
}

function targetLines(state: ConfiguratorState): CodeLine[] {
  if (state.engine === "web") {
    return [
      line(
        "targets",
        t("  targets: [{ engine: "),
        fn("web"),
        t("(), app: { url: "),
        str("'"),
        edit(state.url || "http://localhost:3000", "url"),
        str("'"),
        t(" } }],"),
      ),
    ];
  }
  if (state.engine === "mobile") {
    return [
      line(
        "targets",
        t("  targets: [{ engine: device, app: { bundleId: "),
        str("'com.yourapp.app'"),
        t(" } }],"),
      ),
      line("workers", t("  workers: 1,")),
    ];
  }
  const engineName = sanitizeIdentifier(state.customEngine) || "yourEngine";
  return [
    line("targets", t(`  targets: [{ engine: ${engineName} }], `), cmt("// your Engine contract")),
  ];
}

/** Renders the configurator state as the e2e.config.ts the visitor copies. */
export function buildConfigLines(state: ConfiguratorState): CodeLine[] {
  const mobile = state.engine === "mobile";
  const source = modelSource(state);
  return [
    line(
      "import-e2e",
      kw("import type"),
      t(" { E2EConfig } "),
      kw("from"),
      t(" "),
      str("'e2e'"),
      t(";"),
    ),
    ...engineImports(state),
    source.importLine,
    blank("gap-imports"),
    ...(mobile
      ? [
          line(
            "device",
            kw("const"),
            t(" device = "),
            fn("mobile"),
            t("({ platform: "),
            str("'ios'"),
            t(" });"),
          ),
          blank("gap-device"),
        ]
      : []),
    line("export", kw("export default"), t(" {")),
    ...targetLines(state),
    line("agents-open", t("  agents: {")),
    line("agent-open", t("    default: {")),
    line("model", t("      model: "), ...source.model),
    line(
      "system",
      t("      system: "),
      str("'"),
      edit(state.instructions, "instructions"),
      str("',"),
    ),
    ...(mobile ? [line("agent-tools", t("      tools: "), fn("mobileTools"), t("(device),"))] : []),
    line("agent-close", t("    },")),
    line("agents-close", t("  },")),
    line("config-close", t("} "), kw("satisfies"), t(" E2EConfig;")),
  ];
}

/**
 * The lines named by `keys`, in file order, as a standalone snippet: blank
 * lines are trimmed at the edges and collapsed, and each blank-separated group
 * is dedented to its shallowest line.
 */
export function snippetLines(lines: CodeLine[], keys: readonly string[]): CodeLine[] {
  const wanted = new Set(keys);
  const groups: CodeLine[][] = [[]];
  for (const codeLine of lines) {
    if (!wanted.has(codeLine.key)) continue;
    if (codeLine.tokens.length > 0) groups[groups.length - 1].push(codeLine);
    else if (groups[groups.length - 1].length > 0) groups.push([]);
  }
  return groups
    .filter((group) => group.length > 0)
    .flatMap((group, index) => {
      const dedented = dedent(group);
      return index === 0 ? dedented : [blank(`${group[0].key}-gap`), ...dedented];
    });
}

function dedent(group: CodeLine[]): CodeLine[] {
  const indent = Math.min(...group.map((codeLine) => leadingSpaces(codeLine.tokens[0].text)));
  return group.map(({ key, tokens: [first, ...rest] }) => ({
    key,
    tokens: [{ ...first, text: first.text.slice(indent) }, ...rest],
  }));
}

function leadingSpaces(text: string) {
  return text.length - text.trimStart().length;
}

/** The line with its inline-editable values rendered as plain tokens, escaped as `linesToText` copies them. */
export function readOnlyLine({ key, tokens }: CodeLine): CodeLine {
  return {
    key,
    tokens: tokens.map(({ editable, ...token }) =>
      editable ? { ...token, text: escapeSingleQuotes(token.text) } : token,
    ),
  };
}

/** Serializes config lines to copyable source, escaping edited string values. */
export function linesToText(lines: CodeLine[]): string {
  return lines
    .map((codeLine) =>
      codeLine.tokens
        .map((token) => (token.editable ? escapeSingleQuotes(token.text) : token.text))
        .join(""),
    )
    .join("\n");
}

/** Keys of lines in `next` whose text differs from the same line in `previous`. */
export function changedLineKeys(previous: CodeLine[], next: CodeLine[]): Set<string> {
  const before = new Map(previous.map((codeLine) => [codeLine.key, lineText(codeLine)]));
  return new Set(
    next.filter((codeLine) => before.get(codeLine.key) !== lineText(codeLine)).map((l) => l.key),
  );
}

function lineText(codeLine: CodeLine) {
  return codeLine.tokens.map((token) => token.text).join("");
}
