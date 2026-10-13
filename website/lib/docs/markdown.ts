import GithubSlugger from "github-slugger";
import type { BlockContent, Link, Paragraph, PhrasingContent } from "mdast";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { exportedStrings, isJsx, type JsxElement, type MdxjsEsm, plainText, type Root, type RootContent, stringAttr } from "./mdast";
import { readModelProviders } from "./providers";
import { DOCS_BASE, type DocsPageMeta, getPages, readPageSource, slugOf } from "./source";

type Node = RootContent;

const text = (value: string): PhrasingContent => ({ type: "text", value });
const strong = (...children: PhrasingContent[]): PhrasingContent => ({ type: "strong", children });
const paragraph = (...children: PhrasingContent[]): Paragraph => ({ type: "paragraph", children });
const link = (url: string, ...children: PhrasingContent[]): Link => ({ type: "link", url, children });
const code = (value: string, lang: string): Node => ({ type: "code", lang, value });

/**
 * The markdown URL of a docs path: `/core-concepts#goals` becomes
 * `<origin>/docs/core-concepts.md#goals`. Assets and other sites stay as they are.
 */
function markdownUrl(href: string, origin: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const [pathname, hash] = href.split("#", 2);
  const suffix = hash ? `#${hash}` : "";
  const bare = pathname.startsWith(`${DOCS_BASE}/`) || pathname === DOCS_BASE ? pathname.slice(DOCS_BASE.length) : pathname;
  if (bare.startsWith("/images/")) return `${origin}${DOCS_BASE}${bare}`;
  if (bare === "" || bare === "/") return `${origin}${DOCS_BASE}/index.md${suffix}`;
  return `${origin}${DOCS_BASE}${bare.replace(/\/$/, "")}.md${suffix}`;
}

function expressionAttr(node: JsxElement, name: string) {
  const found = node.attributes.find(
    (attribute): attribute is MdxJsxAttribute => attribute.type === "mdxJsxAttribute" && attribute.name === name,
  );
  return found && typeof found.value === "object" && found.value !== null ? found.value.value.trim() : undefined;
}

function providerPart(show: string | undefined): Node[] {
  const providers = readModelProviders();
  const fallback = providers[0];
  switch (show) {
    case "select":
      return [
        paragraph(text("Supported providers (the default is the first):")),
        {
          type: "list",
          ordered: false,
          spread: false,
          children: providers.map((provider) => ({
            type: "listItem",
            spread: false,
            children: [paragraph(link(provider.docs, text(provider.name)), text(` (${provider.group})`))],
          })),
        },
      ];
    case "install":
      return [code(["npm install -D ai", ...fallback.packages].join(" "), "bash")];
    case "env":
      return fallback.env.length ? [code(fallback.env.map((name) => `export ${name}=...`).join("\n"), "bash")] : [];
    case "config":
      return [
        code(
          `import type { E2EConfig } from 'e2e';\nimport { web } from '@e2e-dev/web';\n${fallback.code}\n\nexport default {\n  targets: [{ engine: web(), app: { url: 'http://localhost:3000' } }],\n  agents: { default: { model: ${fallback.model} } },\n} satisfies E2EConfig;`,
          "ts",
        ),
      ];
    case "model":
      return [code(`${fallback.code}\n\nconst agent = { model: ${fallback.model} };`, "ts")];
    default:
      return [];
  }
}

/** Rewrites a page's MDX tree into plain markdown: components become the markdown they stand for. */
function flatten(nodes: Node[], strings: Map<string, string>, origin: string): Node[] {
  const out: Node[] = [];
  for (const node of nodes) {
    if (node.type === "yaml" || node.type === "mdxjsEsm" || node.type === "mdxFlowExpression") continue;
    if (node.type === "link") {
      node.url = markdownUrl(node.url, origin);
    }
    if (!isJsx(node)) {
      if ("children" in node && Array.isArray(node.children)) {
        (node as { children: Node[] }).children = flatten(node.children as Node[], strings, origin);
      }
      out.push(node);
      continue;
    }
    const children = () => flatten(node.children as Node[], strings, origin);
    const title = stringAttr(node, "title");
    switch (node.name) {
      case "Card": {
        const href = stringAttr(node, "href");
        const label = strong(href ? link(markdownUrl(href, origin), text(title ?? href)) : text(title ?? ""));
        out.push(paragraph(label), ...children());
        break;
      }
      case "Step":
      case "Tab":
      case "Accordion":
        out.push(paragraph(strong(text(title ?? ""))), ...children());
        break;
      case "Note":
      case "Warning":
      case "Tip":
      case "Info": {
        const body = children();
        const first = body[0];
        if (first?.type === "paragraph") first.children.unshift(strong(text(`${node.name}:`)), text(" "));
        else body.unshift(paragraph(strong(text(`${node.name}:`))));
        out.push({ type: "blockquote", children: body as BlockContent[] });
        break;
      }
      case "Prompt": {
        const name = expressionAttr(node, "description");
        const prompt = (name && strings.get(name)) ?? stringAttr(node, "description") ?? "";
        out.push(code(prompt, "text"));
        break;
      }
      case "ModelProvider":
        out.push(...providerPart(stringAttr(node, "show")));
        break;
      case "VideoCard": {
        const id = stringAttr(node, "id");
        const subtitle = stringAttr(node, "subtitle");
        out.push(
          paragraph(link(`https://www.youtube.com/watch?v=${id}`, text(title ?? "Video")), ...(subtitle ? [text(`: ${subtitle}`)] : [])),
        );
        break;
      }
      case "video": {
        const src = stringAttr(node, "src");
        if (src) out.push(paragraph(link(markdownUrl(src, origin), text(`Video: ${stringAttr(node, "aria-label") ?? src}`))));
        break;
      }
      case "span":
      case "br":
        break;
      default:
        // CardGroup, CodeGroup, Steps, Tabs, AccordionGroup, SetupPrompt, Video, ShowMore: their contents are the markdown.
        out.push(...children());
    }
  }
  return out;
}

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkFrontmatter).use(remarkGfm);
const printer = unified()
  .use(remarkStringify, { bullet: "-", fences: true, rule: "-", emphasis: "_" })
  .use(remarkGfm)
  .use(remarkMdx);

/** The page as markdown, the way agents and "Copy page" read it, with links on `origin`. */
export function pageMarkdown(source: string, origin: string) {
  const { frontmatter, body } = readPageSource(source);
  const tree = parser.parse(body) as Root;
  const strings = new Map<string, string>();
  for (const node of tree.children) if (node.type === "mdxjsEsm") exportedStrings(node as MdxjsEsm, strings);
  tree.children = flatten(tree.children, strings, origin);
  const markdown = printer.stringify(tree).trim();
  const lead = frontmatter.description ? `\n\n> ${frontmatter.description}` : "";
  return `# ${frontmatter.title}${lead}\n\n${markdown}\n`;
}

/** Plain-text sections of a page for search: the intro, then one per `##`/`###` heading. */
export function pageSections(source: string) {
  const { body } = readPageSource(source);
  const tree = parser.parse(body) as Root;
  tree.children = flatten(tree.children, new Map(), "");
  const slugger = new GithubSlugger();
  const sections: { heading: string; id: string; text: string }[] = [{ heading: "", id: "", text: "" }];
  for (const node of tree.children) {
    if (node.type === "heading") {
      // Slug every heading, as the page does, so repeated headings get the same numbered ids.
      const heading = plainText(node);
      const id = slugger.slug(heading);
      if (node.depth === 2 || node.depth === 3) sections.push({ heading, id, text: "" });
    } else if (node.type !== "code") {
      const current = sections[sections.length - 1];
      // Table cells and list items run together in `toString`; space them apart.
      const content =
        node.type === "table"
          ? node.children.map((row) => row.children.map((cell) => plainText(cell)).join(" · ")).join(". ")
          : node.type === "list"
            ? node.children.map((item) => plainText(item)).join(" ")
            : plainText(node);
      if (current.text.length < 600) current.text = `${current.text} ${content}`.trim().slice(0, 600);
    }
  }
  return sections;
}

export function markdownSource(slug: string): DocsPageMeta | undefined {
  // `integrations.md` and `integrations/index.md` both name the `integrations/index` page; `index.md` names the home page.
  const wanted = slug === "index" ? "" : slugOf(slug);
  return getPages().find((page) => page.slug === wanted);
}
