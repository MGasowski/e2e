import { type Browser, describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import type { DocsPage } from './docs-pages.ts';
import { navLabel, neighbors, pageHeadings } from './docs.ts';
import { docs } from './site.ts';
import { brokenImages, horizontalOverflow, openStill, prepare, stabilize } from './stable.ts';
import { compareScreens, slugName, type Position } from './visual.ts';

/**
 * One functional test per docs page: its title, description, every `##`
 * heading in order, where it sits in the navigation, and that it lays out
 * without sideways scroll or broken images.
 */
export function testDocsPages(pages: readonly DocsPage[]) {
  describe('docs page', { tags: ['docs'] }, () => {
    for (const page of pages) {
      test(`/${page.slug} renders "${page.title}"`, async ({ app, browser, screen }) => {
        await prepare(browser, 'light');
        await app.open(docs(page.slug));
        await expect(screen.getByRole('heading', { level: 1 })).toHaveText(page.title);
        await expect(browser).toHaveTitle(new RegExp(`^${escape(page.title)}(?:\\s|$)`));
        await expect(browser.locator('meta[name="description"]')).toHaveAttribute('content', page.description);

        const headings = await pageHeadings(browser);
        const positions = page.headings.map((heading) => headings.indexOf(heading));
        expect(
          page.headings.filter((_, index) => positions[index] === -1),
          'every ## heading of the page renders as an h2',
        ).toEqual([]);
        expect(positions, 'the h2s keep the page order').toEqual(positions.toSorted((a, b) => a - b));

        const current = browser.locator('[aria-current="page"]');
        await expect(current.first()).toBeAttached();
        expect(await current.allTextContents(), 'the navigation marks this page current').toContain(navLabel(page));

        const { previous, next } = neighbors(page);
        const nextLink = screen.getByRole('link', { name: /^Next: / });
        const previousLink = screen.getByRole('link', { name: /^Previous: / });
        if (next === undefined) await expect(nextLink).toHaveCount(0);
        else await expect(nextLink.first()).toHaveAttribute('href', pathOf(next.slug));
        if (previous === undefined) await expect(previousLink).toHaveCount(0);
        else await expect(previousLink.first()).toHaveAttribute('href', pathOf(previous.slug));

        expect(await horizontalOverflow(browser), 'no sideways scroll').toBe(0);
        await walk(browser);
        await expect.poll(() => brokenImages(browser)).toEqual([]);
        expect(await horizontalOverflow(browser), 'no sideways scroll once everything rendered').toBe(0);
      });
    }
  });
}

/**
 * The pages compared at their middle and end too: the entry points a reader
 * lands on and the references they keep open. Every other page is compared
 * at its first screen.
 */
export const deepPages: readonly string[] = [
  '',
  'quickstart',
  'core-concepts',
  'web',
  'mobile',
  'visual-testing',
  'reference/config',
  'reference/expect',
  'reference/cli',
];

/**
 * One visual test per docs page on both targets, light theme: the first
 * screen of every page, plus the middle and end of the pages listed in
 * `deep`.
 */
export function testDocsVisuals(pages: readonly DocsPage[], deep: readonly string[] = []) {
  describe('docs visuals', { tags: ['docs', 'visual'] }, () => {
    for (const page of pages) {
      const at: readonly Position[] = deep.includes(page.slug) ? ['top', 'middle', 'end'] : ['top'];
      test(`/${page.slug}`, async ({ browser, screen }) => {
        await openDocsStill(browser, page.slug, 'light');
        await expect(screen.getByRole('heading', { level: 1 })).toHaveText(page.title);
        await compareScreens(browser, screen, `docs-${slugName(page.slug)}`, { at, mask: docsMask(browser) });
      });
    }
  });
}

/** Opens a docs page held still for a screenshot. */
export async function openDocsStill(browser: Browser, slug: string, scheme: 'light' | 'dark') {
  await stabilize(browser, scheme);
  await openStill(browser, docs(slug));
  await hideDocsChrome(browser);
}

/**
 * What changes between two loads of a docs page: videos (stopped on their
 * first frame, which may still be loading), the YouTube thumbnail, and the
 * TesterArmy promo card, whose DM Mono font comes from tester.army and so
 * falls back whenever that site's firewall challenges the run. The card is
 * marketing, not docs; `navigation.e2e.ts` checks its link.
 */
export const docsMask = (browser: Browser) => [
  browser.locator('video'),
  browser.locator('img[src*="ytimg.com"]'),
  browser.locator('a[href*="utm_campaign=docs_sidebar_banner"]'),
];

/**
 * Mintlify's floating "Ask a question" assistant bar is the service's, not
 * the page's, and website/ will not have it; it is hidden before every
 * screenshot so the comparison covers the page alone.
 */
async function hideDocsChrome(browser: Browser) {
  await browser.evaluate(() => {
    const ask = document.querySelector('textarea[aria-label="Ask a question..."]');
    let floating: HTMLElement | null = ask instanceof HTMLElement ? ask : null;
    while (floating && getComputedStyle(floating).position !== 'fixed') floating = floating.parentElement;
    if (floating) floating.style.setProperty('display', 'none', 'important');
    return null;
  });
}

/** The path a docs link carries for a slug: the docs base path, then the slug. */
function pathOf(slug: string) {
  return new URL(docs(slug)).pathname;
}

/** Scrolls through the page so lazy images load. */
async function walk(browser: Browser) {
  await browser.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    return null;
  });
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
