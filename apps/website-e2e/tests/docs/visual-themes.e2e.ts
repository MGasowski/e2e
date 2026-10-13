import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { docsMask, openDocsStill } from '../../support/docs-suite.ts';
import { compareScreens, slugName } from '../../support/visual.ts';

/**
 * The docs follow the reader's OS theme, so dark mode is half of what they
 * look like. These pages cover each kind of content in dark: prose and cards,
 * steps and tabs, tables, a long reference, and the examples gallery.
 */
const pages = ['', 'quickstart', 'core-concepts', 'models', 'reference/expect', 'reference/config', 'example-projects'];

describe('docs visuals: dark', { tags: ['docs', 'visual'] }, () => {
  for (const slug of pages) {
    test(`/${slug} in dark`, async ({ browser, screen }) => {
      await openDocsStill(browser, slug, 'dark');
      await expect.poll(() => browser.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
      await compareScreens(browser, screen, `docs-dark-${slugName(slug)}`, { at: ['top', 'middle'], mask: docsMask(browser) });
    });
  }
});
