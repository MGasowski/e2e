import type { Root, Text } from "mdast";
import type { Parent } from "unist";
import { visit } from "unist-util-visit";

const OPENS_AFTER = /[\s([{\u2014\u2013-]/;

/** The character before `node` in its paragraph, or a space at the start. */
function charBefore(node: Text, parent: Parent | undefined): string {
  if (!parent) return " ";
  const index = parent.children.indexOf(node);
  const previous = index > 0 ? parent.children[index - 1] : undefined;
  if (!previous) return " ";
  if ("value" in previous && typeof previous.value === "string") return previous.value.at(-1) ?? " ";
  // Emphasis, links, and inline code end in a word.
  return "a";
}

/**
 * Curly quotes and apostrophes in the prose, as Mintlify's typographer set
 * them: "add a test" becomes “add a test”, app's becomes app’s. Code, inline
 * code, and JSX attribute values are left alone.
 */
export function remarkSmartQuotes() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, _index, parent) => {
      if (!/['"]/.test(node.value)) return;
      let previous = charBefore(node, parent as Parent | undefined);
      let out = "";
      for (const char of node.value) {
        const opens = OPENS_AFTER.test(previous);
        if (char === '"') out += opens ? "\u201c" : "\u201d";
        else if (char === "'") out += opens ? "\u2018" : "\u2019";
        else out += char;
        previous = char;
      }
      node.value = out;
    });
  };
}
