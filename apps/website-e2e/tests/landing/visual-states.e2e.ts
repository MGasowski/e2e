import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { landing } from '../../support/site.ts';
import { openStill, stabilize, viewportWidth } from '../../support/stable.ts';
import { compareViewport, scrollTo } from '../../support/visual.ts';
import { hideLiveContent } from './mask.ts';

/** The landing page after an interaction: what each control looks like opened, switched, or picked. */
describe('landing visuals: states', { tags: ['landing', 'visual'] }, () => {
  test.beforeEach(async ({ browser, screen }) => {
    await stabilize(browser, 'dark');
    await openStill(browser, landing());
    await expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    await hideLiveContent(browser);
  });

  for (const tab of ['todos.e2e.ts', 'mobile.e2e.ts']) {
    test(`hero terminal on ${tab}`, async ({ browser, screen }) => {
      await screen.getByRole('button', { name: tab, exact: true }).tap();
      await scrollTo(browser, { selector: 'button', text: 'checkout.e2e.ts', offset: 40 });
      await compareViewport(browser, screen, `landing-terminal-${tab.replace('.e2e.ts', '')}`);
    });
  }

  test('hero terminal hover docs', async ({ browser, screen }) => {
    await scrollTo(browser, { selector: 'button', text: 'checkout.e2e.ts', offset: 40 });
    await screen.getByText('assert', { exact: true }).first().hover();
    await expect(screen.getByRole('tooltip')).toBeVisible();
    await compareViewport(browser, screen, 'landing-terminal-tooltip');
  });

  for (const step of [0, 1, 2, 3, 4]) {
    test(`configurator step ${step + 1} centered`, async ({ browser, screen }) => {
      await scrollTo(browser, { selector: '[data-config-step]', block: 'center', ...nth(step) });
      await compareViewport(browser, screen, `landing-configurator-step-${step + 1}`);
    });
  }

  test('configurator with OpenRouter, Claude, a custom engine, and an edited URL', async ({ browser, screen }) => {
    await screen.getByRole('button', { name: 'OpenRouter', exact: true }).tap();
    await screen.getByRole('button', { name: 'Claude', exact: true }).tap();
    await screen.getByRole('textbox', { name: 'Edit url' }).first().fill('https://staging.example.test');
    await screen.getByRole('button', { name: 'Custom engine', exact: true }).tap();
    await screen.getByRole('button', { name: 'Copy config', exact: true }).first().hover();
    await browser.mouse.move(0, 0);
    await scrollTo(browser, { selector: '[data-config-step]', block: 'center', ...nth(4) });
    await compareViewport(browser, screen, 'landing-configurator-picked');
  });

  test('configurator on a subscription', async ({ browser, screen }) => {
    await screen.getByRole('button', { name: 'Subscription', exact: true }).tap();
    await scrollTo(browser, { selector: '[data-config-step]', block: 'center', ...nth(1) });
    await compareViewport(browser, screen, 'landing-configurator-subscription');
  });

  test('testimonials expanded', async ({ browser, screen }) => {
    await screen.getByRole('button', { name: /^Show more/ }).tap();
    await scrollTo(browser, { selector: 'h2', text: 'Loved by developers.', offset: 24 });
    await compareViewport(browser, screen, 'landing-testimonials-expanded');
  });

  test('testimonials expanded, at their end', async ({ browser, screen }) => {
    await screen.getByRole('button', { name: /^Show more/ }).tap();
    await scrollTo(browser, { selector: 'h2', text: 'Questions, answered.', offset: 0 });
    await browser.evaluate(() => {
      window.scrollBy({ top: -window.innerHeight, behavior: 'instant' });
      return null;
    });
    await compareViewport(browser, screen, 'landing-testimonials-expanded-end');
  });

  test('FAQ with the last question open', async ({ browser, screen }) => {
    await screen.getByRole('button', { name: 'What happens when a run fails?', exact: true }).tap();
    await scrollTo(browser, { selector: 'h2', text: 'Questions, answered.', offset: 24 });
    await compareViewport(browser, screen, 'landing-faq-last-open');
  });

  test('FAQ with every question closed', async ({ browser, screen }) => {
    await screen.getByRole('button', { name: 'Which AI models can I use?', exact: true }).tap();
    await scrollTo(browser, { selector: 'h2', text: 'Questions, answered.', offset: 24 });
    await compareViewport(browser, screen, 'landing-faq-closed');
  });

  test('mobile menu open', async ({ browser, screen }) => {
    test.skip((await viewportWidth(browser)) >= 640, 'the menu exists below 640px only');
    await screen.getByRole('button', { name: 'Open menu', exact: true }).tap();
    await expect(screen.getByRole('link', { name: 'Join community' })).toBeVisible();
    await compareViewport(browser, screen, 'landing-menu-open');
  });

  test('header link hover', async ({ browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 640, 'the header links are in the menu below 640px');
    await screen.getByRole('banner').getByRole('link', { name: 'Join community' }).hover();
    await compareViewport(browser, screen, 'landing-header-hover');
  });
});

/** Selects the nth `[data-config-step]` through its step tag (`01/05`…). */
function nth(index: number) {
  return { text: `0${index + 1}/05` };
}
