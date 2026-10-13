import { compile, run } from "@mdx-js/mdx";
import type { MDXContent } from "mdx/types";
import { cacheLife } from "next/cache";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { remarkDocs, type TocEntry } from "./remark-docs";
import { readPageSource } from "./source";

/**
 * Compiles a page's MDX to JavaScript, highlighting its code on the way.
 * Cached: the result depends on the page file alone, and Shiki reads the
 * clock, which a prerender may not do outside a cache.
 */
async function compilePage(source: string): Promise<{ code: string; toc: TocEntry[] }> {
  "use cache";
  cacheLife("max");
  const { body } = readPageSource(source);
  const file = await compile(
    { value: body, path: `docs/${source}.mdx` },
    { outputFormat: "function-body", remarkPlugins: [remarkGfm, remarkDocs] },
  );
  return { code: String(file), toc: file.data.toc ?? [] };
}

/** A page's content as a component, plus the headings for its table of contents. */
export async function renderPage(source: string): Promise<{ Content: MDXContent; toc: TocEntry[] }> {
  const { code, toc } = await compilePage(source);
  const { default: Content } = await run(code, { ...runtime, baseUrl: import.meta.url });
  return { Content, toc };
}
