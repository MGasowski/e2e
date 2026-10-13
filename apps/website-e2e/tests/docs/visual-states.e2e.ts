import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { docsMask, openDocsStill } from '../../support/docs-suite.ts';
import { viewportWidth } from '../../support/stable.ts';
import { compareViewport, scrollTo } from '../../support/visual.ts';

/** The docs after an interaction: what each control looks like opened or switched. */
describe('docs visuals: states', { tags: ['docs', 'visual'] }, () => {
  test('search with results', async ({ browser, screen }) => {
    await openDocsStill(browser, '', 'light');
    await screen.getByRole('button', { name: 'Open search' }).first().tap();
    await screen.getByRole('combobox').first().fill('visual comparison');
    await expect(screen.getByRole('option', { name: /Visual comparison/i }).first()).toBeVisible();
    await compareViewport(browser, screen, 'docs-search-results', docsMask(browser));
  });

  test('theme menu open', async ({ browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 1024, 'the theme switch is in the menu below 1024px');
    await openDocsStill(browser, '', 'light');
    await screen.getByRole('button', { name: 'Change theme preference' }).first().tap();
    await expect(screen.getByRole('menu').first()).toBeVisible();
    await compareViewport(browser, screen, 'docs-theme-menu', docsMask(browser));
  });

  test('page menu open', async ({ browser, screen }) => {
    await openDocsStill(browser, 'quickstart', 'light');
    await browser.locator('#page-context-menu button[aria-label="More actions"]:visible').first().tap();
    await expect(screen.getByRole('menu').first()).toBeVisible();
    await compareViewport(browser, screen, 'docs-page-menu', docsMask(browser));
  });

  test('install commands on pnpm', async ({ browser, screen }) => {
    await openDocsStill(browser, 'quickstart', 'light');
    await screen.getByRole('tab', { name: 'pnpm', exact: true }).first().tap();
    await scrollTo(browser, { selector: 'h3, h2', text: 'Run your first test', offset: 80 });
    await compareViewport(browser, screen, 'docs-codegroup-pnpm', docsMask(browser));
  });

  test('agent prompt expanded', async ({ browser, screen }) => {
    await openDocsStill(browser, 'quickstart', 'light');
    await screen.getByRole('button', { name: 'Show more', exact: true }).first().tap();
    await scrollTo(browser, { selector: 'h2', text: 'Set up with your coding agent', offset: 80 });
    await compareViewport(browser, screen, 'docs-agent-prompt-expanded', docsMask(browser));
  });

  test('accordion open', async ({ browser, screen }) => {
    await openDocsStill(browser, 'quickstart', 'light');
    const summary = browser.locator('summary').filter({ hasText: 'Example web config and test' }).first();
    await summary.tap();
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await scrollTo(browser, { selector: 'summary', text: 'Example web config and test', offset: 120 });
    await compareViewport(browser, screen, 'docs-accordion-open', docsMask(browser));
  });

  test('API key setup with a provider picked', async ({ browser, screen }) => {
    await openDocsStill(browser, 'quickstart', 'light');
    await screen.getByRole('tab', { name: 'API key', exact: true }).first().tap();
    await browser.locator('#provider-select').selectOption({ value: 'openrouter' });
    await scrollTo(browser, { selector: '[role="tab"]', text: 'API key', offset: 120 });
    await compareViewport(browser, screen, 'docs-provider-openrouter', docsMask(browser));
  });

  test('mobile navigation open', async ({ browser, screen }) => {
    test.skip((await viewportWidth(browser)) >= 1024, 'the sidebar is always open from 1024px');
    await openDocsStill(browser, 'quickstart', 'light');
    await screen.getByRole('button', { name: /Navigation/ }).first().tap();
    await expect(screen.getByRole('link', { name: 'Core concepts', exact: true }).first()).toBeVisible();
    await compareViewport(browser, screen, 'docs-mobile-navigation', docsMask(browser));
  });

  test('the 404 page', async ({ browser, screen }) => {
    await openDocsStill(browser, 'this-page-does-not-exist-e2e', 'light');
    await compareViewport(browser, screen, 'docs-not-found', docsMask(browser));
  });
});
