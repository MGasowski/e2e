import { CopyCodeButton } from "./copy-code-button";
import { Expandable } from "./expandable";

/**
 * A highlighted code fence. `html` is Shiki's output in both themes, made at
 * build time (`lib/docs/remark-docs.ts`). A titled block has a title bar
 * with the copy button, as on Mintlify; an untitled one, or a `grouped` one
 * in a `<CodeGroup>` (whose tabs are its title bar), floats the button.
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
    <div
      className="code-block not-prose"
      data-grouped={grouped ? "" : undefined}
      data-titled={title && !grouped ? "" : undefined}
      data-language={language}
    >
      {title && !grouped ? (
        <div className="code-header">
          <span className="code-title">{title}</span>
          <CopyCodeButton code={code} />
        </div>
      ) : (
        <CopyCodeButton code={code} className="code-copy absolute right-2 top-2 z-10" />
      )}
      {expandable ? <Expandable>{body}</Expandable> : body}
    </div>
  );
}
