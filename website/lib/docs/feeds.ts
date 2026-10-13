import { cacheLife } from "next/cache";
import { pageMarkdown, pageSections } from "./markdown";
import { DOCS_BASE, docsPath, getPages, getTabs, SITE_DESCRIPTION, SITE_NAME } from "./source";

/**
 * The origin a request reached the site on, so the links in a feed point back
 * at it. The Host header names it; `request.url` carries the address the
 * server binds to (`0.0.0.0`) behind `next start`.
 */
export function originOf(request: Request) {
  const url = new URL(request.url);
  // `next start` fills `x-forwarded-host` with the bind address, so Host comes first.
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? url.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(/:$/, "");
  return `${protocol.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
}

const markdownPath = (slug: string) => `${DOCS_BASE}/${slug || "index"}.md`;

export async function cachedPageMarkdown(source: string, origin: string) {
  "use cache";
  cacheLife("max");
  return pageMarkdown(source, origin);
}

export async function llmsIndex(origin: string) {
  "use cache";
  cacheLife("max");
  const lines = [`# ${SITE_NAME}`, "", `> ${SITE_DESCRIPTION}`, ""];
  for (const tab of getTabs()) {
    lines.push(`## ${tab.name}`, "");
    for (const group of tab.groups) {
      if (group.name !== tab.name) lines.push(`### ${group.name}`, "");
      for (const page of group.pages) {
        const description = page.description ? `: ${page.description}` : "";
        lines.push(`- [${page.title}](${origin}${markdownPath(page.slug)})${description}`);
      }
      lines.push("");
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

export async function llmsFull(origin: string) {
  "use cache";
  cacheLife("max");
  const pages = getPages().map((page) => `${pageMarkdown(page.source, origin).trim()}\n\nSource: ${origin}${markdownPath(page.slug)}`);
  return `${pages.join("\n\n---\n\n")}\n`;
}

export async function sitemap(origin: string) {
  "use cache";
  cacheLife("max");
  const urls = getPages().map((page) => `  <url>\n    <loc>${origin}${docsPath(page.slug)}</loc>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export interface SearchEntry {
  /** The page path, plus `#id` for a section. */
  href: string;
  title: string;
  /** The page title above a section; empty for a page. */
  page: string;
  /** The tab and group the page sits in. */
  path: string;
  text: string;
}

/** Every page and its `##`/`###` sections, for the search dialog. */
export async function searchIndex(): Promise<SearchEntry[]> {
  "use cache";
  cacheLife("max");
  return getPages().flatMap((page) => {
    const [intro, ...sections] = pageSections(page.source);
    const crumbs = page.group === page.tab ? page.tab : `${page.tab} › ${page.group}`;
    return [
      { href: docsPath(page.slug), title: page.title, page: "", path: crumbs, text: `${page.description} ${intro.text}`.trim() },
      ...sections.map((section) => ({
        href: `${docsPath(page.slug)}#${section.id}`,
        title: section.heading,
        page: page.title,
        path: crumbs,
        text: section.text,
      })),
    ];
  });
}
