import { type BundledLanguage, createHighlighter, type Highlighter } from "shiki";

/** The fence languages the docs use, plus their aliases; anything else renders as plain text. */
const LANGUAGES = ["typescript", "tsx", "javascript", "bash", "shellsession", "yaml", "json", "markdown", "java"] as const;

const ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "shellsession",
  md: "markdown",
  yml: "yaml",
};

let highlighter: Promise<Highlighter> | undefined;

const getHighlighter = () =>
  (highlighter ??= createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: [...LANGUAGES],
  }));

function languageOf(lang: string | null | undefined) {
  const name = lang?.toLowerCase() ?? "";
  const resolved = ALIASES[name] ?? name;
  return (LANGUAGES as readonly string[]).includes(resolved) ? resolved : "text";
}

/**
 * Highlights code in both themes at once: each token carries `--shiki-light`
 * and `--shiki-dark`, and CSS picks one by the page's theme.
 */
export async function highlight(code: string, lang: string | null | undefined) {
  const shiki = await getHighlighter();
  return shiki.codeToHtml(code, {
    lang: languageOf(lang) as BundledLanguage | "text",
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}
