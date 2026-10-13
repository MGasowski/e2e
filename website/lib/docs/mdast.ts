import type { Code, Heading, Root, RootContent } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import type { MdxjsEsm } from "mdast-util-mdxjs-esm";
import { toString } from "mdast-util-to-string";
import { DOCS_BASE } from "./source";

export type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;
export type { Code, Heading, MdxjsEsm, Root, RootContent };

export const isJsx = (node: { type: string }): node is JsxElement =>
  node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";

/** A JSX element's string attribute (`title="…"`), or a bare boolean one (`arrow`) as `true`. */
function attr(node: JsxElement, name: string): string | true | undefined {
  const found = node.attributes.find(
    (attribute): attribute is MdxJsxAttribute => attribute.type === "mdxJsxAttribute" && attribute.name === name,
  );
  if (!found) return undefined;
  if (found.value === null || found.value === undefined) return true;
  return typeof found.value === "string" ? found.value : found.value.value;
}

export const stringAttr = (node: JsxElement, name: string) => {
  const value = attr(node, name);
  return typeof value === "string" ? value : undefined;
};

export function setAttr(node: JsxElement, name: string, value: string) {
  const existing = node.attributes.find(
    (attribute): attribute is MdxJsxAttribute => attribute.type === "mdxJsxAttribute" && attribute.name === name,
  );
  if (existing) existing.value = value;
  else node.attributes.push({ type: "mdxJsxAttribute", name, value });
}

/**
 * A page links to another as `/core-concepts#goals` and to assets as
 * `/images/x.svg`, relative to the docs root as Mintlify serves it. The site
 * serves the docs under `/docs`, so root-relative paths gain that prefix.
 */
export function docsHref(href: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href === DOCS_BASE || href.startsWith(`${DOCS_BASE}/`) || href.startsWith(`${DOCS_BASE}#`)) return href;
  if (href === "/") return DOCS_BASE;
  if (href.startsWith("/#")) return `${DOCS_BASE}${href.slice(1)}`;
  return `${DOCS_BASE}${href}`;
}

/** A code fence's info string after the language: `title="x.ts" expandable`, or a bare tab label (`npm`). */
export function parseCodeMeta(meta: string | null | undefined) {
  const result: { title?: string; expandable: boolean } = { expandable: false };
  if (!meta) return result;
  let rest = meta;
  for (const match of meta.matchAll(/(\w+)=("([^"]*)"|'([^']*)'|\{([^}]*)\}|(\S+))/g)) {
    const value = match[3] ?? match[4] ?? match[5] ?? match[6] ?? "";
    if (match[1] === "title") result.title = value;
    rest = rest.replace(match[0], "");
  }
  const words = rest.split(/\s+/).filter(Boolean);
  const flags = new Set(["expandable", "wrap", "lines"]);
  if (words.includes("expandable")) result.expandable = true;
  const bare = words.filter((word) => !flags.has(word)).join(" ");
  if (!result.title && bare) result.title = bare;
  return result;
}

/** `export const name = \`…\`` string constants a page declares for its components. */
export function exportedStrings(node: MdxjsEsm, into: Map<string, string>) {
  const program = node.data?.estree;
  if (!program) return;
  for (const statement of program.body) {
    if (statement.type !== "ExportNamedDeclaration" || statement.declaration?.type !== "VariableDeclaration") continue;
    for (const declaration of statement.declaration.declarations) {
      if (declaration.id.type !== "Identifier" || !declaration.init) continue;
      const init = declaration.init;
      if (init.type === "TemplateLiteral" && init.expressions.length === 0) {
        into.set(declaration.id.name, init.quasis.map((quasi) => quasi.value.cooked ?? "").join(""));
      } else if (init.type === "Literal" && typeof init.value === "string") {
        into.set(declaration.id.name, init.value);
      }
    }
  }
}

export const plainText = (node: Parameters<typeof toString>[0]) => toString(node).replace(/\s+/g, " ").trim();
