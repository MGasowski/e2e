import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { landing, links } from '../../support/site.ts';
import { prepare, viewportWidth } from '../../support/stable.ts';

const features: [string, string][] = [
  ["Don't make AI think twice.", 'Replay compatible cached actions without unnecessary model calls.'],
  ['Goals, not scripts.', 'Describe your testing goals in plain language. Let your agent handle the actions.'],
  ['Exact when it matters.', 'Combine AI-driven actions with precise locators and deterministic assertions.'],
  ['Your AI. Your choice.', 'Choose your preferred AI model and customize your testing agent.'],
  ['One API. Multiple environments.', 'Test web and mobile applications through one shared API.'],
  ['Bring your own engine.', 'Extend the framework with your own execution backend.'],
];

const faq = [
  'Which AI models can I use?',
  'Can the model see my secrets?',
  'Does it test mobile apps?',
  'Does it run in CI?',
  'Can I migrate from another framework?',
  'What happens when a run fails?',
];

describe('landing sections', { tags: ['landing'] }, () => {
  test.beforeEach(async ({ app, browser, screen }) => {
    await prepare(browser, 'dark');
    await app.open(landing());
    await expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Why e2e makes the replay case', async ({ screen }) => {
    for (const text of [
      'Most AI tests start from scratch.',
      "e2e remembers your agent's actions",
      'without calling the model again.',
      'Fewer tokens. Lower costs.',
    ]) {
      await expect(screen.getByText(text, { exact: false }).first()).toBeAttached();
    }
  });

  test('Core features lists all six with their descriptions', async ({ screen }) => {
    await expect(screen.getByRole('heading', { level: 2, name: 'AI where it helps. Code where it counts.' })).toBeAttached();
    for (const [title, description] of features) {
      await expect(screen.getByRole('heading', { level: 3, name: title })).toBeAttached();
      await expect(screen.getByText(description, { exact: true })).toBeAttached();
    }
  });

  test('section labels are numbered in order', async ({ browser }) => {
    const labels = await browser.evaluate(() =>
      [...document.body.innerText.matchAll(/\[0(\d)\]/g)].map(([label]) => label),
    );
    expect(labels).toEqual(['[01]', '[02]', '[03]', '[04]', '[05]']);
  });

  test('testimonials link to their posts and Show more reveals the rest', async ({ browser, screen }) => {
    const posts = screen.getByRole('list', { name: 'Posts about e2e on X' });
    await expect.poll(() => posts.getByRole('link').count()).toBe(9);
    const rauch = posts.getByRole('link', { name: /Guillermo Rauch/ });
    await expect(rauch).toHaveAttribute('href', 'https://x.com/rauchg/status/2105723481413550427');
    await expect(rauch).toHaveAttribute('target', '_blank');
    for (const href of await browser.evaluate(() =>
      [...document.querySelectorAll('ul[aria-label="Posts about e2e on X"] a')].map((a) => a.getAttribute('href') ?? ''),
    )) {
      expect(href).toMatch(/^https:\/\/x\.com\/[\w]+\/status\/\d+$/);
    }

    const showMore = screen.getByRole('button', { name: /^Show more/ });
    await expect(showMore).toHaveAttribute('aria-expanded', 'false');
    const hidden = Number((await showMore.textContent())?.match(/\((\d+)\)/)?.[1]);
    expect(hidden).toBeGreaterThan(0);
    await showMore.scrollIntoView();
    await showMore.tap();
    await expect(posts.getByRole('link')).toHaveCount(9 + hidden);
    await expect(screen.getByRole('button', { name: /^Show more/ })).toBeHidden();
    const focused = await browser.evaluate(() => document.activeElement?.getAttribute('href') ?? null);
    expect(focused).toBe('https://x.com/CarlosBeneyto/status/2105740346374140145');
  });

  test('translated testimonials say so, and the Arabic one reads right to left', async ({ browser, screen }) => {
    await screen.getByRole('button', { name: /^Show more/ }).tap();
    await expect(screen.getByText(/^Translated from Spanish$/).first()).toBeAttached();
    await expect(screen.getByText(/^Translated from Arabic$/).first()).toBeAttached();
    const rtl = await browser.evaluate(
      () => document.querySelectorAll('ul[aria-label="Posts about e2e on X"] [dir="rtl"]').length,
    );
    expect(rtl).toBeGreaterThan(0);
  });

  test('the FAQ lists every question with the first open', async ({ screen }) => {
    for (const [index, question] of faq.entries()) {
      await expect(screen.getByRole('button', { name: question, exact: true })).toHaveAttribute(
        'aria-expanded',
        index === 0 ? 'true' : 'false',
      );
    }
    const docsLink = screen.getByRole('link', { name: 'Read the docs' });
    await expect(docsLink).toHaveAttribute('href', links.docs);
    await expect(docsLink).toHaveAttribute('target', '_blank');
  });

  for (const question of faq.slice(1)) {
    test(`opening "${question}" closes the others`, async ({ screen }) => {
      const item = screen.getByRole('button', { name: question, exact: true });
      await item.scrollIntoView();
      await item.tap();
      await expect(item).toHaveAttribute('aria-expanded', 'true');
      for (const other of faq.filter((candidate) => candidate !== question)) {
        await expect(screen.getByRole('button', { name: other, exact: true })).toHaveAttribute('aria-expanded', 'false');
      }
    });
  }

  test('an open FAQ item closes again', async ({ screen }) => {
    const first = screen.getByRole('button', { name: faq[0]!, exact: true });
    await first.scrollIntoView();
    await first.tap();
    await expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  test('on mobile the menu opens with the docs and community links and closes', async ({ browser, screen }) => {
    test.skip((await viewportWidth(browser)) >= 640, 'the menu exists below 640px only');
    const open = screen.getByRole('button', { name: 'Open menu', exact: true });
    await expect(open).toHaveAttribute('aria-expanded', 'false');
    await open.tap();
    await expect(screen.getByRole('button', { name: 'Close menu', exact: true })).toHaveAttribute('aria-expanded', 'true');
    const docsLink = screen.getByRole('link', { name: 'docs', exact: true });
    await expect(docsLink).toHaveAttribute('href', links.docs);
    const community = screen.getByRole('link', { name: 'Join community' });
    await expect(community).toHaveAttribute('href', '/discord');
    await expect(community).toHaveAttribute('target', '_blank');
    await screen.getByRole('button', { name: 'Close menu', exact: true }).tap();
    await expect(screen.getByRole('link', { name: 'Join community' })).toBeHidden();
  });

  test('on desktop there is no menu button', async ({ browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 640, 'the menu exists below 640px');
    await expect(screen.getByRole('button', { name: 'Open menu', exact: true })).toBeHidden();
  });
});
