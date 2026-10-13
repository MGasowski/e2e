import type { Browser } from '@e2e-dev/web';
import { expect } from 'e2e';

/**
 * Replaces the page's clipboard write so a copy lands on `body[data-copied]`,
 * where `toHaveAttribute` can wait for it; headless Chromium grants no
 * clipboard read. Call after the page loads; a navigation undoes it.
 */
export async function recordClipboard(browser: Browser) {
  await browser.evaluate(() => {
    const record = async (text: string) => {
      document.body.dataset.copied = text;
    };
    // `write` takes ClipboardItems (Mintlify's Copy page); keep their plain text.
    const write = async (items: ClipboardItem[]) => {
      const item = items.find((candidate) => candidate.types.includes('text/plain'));
      await record(item ? await (await item.getType('text/plain')).text() : '');
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: record, write } });
    // Some copy buttons still use the legacy command; record its selection.
    document.execCommand = ((command: string) => {
      if (command === 'copy') document.body.dataset.copied = window.getSelection()?.toString() ?? '';
      return true;
    }) as typeof document.execCommand;
    return null;
  });
}

export const expectCopied = (browser: Browser, text: string | RegExp) =>
  expect(browser.locator('body')).toHaveAttribute('data-copied', text);
