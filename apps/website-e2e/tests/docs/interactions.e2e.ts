import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { expectCopied, recordClipboard } from '../../support/clipboard.ts';
import { docs, docsUrlPattern } from '../../support/site.ts';
import { prepare, viewportWidth } from '../../support/stable.ts';

describe('docs interactions', { tags: ['docs'] }, () => {
  test.beforeEach(async ({ browser }) => {
    await prepare(browser, 'light');
  });

  test('search finds a page by its title and opens it', async ({ app, browser, screen }) => {
    await app.open(docs());
    await screen.getByRole('button', { name: 'Open search' }).first().tap();
    const input = screen.getByRole('combobox').first();
    await input.fill('visual comparison');
    const result = screen.getByRole('option', { name: /Visual comparison/i }).first();
    await expect(result).toBeVisible();
    await result.tap();
    await expect(browser).toHaveURL(docsUrlPattern('visual-testing'));
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Visual comparison');
  });

  test('Cmd+K opens search and Escape closes it', async ({ app, browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 1024, 'the keyboard shortcut is a desktop affordance');
    await app.open(docs());
    await expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    await browser.keyboard.press('Meta+k');
    const dialog = screen.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    await browser.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('the theme menu switches to dark and back to light', async ({ app, browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 1024, 'the theme switch moves into the menu below 1024px');
    await app.open(docs());
    const isDark = () => browser.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(await isDark()).toBe(false);
    await screen.getByRole('button', { name: 'Change theme preference' }).first().tap();
    await screen.getByRole('menuitem', { name: /^Dark/ }).first().tap();
    await expect.poll(isDark).toBe(true);
    await screen.getByRole('button', { name: 'Change theme preference' }).first().tap();
    await screen.getByRole('menuitem', { name: /^Light/ }).first().tap();
    await expect.poll(isDark).toBe(false);
  });

  test('a code block copies its contents', async ({ app, browser, screen }) => {
    await app.open(docs('quickstart'));
    await recordClipboard(browser);
    const copy = screen.getByRole('button', { name: 'Copy the contents from the code block' }).first();
    await copy.scrollIntoView();
    await copy.tap();
    await expectCopied(browser, /e2e/);
  });

  test('a package manager tab switches every install command on the page', async ({ app, browser, screen }) => {
    await app.open(docs('quickstart'));
    const groups = browser.locator('[role="tablist"][aria-label="Code examples"]');
    expect(await groups.count()).toBeGreaterThan(1);
    const pnpm = screen.getByRole('tab', { name: 'pnpm', exact: true }).first();
    await pnpm.scrollIntoView();
    await pnpm.tap();
    await expect(pnpm).toHaveAttribute('aria-selected', 'true');
    const selected = await browser.evaluate(() =>
      [...document.querySelectorAll('[role="tablist"][aria-label="Code examples"]')].map(
        (list) => list.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() ?? '',
      ),
    );
    expect(new Set(selected), 'every npm/pnpm/bun group follows the choice').toEqual(new Set(['pnpm']));
    await expect(screen.getByText(/pnpm (dlx|add|exec)/).first()).toBeVisible();
  });

  test('the package manager choice carries over to the next page', async ({ app, browser, screen }) => {
    await app.open(docs('quickstart'));
    const bun = screen.getByRole('tab', { name: 'bun', exact: true }).first();
    await bun.scrollIntoView();
    await bun.tap();
    await app.open(docs('mobile'));
    await expect(screen.getByRole('tab', { name: 'bun', exact: true }).first()).toHaveAttribute('aria-selected', 'true');
    expect(await browser.locator('[role="tab"][aria-selected="true"]').allTextContents()).not.toContain('npm');
  });

  test('content tabs switch their panel', async ({ app, screen }) => {
    await app.open(docs('mobile'));
    const android = screen.getByRole('tab', { name: 'Android', exact: true }).first();
    await android.scrollIntoView();
    await android.tap();
    await expect(android).toHaveAttribute('aria-selected', 'true');
    await expect(screen.getByRole('tab', { name: 'iOS', exact: true }).first()).toHaveAttribute('aria-selected', 'false');
  });

  test('an accordion opens and closes', async ({ app, browser }) => {
    await app.open(docs('quickstart'));
    const summary = browser.locator('summary').filter({ hasText: 'Example web config and test' }).first();
    await summary.scrollIntoView();
    await summary.tap();
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await summary.tap();
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
  });

  test('Copy page copies the page as markdown', async ({ app, browser, screen }) => {
    await app.open(docs('quickstart'));
    await recordClipboard(browser);
    await screen.getByRole('button', { name: 'Copy page', visible: true }).first().tap();
    await expectCopied(browser, /# Quickstart/);
  });

  test('the page menu offers markdown and the AI tools', async ({ app, browser, screen }) => {
    await app.open(docs('quickstart'));
    // The page's own menu, beside Copy page; the mobile navbar has another "More actions".
    await browser.locator('#page-context-menu button[aria-label="More actions"]:visible').first().tap();
    await expect(screen.getByRole('menu').first()).toBeVisible();
    for (const item of [/Copy page/, /View as Markdown/, /ChatGPT/, /Claude/, /Cursor/]) {
      await expect(screen.getByRole('menuitem', { name: item }).first()).toBeVisible();
    }
  });

  test('the agent prompt expands and copies with the quickstart link', async ({ app, browser, screen }) => {
    await app.open(docs('quickstart'));
    await recordClipboard(browser);
    const more = screen.getByRole('button', { name: 'Show more', exact: true }).first();
    await more.scrollIntoView();
    await more.tap();
    await expect(screen.getByRole('button', { name: 'Show less', exact: true }).first()).toBeVisible();
    await screen.getByRole('button', { name: 'Copy prompt' }).first().tap();
    await expectCopied(browser, /quickstart\.md/);
  });

  test('the provider picker rewrites the API key setup', async ({ app, browser, screen }) => {
    await app.open(docs('quickstart'));
    const apiKey = screen.getByRole('tab', { name: 'API key', exact: true }).first();
    await apiKey.scrollIntoView();
    await apiKey.tap();
    const picker = screen.getByLabel('Provider', { exact: true, visible: true }).first();
    await expect(picker).toBeVisible();
    const panelText = () =>
      browser.evaluate(() => (document.querySelector('#provider-select')?.closest('[role="tabpanel"]') as HTMLElement | null)?.innerText ?? '');
    const before = await panelText();
    const values = await browser.evaluate(() =>
      [...((document.querySelector("#provider-select") as HTMLSelectElement | null)?.options ?? [])].filter((option) => !option.disabled).map((option) => option.value),
    );
    expect(values.length, 'the picker offers several providers').toBeGreaterThan(2);
    const current = await picker.inputValue();
    await picker.selectOption({ value: values.find((value) => value !== current)! });
    await expect.poll(panelText).not.toBe(before);
  });
});
