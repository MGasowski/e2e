import { ArrowUpRight, ChevronRight, CircleAlert, Info, Lightbulb, Link2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DocsIcon } from "../icon";

const CALLOUTS = {
  Note: { icon: CircleAlert, className: "is-note" },
  Info: { icon: Info, className: "is-note" },
  Tip: { icon: Lightbulb, className: "is-tip" },
  Warning: { icon: TriangleAlert, className: "is-warning" },
  Check: { icon: CircleAlert, className: "is-note" },
} as const;

function callout(kind: keyof typeof CALLOUTS) {
  const { icon: Icon, className } = CALLOUTS[kind];
  function Callout({ children }: { children: ReactNode }) {
    return (
      <div className={cn("docs-callout", className)} data-callout={kind.toLowerCase()}>
        <Icon aria-hidden="true" className="docs-callout-icon" strokeWidth={kind === "Warning" ? 1.5 : 2} />
        <div className="docs-callout-body">{children}</div>
      </div>
    );
  }
  Callout.displayName = kind;
  return Callout;
}

export const Note = callout("Note");
export const InfoCallout = callout("Info");
export const Tip = callout("Tip");
export const Warning = callout("Warning");
export const Check = callout("Check");

const isExternal = (href: string) => /^[a-z]+:/i.test(href) || href.startsWith("//");

/** A link in the docs: client-side for pages here, a plain anchor for other sites. */
export function DocsLink({ href = "", children, ...props }: ComponentProps<"a">) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} {...(isExternal(href) ? { target: "_blank", rel: "noreferrer" } : {})} {...props}>
      {children}
    </a>
  );
}

export function Card({
  title,
  icon,
  href,
  cta,
  arrow,
  children,
}: {
  title: string;
  icon?: string;
  href?: string;
  cta?: string;
  arrow?: boolean;
  children?: ReactNode;
}) {
  const external = href ? isExternal(href) : false;
  const body = (
    <>
      {icon && (
        <span className="docs-card-icon">
          <DocsIcon icon={icon} className="size-5" />
        </span>
      )}
      <span className="docs-card-title">{title}</span>
      {children && <div className="docs-card-body">{children}</div>}
      {cta && (
        <span className="docs-card-cta">
          {cta}
          {arrow && <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={1.6} />}
        </span>
      )}
      {external && (
        <span className="docs-card-arrow" aria-hidden="true">
          <ArrowUpRight className="size-4" strokeWidth={1.6} />
        </span>
      )}
    </>
  );
  if (!href) return <div className="docs-card">{body}</div>;
  return (
    <DocsLink href={href} className="docs-card is-link">
      {body}
    </DocsLink>
  );
}

export function CardGroup({ cols = 2, children }: { cols?: number; children: ReactNode }) {
  return (
    <div className="docs-card-group" style={{ "--cols": cols } as React.CSSProperties}>
      {children}
    </div>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="docs-steps">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="docs-step">
      <p className="docs-step-title">{title}</p>
      <div className="docs-step-body">{children}</div>
    </li>
  );
}

/** One `<Tab>`'s content; `<Tabs>` draws the tab itself from the title. */
export function Tab({ children }: { title?: string; children: ReactNode }) {
  return <div className="docs-tab-content">{children}</div>;
}

export function AccordionGroup({ children }: { children: ReactNode }) {
  return <div className="docs-accordion-group">{children}</div>;
}

function heading(Tag: "h2" | "h3" | "h4") {
  function Heading({ id, children, ...props }: ComponentProps<"h2">) {
    return (
      <Tag id={id} className="docs-heading" {...props}>
        {children}
        {id && (
          <a href={`#${id}`} className="docs-heading-anchor" aria-hidden="true" tabIndex={-1}>
            <Link2 className="size-4" strokeWidth={1.6} />
          </a>
        )}
      </Tag>
    );
  }
  Heading.displayName = Tag;
  return Heading;
}

export const H2 = heading("h2");
export const H3 = heading("h3");
export const H4 = heading("h4");

export function Table(props: ComponentProps<"table">) {
  return (
    <div className="docs-table">
      <table {...props} />
    </div>
  );
}
