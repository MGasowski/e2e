import type { Browser } from '@e2e-dev/web';

export type ColorScheme = 'light' | 'dark';

interface PageSetup {
  readonly scheme: ColorScheme;
  /** Answer `prefers-reduced-motion` as set and stop videos, for screenshots. */
  readonly still: boolean;
}

/**
 * Init script that pins a page's color scheme, closes its cookie banner, and
 * with `still` holds it still. The engine emulates neither
 * `prefers-reduced-motion` nor `prefers-color-scheme`, so `matchMedia`
 * answers both as set: a theme that follows the OS (Mintlify's `system`
 * default) follows the pinned scheme, and script-driven motion (reveals,
 * parallax, canvases that honor reduced motion) stays put. Every video stops
 * on its first frame. Runs in the page, so it closes over nothing.
 */
function setUpPage({ scheme, still }: PageSetup) {
  const matchMedia = window.matchMedia.bind(window);
  const always = '(min-width: 0px)';
  const never = '(max-width: 0px)';
  window.matchMedia = (query: string) => {
    let pinned = query
      .replace(/\(prefers-color-scheme:\s*dark\)/g, scheme === 'dark' ? always : never)
      .replace(/\(prefers-color-scheme:\s*light\)/g, scheme === 'light' ? always : never);
    if (still) {
      pinned = pinned
        .replace(/\(prefers-reduced-motion(:\s*reduce)?\)/g, always)
        .replace(/\(prefers-reduced-motion:\s*no-preference\)/g, never);
    }
    return matchMedia(pinned);
  };
  try {
    // next-themes (Mintlify) reads its stored choice before matchMedia.
    localStorage.setItem('theme', scheme);
    localStorage.setItem('isDarkMode', scheme === 'dark' ? 'dark' : 'light');
    // Both sites ask for cookie consent through c15t, the docs to everyone and
    // the landing page to EU visitors only, so a run from Europe would see a
    // banner CI never does. A stored "necessary only" answer keeps it closed.
    if (localStorage.getItem('c15t') === null) {
      localStorage.setItem(
        'c15t',
        JSON.stringify({
          consents: { necessary: true, functionality: false, measurement: false, experience: false, marketing: false },
          consentInfo: { time: Date.now() },
        }),
      );
    }
  } catch {
    // Storage can be denied on an opaque origin such as about:blank.
  }
  if (!still) return;
  document.addEventListener(
    'play',
    (event) => {
      const media = event.target as HTMLMediaElement;
      media.pause();
      media.currentTime = 0;
    },
    true,
  );
  // Smooth scrolling would leave a screenshot mid-scroll.
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = 'html{scroll-behavior:auto!important}';
    document.head.append(style);
  });
}

/**
 * Hosts a page may load from: the site itself (`*.tester.army` covers the
 * landing page and the docs, `localhost` a website/ build), the CDNs Mintlify
 * serves the docs' scripts, styles, and assets from, and the font hosts. Every
 * image is admitted too, since images are page content. Everything else
 * (analytics, pixels, chat widgets, the live GitHub star count Mintlify
 * fetches) is aborted, so a screenshot shows what the site renders, not
 * what a third party answered this time.
 */
const ALLOWED_HOSTS = [
  /(^|\.)tester\.army$/,
  /^localhost$/,
  /^127\.0\.0\.1$/,
  /(^|\.)mintlify\.(app|com)$/,
  /(^|\.)mintcdn\.com$/,
  /^mintlify\.s3[.-][a-z0-9-]*\.?amazonaws\.com$/,
  /^mintlify-assets\.b-cdn\.net$/,
  /^fonts\.(googleapis|gstatic)\.com$/,
];

const allowed = (url: string, accept: string | undefined) => {
  if (accept?.startsWith('image/')) return true;
  const { hostname, protocol } = new URL(url);
  if (protocol === 'data:' || protocol === 'blob:') return true;
  return ALLOWED_HOSTS.some((host) => host.test(hostname));
};

/** Aborts third-party requests (see `ALLOWED_HOSTS`). Call before the first `app.open`. */
async function blockThirdParties(browser: Browser) {
  await browser.route(/.*/, (route) =>
    allowed(route.request.url, route.request.headers.accept) ? route.fallback() : route.abort(),
  );
}

/**
 * Pins the color scheme, keeps the cookie banner closed, and blocks third
 * parties, for functional tests. Call before the first `app.open`.
 */
export async function prepare(browser: Browser, scheme: ColorScheme = 'light') {
  await browser.addInitScript(setUpPage, { scheme, still: false });
  await blockThirdParties(browser);
}

/** `prepare`, and holds the page still for screenshots (see `setUpPage`). Call before the first `app.open`. */
export async function stabilize(browser: Browser, scheme: ColorScheme = 'light') {
  await browser.addInitScript(setUpPage, { scheme, still: true });
  await blockThirdParties(browser);
}

/**
 * Loads every font face the page declares, then waits for them. `fonts.ready`
 * alone settles before a face is first used: a face only text in a
 * pseudo-element or a late-rendered widget needs (the docs' DM Mono "Start
 * testing" button) would otherwise swap in after a screenshot was taken.
 */
export async function fontsReady(browser: Browser) {
  await browser.evaluate(async () => {
    await Promise.all([...document.fonts].map((face) => face.load().catch(() => null)));
    await document.fonts.ready;
    return null;
  });
}

/**
 * Scrolls instantly to a fraction of the page's scrollable height and waits
 * until the page stays there for a few frames, re-scrolling when a late
 * layout shift or hydration moves it.
 */
export async function scrollToFraction(browser: Browser, fraction: number) {
  await browser.evaluate(async (at) => {
    const wait = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 100)));
    let held = 0;
    for (let attempt = 0; attempt < 60 && held < 3; attempt++) {
      const top = Math.round((document.documentElement.scrollHeight - window.innerHeight) * at);
      if (Math.round(window.scrollY) === top) {
        held++;
      } else {
        held = 0;
        window.scrollTo({ top, behavior: 'instant' });
      }
      await wait();
    }
    return null;
  }, fraction);
}

/**
 * Opens a page for a screenshot: waits for the network to go quiet, so
 * hydration, lazy chunks, and web fonts have landed before anything is
 * compared, then for the fonts themselves.
 */
export async function openStill(browser: Browser, url: string) {
  await browser.goto(url, { waitUntil: 'networkidle' });
  await fontsReady(browser);
}

/** Horizontal overflow in CSS pixels; 0 means nothing pokes out sideways. */
export const horizontalOverflow = (browser: Browser) =>
  browser.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Images that finished loading with no pixels: a broken `src`. Lazy images not yet requested are skipped. */
export const brokenImages = (browser: Browser) =>
  browser.evaluate(() =>
    [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0 && image.currentSrc !== '')
      .map((image) => image.currentSrc),
  );

/**
 * The viewport width, for tests that only apply above or below a breakpoint.
 * A test has no target name to read, so this measures the page, opening a
 * blank one first when none is open yet.
 */
export async function viewportWidth(browser: Browser): Promise<number> {
  try {
    return await browser.evaluate(() => window.innerWidth);
  } catch {
    // No page is open yet; the viewport is the same on a blank one.
    await browser.goto('about:blank');
    return browser.evaluate(() => window.innerWidth);
  }
}

/** True on the desktop target. Tests that only make HTTP requests look the same at any size, so they run once. */
export const isDesktopTarget = async (browser: Browser) => (await viewportWidth(browser)) >= 1024;
