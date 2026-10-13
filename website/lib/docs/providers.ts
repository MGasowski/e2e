import { readFileSync } from "node:fs";
import path from "node:path";
import { DOCS_DIR } from "./source";

export interface ModelProviderEntry {
  id: string;
  name: string;
  group: string;
  packages: string[];
  code: string;
  model: string;
  env: string[];
  note?: string;
  docs: string;
  readsAtLoad?: boolean;
}

/**
 * The provider list from `docs/snippets/model-provider.jsx`, for the markdown
 * twins. The snippet is the one source of the list; its array literal is plain
 * data, so it evaluates without the component around it.
 */
export function readModelProviders(): ModelProviderEntry[] {
  const source = readFileSync(path.join(DOCS_DIR, "snippets", "model-provider.jsx"), "utf8");
  const start = source.indexOf("const providers = [");
  const end = source.indexOf("\n  ];", start);
  if (start === -1 || end === -1) throw new Error("docs/snippets/model-provider.jsx no longer declares `const providers = [...]`");
  const literal = source.slice(start + "const providers = ".length, end + "\n  ]".length);
  return new Function(`return ${literal};`)() as ModelProviderEntry[];
}
