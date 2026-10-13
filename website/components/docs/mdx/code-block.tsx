import { CopyCodeButton } from "./copy-code-button";
import { Expandable } from "./expandable";

const LANGUAGE_LABELS: Record<string, string> = {
  ts: "TypeScript",
  typescript: "TypeScript",
  js: "JavaScript",
  bash: "Terminal",
  sh: "Terminal",
  console: "Terminal",
  yaml: "YAML",
  json: "JSON",
  md: "Markdown",
  markdown: "Markdown",
  java: "Java",
  text: "Text",
};

/**
 * A highlighted code fence. `html` is Shiki's output in both themes, made at
 * build time (`lib/docs/remark-docs.ts`); `grouped` blocks sit in a
 * `<CodeGroup>`, whose tabs replace the title bar.
 */
export function CodeBlock({
  language,
  code,
  html,
  title,
  expandable,
  grouped,
}: {
  language: string;
  code: string;
  html: string;
  title?: string;
  expandable?: string;
  grouped?: string;
}) {
  const body = <div className="code-body" dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <div className="code-block not-prose" data-grouped={grouped ? "" : undefined} data-language={language}>
      {grouped ? (
        <CopyCodeButton code={code} className="absolute right-2 top-2 z-10 bg-surface" />
      ) : (
        <div className="code-header">
          <span className="code-title">{title ?? LANGUAGE_LABELS[language] ?? language}</span>
          <CopyCodeButton code={code} />
        </div>
      )}
      {expandable ? <Expandable>{body}</Expandable> : body}
    </div>
  );
}
