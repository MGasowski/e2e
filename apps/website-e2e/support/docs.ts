import type { Browser } from '@e2e-dev/web';
import { docsPages, type DocsPage } from './docs-pages.ts';

/**
 * The text of every h2 on the page, in order, without the zero-width space
 * Mintlify puts before a heading's anchor. Reads semantics, not Mintlify's
 * markup, so website/ passes it with any layout.
 */
export const pageHeadings = (browser: Browser) =>
  browser.evaluate(() =>
    [...document.querySelectorAll('h2')].map((heading) =>
      (heading.textContent ?? '').replace(/\u200B|\u200C|\u200D|\uFEFF/g, '').replace(/\s+/g, ' ').trim(),
    ),
  );

/** The pages in navigation order, split into `count` runs; the runner gives each file one worker. */
export function chunk(index: number, count: number): readonly DocsPage[] {
  const size = Math.ceil(docsPages.length / count);
  return docsPages.slice(index * size, (index + 1) * size);
}

/** The pages before and after `page` in its tab's navigation order; pagination never crosses a tab. */
export function neighbors(page: DocsPage): { previous?: DocsPage; next?: DocsPage } {
  const tab = docsPages.filter((candidate) => candidate.tab === page.tab);
  const index = tab.indexOf(page);
  const previous = tab[index - 1];
  const next = tab[index + 1];
  return { ...(previous ? { previous } : {}), ...(next ? { next } : {}) };
}

/** The label a page has in the sidebar. */
export const navLabel = (page: DocsPage) => page.sidebarTitle ?? page.title;
