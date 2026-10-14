import type { Browser } from '@e2e-dev/web';

/**
 * Hides what changes between two loads of the landing page, before a
 * screenshot:
 * - The particle canvases (fireflies, the dithered hero fade, button dust,
 *   the footer wordmark) draw every frame with random jitter. The fireflies
 *   cover the whole viewport, so a mask would paint over the page.
 * - The live GitHub star count. A local build without GitHub credentials
 *   renders the button without it, so the count is removed rather than
 *   masked, and both lay out the same header.
 * - Time-boxed promos (the live-session banner), which come and go with their
 *   campaign; the app's own visual suite hides them the same way.
 */
export async function hideLiveContent(browser: Browser) {
  await browser.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = [
      'canvas{visibility:hidden!important}',
      'header a[href="https://github.com/tester-army/e2e"] .tabular-nums{display:none!important}',
      '[data-floating-promo]{display:none!important}',
    ].join('\n');
    document.head.append(style);
    return null;
  });
}
