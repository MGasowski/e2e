import type { Browser } from '@e2e-dev/web';

/**
 * The particle canvases (fireflies, the dithered hero fade, button dust, the
 * footer wordmark) draw every frame with random jitter. The fireflies cover
 * the whole viewport, so a mask would paint over the page; they are hidden
 * instead, and the screenshots show the page without its particles.
 */
export async function hideCanvases(browser: Browser) {
  await browser.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = 'canvas{visibility:hidden!important}';
    document.head.append(style);
    return null;
  });
}

/** The live GitHub star count in the header. */
export const landingMask = (browser: Browser) => [
  browser.locator('header a[href="https://github.com/tester-army/e2e"] .tabular-nums'),
];
