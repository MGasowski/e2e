import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mdxComponents } from "@/components/docs/mdx";
import { PageActions } from "@/components/docs/page-actions";
import { Promo } from "@/components/docs/shell";
import { TableOfContents } from "@/components/docs/toc";
import { GithubIcon } from "@/components/icons/github-icon";
import { promo as promoLink } from "@/lib/docs/navigation";
import { renderPage } from "@/lib/docs/render";
import {
  docsPath,
  type DocsPageMeta,
  getNeighbors,
  getPage,
  getPages,
  getSocials,
  navLabel,
  PRODUCTION_ORIGIN,
} from "@/lib/docs/source";

export function generateStaticParams() {
  return getPages().map((page) => ({ slug: page.slug ? page.slug.split("/") : [] }));
}

const slugOf = (slug: string[] | undefined) => (slug ?? []).join("/");

/** The brand card, for pages without their own. */
const DEFAULT_CARD = `${PRODUCTION_ORIGIN}/docs/images/og.png`;

export async function generateMetadata({ params }: PageProps<"/docs/[[...slug]]">): Promise<Metadata> {
  const page = getPage(slugOf((await params).slug));
  if (!page) return {};
  const image = page.ogImage ?? DEFAULT_CARD;
  const path = docsPath(page.slug);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path, types: { "text/markdown": `/docs/${page.slug || "index"}.md` } },
    openGraph: { type: "website", siteName: "e2e", title: page.title, description: page.description, url: path, images: [image] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image] },
  };
}

function PagerLink({ page, direction }: { page: DocsPageMeta | undefined; direction: "Previous" | "Next" }) {
  if (!page) return null;
  const Arrow = direction === "Previous" ? ChevronLeft : ChevronRight;
  return (
    <Link href={docsPath(page.slug)} aria-label={`${direction}: ${navLabel(page)}`} className="docs-pager-link" data-direction={direction.toLowerCase()}>
      {direction === "Previous" && <Arrow aria-hidden="true" className="docs-pager-arrow size-3" />}
      <span>{navLabel(page)}</span>
      {direction === "Next" && <Arrow aria-hidden="true" className="docs-pager-arrow size-3" />}
    </Link>
  );
}

/**
 * Every page is prerendered from `generateStaticParams`; `proxy.ts` answers
 * other paths with a 404 before they reach this route. Reading the params
 * outside a Suspense boundary is fine for that reason, so the route opts out
 * of the instant-navigation check.
 */
// fallow-ignore-next-line unused-export -- a Next.js route segment config
export const instant = false;

export default async function DocsPage({ params }: PageProps<"/docs/[[...slug]]">) {
  const page = getPage(slugOf((await params).slug));
  if (!page) notFound();
  const { Content, toc } = await renderPage(page.source);
  const { previous, next } = getNeighbors(page);
  const socials = getSocials();
  const promo = promoLink();
  const markdownPath = `/docs/${page.slug || "index"}.md`;

  return (
    <div className="docs-page" key={page.slug}>
      <article className="docs-article">
        <header className="docs-page-header">
          {page.group !== page.tab && <p className="docs-eyebrow">{page.group}</p>}
          <div className="docs-title-row">
            <h1 className="docs-title">{page.title}</h1>
            <PageActions markdownPath={markdownPath} markdownUrl={`${PRODUCTION_ORIGIN}${markdownPath}`} />
          </div>
          {page.description && <p className="docs-description">{page.description}</p>}
        </header>
        <div id="content-area" className="docs-prose">
          <Content components={mdxComponents} />
        </div>
        {(previous || next) && (
          <div className="docs-pager">
            <PagerLink page={previous} direction="Previous" />
            <PagerLink page={next} direction="Next" />
          </div>
        )}
        <footer className="docs-footer">
          <a href={socials.github} target="_blank" rel="noreferrer" aria-label="e2e on GitHub" className="docs-footer-social">
            <GithubIcon aria-hidden="true" className="size-5" />
          </a>
          {socials.website && (
            <a href={socials.website} target="_blank" rel="noreferrer" aria-label="Built by TesterArmy" className="docs-footer-built">
              Built by
              <Image src="/docs/images/footer/testerarmy-mark.png" alt="" width={70} height={64} className="docs-footer-mark" />
              <span aria-hidden="true" className="docs-footer-wordmark" />
            </a>
          )}
        </footer>
      </article>
      <aside className="docs-aside">
        <TableOfContents entries={toc} />
        <Promo promo={promo} />
      </aside>
    </div>
  );
}
