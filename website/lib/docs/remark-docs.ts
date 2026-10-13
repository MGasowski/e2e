import GithubSlugger from "github-slugger";
import type { Link } from "mdast";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
import type { Parent } from "unist";
import { SKIP, visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { highlight } from "./highlight";
import {
  type Code,
  docsHref,
  type Heading,
  isJsx,
  type JsxElement,
  type MdxjsEsm,
  parseCodeMeta,
  plainText,
  type Root,
  setAttr,
  stringAttr,
} from "./mdast";

export interface TocEntry {
  depth: 2 | 3;
  text: string;
  id: string;
}

/** Attributes holding a path the docs write relative to their root. */
const PATH_ATTRIBUTES = new Set(["href", "src", "icon", "poster"]);

const textAttribute = (name: string, value: string): MdxJsxAttribute => ({ type: "mdxJsxAttribute", name, value });

/**
 * Turns a Mintlify page into one this site renders:
 * - drops the snippet imports; the site passes those components in itself;
 * - prefixes root-relative links and asset paths with `/docs`;
 * - gives `##` and `###` headings ids and records them for the table of contents;
 * - highlights code fences into `<CodeBlock>` elements, and tells each
 *   `<CodeGroup>` and `<Tabs>` the labels of its children.
 */
export function remarkDocs() {
  return async (tree: Root, file: VFile) => {
    const slugger = new GithubSlugger();
    const toc: TocEntry[] = [];
    const fences: { node: Code; parent: Parent }[] = [];

    visit(tree, (node, index, parent) => {
      if (node.type === "mdxjsEsm" && parent && index !== undefined) {
        const esm = node as MdxjsEsm;
        const program = esm.data?.estree;
        if (program) program.body = program.body.filter((statement) => statement.type !== "ImportDeclaration");
        if (!program || program.body.length === 0) {
          parent.children.splice(index, 1);
          return [SKIP, index];
        }
        return SKIP;
      }
      if (node.type === "link") {
        const link = node as Link;
        link.url = docsHref(link.url);
      }
      if (isJsx(node)) {
        for (const attribute of node.attributes) {
          if (attribute.type === "mdxJsxAttribute" && PATH_ATTRIBUTES.has(attribute.name) && typeof attribute.value === "string") {
            attribute.value = docsHref(attribute.value);
          }
        }
      }
      if (node.type === "heading") {
        const heading = node as Heading;
        const text = plainText(heading);
        const id = slugger.slug(text);
        heading.data = { ...heading.data, hProperties: { ...heading.data?.hProperties, id } };
        if (heading.depth === 2 || heading.depth === 3) toc.push({ depth: heading.depth, text, id });
      }
      if (node.type === "code" && parent && index !== undefined) {
        fences.push({ node: node as Code, parent: parent as Parent });
      }
    });

    await Promise.all(
      fences.map(async ({ node, parent }) => {
        const meta = parseCodeMeta(node.meta);
        const element: JsxElement = {
          type: "mdxJsxFlowElement",
          name: "CodeBlock",
          attributes: [
            textAttribute("language", node.lang ?? "text"),
            textAttribute("code", node.value),
            textAttribute("html", await highlight(node.value, node.lang)),
            ...(meta.title ? [textAttribute("title", meta.title)] : []),
            ...(meta.expandable ? [textAttribute("expandable", "true")] : []),
          ],
          children: [],
        };
        parent.children[parent.children.indexOf(node as unknown as Parent["children"][number])] = element as unknown as Parent["children"][number];
      }),
    );

    visit(tree, (node) => {
      if (!isJsx(node)) return;
      if (node.name === "CodeGroup") {
        const blocks = node.children.filter((child) => isJsx(child) && child.name === "CodeBlock") as JsxElement[];
        const labels = blocks.map((block) => stringAttr(block, "title") ?? stringAttr(block, "language") ?? "Code");
        for (const block of blocks) setAttr(block, "grouped", "true");
        setAttr(node, "labels", JSON.stringify(labels));
      }
      if (node.name === "Tabs") {
        const tabs = node.children.filter((child) => isJsx(child) && child.name === "Tab") as JsxElement[];
        setAttr(node, "titles", JSON.stringify(tabs.map((tab) => stringAttr(tab, "title") ?? "")));
      }
    });

    file.data.toc = toc;
  };
}

declare module "vfile" {
  interface DataMap {
    toc: TocEntry[];
  }
}
