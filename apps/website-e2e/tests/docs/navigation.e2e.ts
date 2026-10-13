import { type Browser, describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { navLabel } from '../../support/docs.ts';
import { docsPages } from '../../support/docs-pages.ts';
import { docs, docsUrlPattern, links } from '../../support/site.ts';
import { prepare, viewportWidth } from '../../support/stable.ts';

const tabs = [...new Set(docsPages.map((page) => page.tab))];
const firstOf = (tab: string) => docsPages.find((page) => page.tab === tab)!;
const pathOf = (slug: string) => new URL(docs(slug)).pathname;

/** How far below the viewport top an h2 sits, or Infinity when it is above the viewport or missing. */
const headingTop = (browser: Browser, text: string) =>
  browser.evaluate((wanted) => {
    const heading = [...document.querySelectorAll('h2')].find((candidate) =>
      (candidate.textContent ?? '').replace(/[\u200B]/g, '').trim().startsWith(wanted),
    );
    const top = heading?.getBoundingClientRect().top;
    return top === undefined || top < -1 ? Number.MAX_SAFE_INTEGER : Math.round(top);
  }, text);

describe('docs navigation', { tags: ['docs'] }, () => {
  test.beforeEach(async ({ browser }) => {
    await prepare(browser, 'light');
  });

  for (const tab of tabs) {
    test(`the ${tab} tab lists every one of its pages in order`, async ({ app, browser, screen }) => {
      test.skip((await viewportWidth(browser)) < 1024, 'the sidebar is behind a menu below 1024px');
      await app.open(docs(firstOf(tab).slug));
      await expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
      const pages = docsPages.filter((page) => page.tab === tab);
      const hrefs = await browser.evaluate(
        () => [...document.querySelectorAll('#sidebar a, nav a')].map((a) => a.getAttribute('href') ?? ''),
      );
      const positions = pages.map((page) => hrefs.indexOf(pathOf(page.slug)));
      expect(
        pages.filter((_, index) => positions[index] === -1).map((page) => page.slug),
        'pages missing from the navigation',
      ).toEqual([]);
      expect(positions).toEqual(positions.toSorted((a, b) => a - b));
      for (const page of pages) {
        await expect(screen.getByRole('link', { name: navLabel(page), exact: true }).first()).toBeAttached();
      }
    });
  }

  test('each group heading shows above its pages', async ({ app, browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 1024, 'the sidebar is behind a menu below 1024px');
    await app.open(docs());
    await expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    // The navigation with the most links is the sidebar, whatever its markup.
    const sidebar = await browser.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('#sidebar, nav, aside')]
        .toSorted((a, b) => b.querySelectorAll('a').length - a.querySelectorAll('a').length)[0]?.textContent ?? '',
    );
    const groups = [...new Set(docsPages.filter((page) => page.tab === 'Documentation').map((page) => page.group))];
    const positions = groups.map((group) => sidebar.indexOf(group));
    expect(groups.filter((_, index) => positions[index] === -1)).toEqual([]);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });

  test('the top tabs switch between Documentation, Reference, and Examples', async ({ app, browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 1024, 'the tabs move into the menu below 1024px');
    await app.open(docs());
    for (const tab of tabs) {
      const link = screen.getByRole('link', { name: tab, exact: true }).first();
      await expect(link).toHaveAttribute('href', tab === tabs[0] ? pathOf('') : pathOf(firstOf(tab).slug));
    }
    await screen.getByRole('link', { name: 'Reference', exact: true }).first().tap();
    await expect(browser).toHaveURL(docsUrlPattern('reference/test'));
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('test');
    await screen.getByRole('link', { name: 'Examples', exact: true }).first().tap();
    await expect(browser).toHaveURL(docsUrlPattern('example-projects'));
  });

  test('a sidebar link opens its page and marks it current', async ({ app, browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 1024, 'the sidebar is behind a menu below 1024px');
    await app.open(docs());
    await screen.getByRole('link', { name: 'Core concepts', exact: true }).first().tap();
    await expect(browser).toHaveURL(docsUrlPattern('core-concepts'));
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Core concepts');
    await expect(browser.locator('[aria-current="page"]').first()).toHaveText('Core concepts');
  });

  test('Next and Previous walk the pages in order', async ({ app, browser, screen }) => {
    await app.open(docs('quickstart'));
    await screen.getByRole('link', { name: /^Next: / }).first().tap();
    await expect(browser).toHaveURL(docsUrlPattern('core-concepts'));
    await screen.getByRole('link', { name: /^Previous: / }).first().tap();
    await expect(browser).toHaveURL(docsUrlPattern('quickstart'));
  });

  test('the table of contents jumps to a section', async ({ app, browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 1280, 'the table of contents shows from 1280px');
    await app.open(docs('core-concepts'));
    await screen.getByRole('link', { name: 'Locators', exact: true }).last().tap();
    await expect(browser).toHaveURL(/#locators$/);
    await expect.poll(() => headingTop(browser, 'Locators')).toBeLessThan(400);
  });

  test('a heading anchor in the URL scrolls to its section', async ({ app, browser }) => {
    await app.open(docs('core-concepts#assertions'));
    await expect.poll(() => headingTop(browser, 'Assertions')).toBeLessThan(400);
  });

  test('the logo leads home from any page', async ({ app, browser, screen }) => {
    await app.open(docs('reference/cli'));
    await screen.getByRole('link', { name: /home page/i }).first().tap();
    await expect(browser).toHaveURL(docsUrlPattern(''));
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Introduction');
  });

  test('an old path lands on its new page in the browser', async ({ app, browser, screen }) => {
    await app.open(docs('configuration'));
    await expect(browser).toHaveURL(docsUrlPattern('reference/config'));
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('E2EConfig');
  });

  test('the navbar, sidebar banner, and footer link out to GitHub and TesterArmy', async ({ app, browser, screen }) => {
    await app.open(docs());
    await expect(screen.getByRole('link', { name: /GitHub/i }).first()).toHaveAttribute('href', links.github);
    const banner = browser.locator('a[href*="utm_campaign=docs_sidebar_banner"]');
    await expect(banner.first()).toHaveAttribute('href', /^https:\/\/tester\.army\//);
    await expect(browser.locator('footer a[href="https://github.com/tester-army/e2e"]')).toHaveCount(1);
    await expect(browser.locator('footer a[href*="utm_campaign=docs_footer"]')).toHaveAttribute(
      'href',
      /^https:\/\/tester\.army\//,
    );
  });

  test('the Introduction cards lead to the next steps', async ({ app, browser, screen }) => {
    await app.open(docs());
    for (const slug of ['quickstart', 'example-projects', 'core-concepts', 'coding-agents']) {
      await expect(browser.locator(`#content-area a[href="${pathOf(slug)}"], main a[href="${pathOf(slug)}"]`).first()).toBeAttached();
    }
    await expect(screen.getByRole('link', { name: /Watch e2e explained/i }).first()).toHaveAttribute(
      'href',
      /youtube\.com\/watch\?v=NEawZb6Hssw/,
    );
  });

  test('on mobile the menu lists the pages and opens one', async ({ app, browser, screen }) => {
    test.skip((await viewportWidth(browser)) >= 1024, 'the sidebar is always open from 1024px');
    await app.open(docs('quickstart'));
    await screen.getByRole('button', { name: /Navigation/ }).first().tap();
    const link = screen.getByRole('link', { name: 'Core concepts', exact: true }).first();
    await expect(link).toBeVisible();
    await link.tap();
    await expect(browser).toHaveURL(docsUrlPattern('core-concepts'));
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Core concepts');
  });
});
