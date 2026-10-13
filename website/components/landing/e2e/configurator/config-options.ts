import {
  AppWindowMac,
  Box,
  CircleUserRound,
  KeyRound,
  Route,
  Settings2,
  Smartphone,
} from "lucide-react";
import type { ComponentType } from "react";
import { SiOpenai, SiVercel } from "react-icons/si";
import {
  type ConnectionChoice,
  type EngineChoice,
  hasSubscription,
  type ModelChoice,
} from "./config-code";
import {
  ClaudeMark,
  DeepSeekMark,
  GeminiMark,
  LlamaMark,
  MistralMark,
  SpaceXaiMark,
} from "./model-marks";

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const CONNECTION_OPTIONS: ChipOption<ConnectionChoice>[] = [
  { value: "gateway", label: "Vercel AI Gateway", icon: SiVercel },
  { value: "openrouter", label: "OpenRouter", icon: Route },
  { value: "apikey", label: "Direct API key", icon: KeyRound },
  { value: "subscription", label: "Subscription", icon: CircleUserRound },
];

const MODEL_OPTIONS: ChipOption<ModelChoice>[] = [
  { value: "openai", label: "OpenAI", icon: SiOpenai },
  { value: "claude", label: "Claude", icon: ClaudeMark },
  { value: "gemini", label: "Gemini", icon: GeminiMark },
  { value: "grok", label: "SpaceXAI", icon: SpaceXaiMark },
  { value: "llama", label: "Llama", icon: LlamaMark },
  { value: "mistral", label: "Mistral", icon: MistralMark },
  { value: "deepseek", label: "DeepSeek", icon: DeepSeekMark },
  { value: "custom", label: "Custom", icon: Settings2 },
];

/** The model chips a connection can provide: subscriptions only list models with a sign-in. */
export function modelOptions(connection: ConnectionChoice): ChipOption<ModelChoice>[] {
  return connection === "subscription"
    ? MODEL_OPTIONS.filter((option) => hasSubscription(option.value))
    : MODEL_OPTIONS;
}

export const ENGINE_OPTIONS: ChipOption<EngineChoice>[] = [
  { value: "web", label: "Web", icon: AppWindowMac },
  { value: "mobile", label: "Mobile", icon: Smartphone },
  { value: "custom", label: "Custom engine", icon: Box },
];

/**
 * Copy for the five configurator steps, in scroll order, and the config lines
 * each step owns: the terminal highlights them while the step is active.
 * Below lg each step renders its own snippet instead: `snippetKeys` picks its
 * lines (missing ones are skipped) and must include every `lineKeys` entry,
 * `null` shows the whole file.
 */
export const CONFIG_STEPS = [
  {
    headline: "Connect on your terms.",
    description: "Use your preferred gateway and keep control\nof how your AI connects.",
    lineKeys: ["import-connection"],
    snippetKeys: ["import-connection", "gap-imports", "model"],
  },
  {
    headline: "Your favorite AI? Bring it along.",
    description:
      "Choose the model that works for you.\nYour testing framework shouldn't decide for you.",
    lineKeys: ["model"],
    snippetKeys: [
      "import-connection",
      "gap-imports",
      "agents-open",
      "agent-open",
      "model",
      "agent-close",
      "agents-close",
    ],
  },
  {
    headline: "Your agent. Your rules.",
    description:
      "Give your agent a purpose. Define how it should approach\ntesting, what to look for, and what matters to you.",
    lineKeys: ["system"],
    snippetKeys: ["agents-open", "agent-open", "system", "agent-close", "agents-close"],
  },
  {
    headline: "Your app. Your environment.",
    description:
      "Test on the web, go mobile, or bring your own engine.\nOne framework, built to adapt.",
    lineKeys: [
      "import-engine",
      "import-engine-tools",
      "device",
      "targets",
      "workers",
      "agent-tools",
    ],
    snippetKeys: [
      "import-engine",
      "import-engine-tools",
      "gap-imports",
      "device",
      "gap-device",
      "export",
      "targets",
      "workers",
      "agents-open",
      "agent-open",
      "model",
      "agent-tools",
      "agent-close",
      "agents-close",
      "config-close",
    ],
  },
  {
    headline: "Your stack. Ready to test.",
    description:
      "Your model, your agent, your engine.\nAll connected through one testing framework.",
    lineKeys: [],
    snippetKeys: null,
  },
] as const satisfies {
  headline: string;
  description: string;
  lineKeys: readonly string[];
  snippetKeys: readonly string[] | null;
}[];

/** Config line keys owned by the step at `index`; none before the first step. */
export function stepLineKeys(index: number): readonly string[] {
  return CONFIG_STEPS[index]?.lineKeys ?? [];
}
