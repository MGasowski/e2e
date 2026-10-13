import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { expectCopied, recordClipboard } from '../../support/clipboard.ts';
import { get, landing, landingUrlPattern, links } from '../../support/site.ts';
import { brokenImages, horizontalOverflow, prepare, viewportWidth } from '../../support/stable.ts';

const heading = 'Open Source AI testing framework';

describe('landing page', { tags: ['landing'] }, () => {
  test.beforeEach(async ({ app, browser, screen }) => {
    await prepare(browser, 'dark');
    await app.open(landing());
    await expect(screen.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  });

  test('serves its title, description, social card, and favicons', async ({ browser }) => {
    await expect(browser).toHaveTitle('e2e: The open source AI testing framework');
    await expect(browser.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Customizable TypeScript testing framework for web, mobile apps and more.',
    );
    await expect(browser.locator('meta[property="og:title"]')).toHaveAttribute('content', /e2e/);
    await expect(browser.locator('meta[property="og:image"]').first()).toHaveAttribute('content', /\/e2e\/og-image\.png/);
    await expect(browser.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(browser.locator('link[rel="icon"][media="(prefers-color-scheme: light)"]')).toHaveAttribute(
      'href',
      /favicon-black\.png/,
    );
    await expect(browser.locator('link[rel="icon"][media="(prefers-color-scheme: dark)"]')).toHaveAttribute(
      'href',
      /favicon-white\.png/,
    );
    const ogImage = await browser.locator('meta[property="og:image"]').first().getAttribute('content');
    const response = await get(new URL(ogImage ?? '', landing()).href);
    expect(response.status, 'the social card image loads').toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^image\//);
  });

  test('has one h1, landmarks, and a heading for every section', async ({ screen }) => {
    await expect(screen.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(screen.getByRole('banner')).toBeVisible();
    await expect(screen.getByRole('main')).toBeVisible();
    await expect(screen.getByRole('contentinfo')).toBeAttached();
    for (const name of [
      'Your testing stack. Your call.',
      'AI where it helps. Code where it counts.',
      'Loved by developers.',
      'Questions, answered.',
    ]) {
      await expect(screen.getByRole('heading', { level: 2, name })).toBeAttached();
    }
  });

  test('renders the hero copy and both calls to action', async ({ screen }) => {
    const hero = screen.getByRole('main');
    await expect(
      hero.getByText('Customizable TypeScript testing framework for web, mobile apps and more.', { exact: true }),
    ).toBeVisible();
    await expect(hero.getByText(links.initCommand, { exact: true }).first()).toBeVisible();
    const github = hero.getByRole('link', { name: /^github$/i }).first();
    await expect(github).toHaveAttribute('href', links.github);
    await expect(github).toHaveAttribute('target', '_blank');
  });

  test('the hero copy button copies the init command and confirms it', async ({ browser, screen }) => {
    await recordClipboard(browser);
    const copy = screen.getByRole('main').getByRole('button', { name: 'Copy to clipboard' }).first();
    await copy.tap();
    await expectCopied(browser, links.initCommand);
  });

  test('the header links home, to the docs, Discord, and the GitHub repo with its stars', async ({ browser, screen }) => {
    const header = screen.getByRole('banner');
    await expect(header.getByRole('link', { name: 'TesterArmy home' })).toHaveAttribute('href', '/');
    const home = header.getByRole('link', { name: 'e2e home' });
    await expect(home).toHaveAttribute('href', '/e2e');
    const stars = header.getByRole('link', { name: /^e2e on GitHub/ });
    await expect(stars).toHaveAttribute('href', links.github);
    await expect(stars).toHaveAttribute('target', '_blank');
    await expect(stars).toHaveAccessibleName(/^e2e on GitHub(, [\d,]+ stars)?$/);

    test.skip((await viewportWidth(browser)) < 640, 'the docs and community links move into the menu below 640px');
    const docsLink = header.getByRole('link', { name: 'docs', exact: true });
    await expect(docsLink).toHaveAttribute('href', links.docs);
    await expect(docsLink).toHaveAttribute('target', '_blank');
    const community = header.getByRole('link', { name: 'Join community' });
    await expect(community).toHaveAttribute('href', '/discord');
    await expect(community).toHaveAttribute('target', '_blank');
  });

  test('the e2e home link stays on the landing page', async ({ browser, screen }) => {
    await screen.getByRole('banner').getByRole('link', { name: 'e2e home' }).tap();
    await expect(browser).toHaveURL(landingUrlPattern());
  });

  test('the footer links every resource and social account', async ({ screen }) => {
    const footer = screen.getByRole('contentinfo');
    const expected: [RegExp, string][] = [
      [/^Getting started$/i, links.docs],
      [/^Examples$/i, `${links.docs}/browser`],
      [/^Documentation$/i, links.docs],
      [/^Changelog$/i, links.changelog],
      [/^GitHub$/i, links.github],
      [/^Discord$/i, '/discord'],
      [/^LinkedIn$/i, links.linkedin],
      [/^X$/i, links.x],
    ];
    for (const [name, href] of expected) {
      await expect(footer.getByRole("link", { name }).first()).toHaveAttribute('href', href);
    }
    await expect(footer.getByText(/© \d{4} TesterArmy, Inc\./)).toBeAttached();
    await expect(footer.getByText('Less setup. More testing.', { exact: true })).toBeAttached();
  });

  test('the footer copy button copies the init command', async ({ browser, screen }) => {
    await recordClipboard(browser);
    const copy = screen.getByRole('contentinfo').getByRole('button', { name: 'Copy to clipboard' });
    await copy.scrollIntoView();
    await copy.tap();
    await expectCopied(browser, links.initCommand);
  });

  test('Back to the top returns to the hero', async ({ browser, screen }) => {
    const back = screen.getByRole('link', { name: /Back to the top/i });
    await expect(back).toHaveAttribute('href', '#top');
    await back.scrollIntoView();
    await back.tap();
    await expect.poll(() => browser.evaluate(() => window.scrollY)).toBeLessThan(50);
  });

  test('fits the viewport and every image loads', async ({ browser }) => {
    expect(await horizontalOverflow(browser), 'no horizontal scroll').toBe(0);
    // Lazy images load once scrolled near, so walk the page before reading them.
    await browser.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return null;
    });
    await expect.poll(() => brokenImages(browser)).toEqual([]);
    expect(await horizontalOverflow(browser), 'no horizontal scroll after every section rendered').toBe(0);
  });

  test('the Discord link redirects to the community invite', async () => {
    const response = await get(new URL('/discord', landing()).href, { redirect: 'manual' });
    expect([301, 302, 307, 308]).toContain(response.status);
    expect(response.headers.get('location')).toMatch(/^https:\/\/discord\.(gg|com)\//);
  });
});
