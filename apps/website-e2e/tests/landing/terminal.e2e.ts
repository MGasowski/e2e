import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { landing } from '../../support/site.ts';
import { prepare } from '../../support/stable.ts';

const tabs = {
  'checkout.e2e.ts': ["test('a member upgrades to Pro'", "'upgrade the workspace to the Pro plan'"],
  'todos.e2e.ts': ["test('todos round-trip'", 'add todos "Buy milk" and "Walk the dog"'],
  'mobile.e2e.ts': ["from '@e2e-dev/mobile'", "'go to General, then About'"],
} as const;

describe('hero terminal', { tags: ['landing'] }, () => {
  test.beforeEach(async ({ app, browser, screen }) => {
    await prepare(browser, 'dark');
    await app.open(landing());
    await expect(screen.getByRole('button', { name: 'checkout.e2e.ts', exact: true })).toBeVisible();
  });

  test('opens on checkout.e2e.ts with the whole example selectable as text', async ({ browser }) => {
    const selected = await browser.evaluate(() => {
      const code = document.querySelector("section [class*='min-h-[304px]']");
      const selection = window.getSelection();
      if (!code || !selection) return null;
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      return selection.toString();
    });
    expect(selected).toContain("import { test, expect } from 'e2e';\n\ntest('a member upgrades");
    expect(selected).toContain("await agent.assert('the invoice preview shows a prorated amount');");
    expect(selected).toContain("await expect(screen.getByRole('status')).toContainText('Pro');");
  });

  for (const [tab, lines] of Object.entries(tabs)) {
    test(`the ${tab} tab shows its example`, async ({ screen }) => {
      await screen.getByRole('button', { name: tab, exact: true }).tap();
      for (const line of lines) {
        await expect(screen.getByRole('main').getByText(line, { exact: false }).first()).toBeVisible();
      }
    });
  }

  test('switching tabs replaces the example', async ({ screen }) => {
    const checkout = screen.getByText("'upgrade the workspace to the Pro plan'", { exact: true });
    await expect(checkout).toBeVisible();
    await screen.getByRole('button', { name: 'todos.e2e.ts', exact: true }).tap();
    await expect(checkout).toBeHidden();
    await screen.getByRole('button', { name: 'checkout.e2e.ts', exact: true }).tap();
    await expect(checkout).toBeVisible();
  });

  test('hovering an API token shows its signature and closes on a tab switch', async ({ screen }) => {
    await screen.getByText('assert', { exact: true }).first().hover();
    const tooltip = screen.getByRole('tooltip');
    await expect(tooltip).toContainText('agent.assert(assertion: string, options?: AssertOptions): Promise<void>');
    await expect(tooltip).toContainText('Throws ASSERTION_FAILED on a false judgment.');
    await screen.getByRole('button', { name: 'mobile.e2e.ts', exact: true }).tap();
    await expect(tooltip).toBeHidden();
  });

  test('focusing an API token with the keyboard shows its docs too', async ({ browser, screen }) => {
    const focused = await browser.evaluate(() => {
      const token = [...document.querySelectorAll<HTMLElement>('main [tabindex="0"]')].find(
        (element) => element.textContent === 'act',
      );
      token?.focus();
      return token !== undefined;
    });
    expect(focused, 'agent.act is a focusable documented token').toBe(true);
    await expect(screen.getByRole('tooltip')).toContainText('agent.act');
  });
});
