"use client";

import { useEffect, useState } from "react";
import { CopyCodeButton } from "./mdx/copy-code-button";

type Highlighter = (code: string, lang: string) => string;

let loading: Promise<Highlighter> | undefined;

/** Shiki in the browser, for code the reader changes (the provider picker); loaded on first use. */
function loadHighlighter() {
  loading ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ]);
    const shiki = await createHighlighterCore({
      themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
      langs: [import("shiki/langs/typescript.mjs"), import("shiki/langs/bash.mjs")],
      engine: createJavaScriptRegexEngine(),
    });
    return (code, lang) =>
      shiki.codeToHtml(code, {
        lang: lang === "ts" ? "typescript" : lang,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
      });
  })();
  return loading;
}

/**
 * Mintlify's global `<CodeBlock language>`, which the docs snippets render
 * code with. Plain text first, highlighted once Shiki loads.
 */
export function CodeBlock({ language, children }: { language: string; children: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    loadHighlighter()
      .then((highlight) => current && setHtml(highlight(children, language)))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [children, language]);
  return (
    <div className="code-block not-prose" data-language={language} data-grouped="">
      <CopyCodeButton code={children} className="absolute right-2 top-2 z-10 bg-surface" />
      {html ? (
        <div className="code-body" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="code-body">
          <pre className="shiki">
            <code>{children}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
