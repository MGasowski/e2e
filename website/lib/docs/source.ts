import { readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * The docs pages live in the repo's `docs/` folder as MDX, with the navigation,
 * redirects, and site settings in `docs/docs.json`. The site reads both at
 * build time, so editing a page or the navigation needs no change here.
 */
// Not traced by the bundler: the pages are read at build time, and `outputFileTracingIncludes` ships them.
export const DOCS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "..", "docs");

/** The docs base path; pages, assets, markdown twins, and `llms.txt` sit under it. */
export const DOCS_BASE = "/docs";

export const SITE_NAME = "e2e";
export const SITE_DESCRIPTION = "An open framework for agentic end-to-end testing.";
export const PRODUCTION_ORIGIN = "https://e2e.tester.army";

export interface DocsFrontmatter {
  title: string;
  description: string;
  sidebarTitle?: string;
  icon?: string;
  ogImage?: string;
}

export interface DocsPageMeta extends DocsFrontmatter {
  /** The URL path below `/docs`; `''` is the home page. */
  slug: string;
  /** The file below `docs/`, without `.mdx`. */
  source: string;
  tab: string;
  group: string;
}

interface DocsTab {
  name: string;
  icon: string;
  href: string;
  groups: { name: string; pages: DocsPageMeta[] }[];
}

interface DocsJson {
  navigation: {
    global?: { anchors?: { anchor: string; href: string }[] };
    tabs: {
      tab: string;
      icon: string;
      groups?: { group: string; pages: string[] }[];
      pages?: string[];
    }[];
  };
  footer?: { socials?: Record<string, string> };
  redirects: { source: string; destination: string }[];
}

const readJson = (): DocsJson => JSON.parse(readFileSync(path.join(DOCS_DIR, "docs.json"), "utf8"));

export const slugOf = (source: string) => (source === "index" ? "" : source.replace(/\/index$/, ""));

export const docsPath = (slug: string) => (slug ? `${DOCS_BASE}/${slug}` : DOCS_BASE);

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function splitFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const match = FRONTMATTER.exec(text);
  if (!match) return { data: {}, body: text };
  return { data: (parseYaml(match[1]) ?? {}) as Record<string, unknown>, body: text.slice(match[0].length) };
}

const optional = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);

export function readPageSource(source: string) {
  const text = readFileSync(path.join(DOCS_DIR, `${source}.mdx`), "utf8");
  const { data, body } = splitFrontmatter(text);
  const title = optional(data.title);
  if (!title) throw new Error(`docs/${source}.mdx has no title`);
  const frontmatter: DocsFrontmatter = {
    title,
    description: optional(data.description) ?? "",
    sidebarTitle: optional(data.sidebarTitle),
    icon: optional(data.icon),
    ogImage: optional(data["og:image"]),
  };
  return { frontmatter, body };
}

let cached: { tabs: DocsTab[]; pages: DocsPageMeta[]; json: DocsJson } | undefined;

/** Reads the navigation once per process in production; every call re-reads it in development. */
function load() {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const json = readJson();
  const pages: DocsPageMeta[] = [];
  const tabs = json.navigation.tabs.map((tab): DocsTab => {
    // A tab lists groups, or its pages directly (Examples), which then form one group named after the tab.
    const groups = (tab.groups ?? [{ group: tab.tab, pages: tab.pages ?? [] }]).map((group) => ({
      name: group.group,
      pages: group.pages.map((source) => {
        const page: DocsPageMeta = {
          ...readPageSource(source).frontmatter,
          slug: slugOf(source),
          source,
          tab: tab.tab,
          group: group.group,
        };
        pages.push(page);
        return page;
      }),
    }));
    const first = groups[0]?.pages[0];
    return { name: tab.tab, icon: tab.icon, href: docsPath(first?.slug ?? ""), groups };
  });
  cached = { tabs, pages, json };
  return cached;
}

export const getTabs = () => load().tabs;
export const getPages = () => load().pages;
export const getPage = (slug: string) => load().pages.find((page) => page.slug === slug);

/** The pages before and after one, within its tab. */
export function getNeighbors(page: DocsPageMeta) {
  const inTab = load().pages.filter((candidate) => candidate.tab === page.tab);
  const index = inTab.findIndex((candidate) => candidate.slug === page.slug);
  return { previous: inTab[index - 1], next: inTab[index + 1] };
}

export const navLabel = (page: Pick<DocsPageMeta, "title" | "sidebarTitle">) => page.sidebarTitle ?? page.title;


/** The promo link docs.json pins under the navigation (`navigation.global.anchors`). */
export const getPromo = () => load().json.navigation.global?.anchors?.[0];

export const getSocials = () => load().json.footer?.socials ?? {};
