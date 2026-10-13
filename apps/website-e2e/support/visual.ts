import type { Browser } from '@e2e-dev/web';
import { expect, type Locator, type Screen } from 'e2e';
import { fontsReady, scrollToFraction } from './stable.ts';

/**
 * A stored screenshot is one viewport (the engine has no full-page capture),
 * so a long page is compared at a few scroll positions that stand in for it.
 */
const positions = {
  top: 0,
  middle: 0.5,
  end: 1,
} as const;

export type Position = keyof typeof positions;

export interface CompareOptions {
  /** Content that changes between runs, painted over before comparing. */
  readonly mask?: readonly Locator[];
  /** Scroll positions to compare at; default the top only. */
  readonly at?: readonly Position[];
}

/**
 * Glyph antialiasing differs by scattered edge pixels between two loads of
 * the same page, most under parallel load: up to 0.034% of a text-heavy docs
 * frame in practice. 0.05% (720 pixels of a 1440x1000 frame, 165 of a phone
 * frame) absorbs that and still catches a moved block, a restyled
 * component, or a reflowed line, which differ by thousands. A one-letter
 * change can slip under it; the functional tests pin the copy itself.
 */
const tolerance = { maxDiffPixelRatio: 0.0005 } as const;

/** Compares the viewport at each position against `<name>-<position>.png`. */
export async function compareScreens(browser: Browser, screen: Screen, name: string, options: CompareOptions = {}) {
  await fontsReady(browser);
  for (const position of options.at ?? ['top']) {
    await scrollToFraction(browser, positions[position]);
    await expect(screen).toHaveScreenshot(`${name}-${position}.png`, {
      ...tolerance,
      mask: [...(options.mask ?? [])],
    });
  }
}

/** Compares the viewport as it stands, without scrolling, against `<name>.png`. */
export async function compareViewport(browser: Browser, screen: Screen, name: string, mask: readonly Locator[] = []) {
  await fontsReady(browser);
  await expect(screen).toHaveScreenshot(`${name}.png`, { ...tolerance, mask: [...mask] });
}

export interface ScrollTarget {
  /** CSS selector of the candidates. */
  readonly selector: string;
  /** Picks the first candidate whose text contains this; default the first candidate. */
  readonly text?: string;
  /** Where the element lands: its top at the viewport top (minus `offset`), or centered. */
  readonly block?: 'start' | 'center';
  /** Pixels left above the element with `block: 'start'`, for a sticky header. */
  readonly offset?: number;
}

/**
 * Scrolls instantly to an element and waits until it stays there: a late
 * hydration or layout shift can move the page after the scroll, which would
 * store the wrong part of it. Throws when nothing matches, so a renamed
 * section fails loudly.
 */
export async function scrollTo(browser: Browser, target: ScrollTarget) {
  const outcome = await browser.evaluate(
    async ({ selector, text, block, offset }) => {
      const find = () =>
        [...document.querySelectorAll(selector)].find(
          (candidate) => text === null || (candidate.textContent ?? '').includes(text),
        );
      const wait = (ms: number) => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, ms)));
      /** Where the page should be scrolled for the element to sit at its spot, clamped to the scroll range. */
      const wanted = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const top =
          block === 'center'
            ? rect.top + window.scrollY - (window.innerHeight - rect.height) / 2
            : rect.top + window.scrollY - offset;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return Math.round(Math.max(0, Math.min(top, max)));
      };
      let held = 0;
      for (let attempt = 0; attempt < 60 && held < 3; attempt++) {
        const element = find();
        if (!element) return 'missing';
        const top = wanted(element);
        if (Math.round(window.scrollY) === top) {
          held++;
        } else {
          held = 0;
          window.scrollTo({ top, behavior: 'instant' });
        }
        await wait(100);
      }
      return held >= 3 ? 'ok' : 'unsettled';
    },
    { selector: target.selector, text: target.text ?? null, block: target.block ?? 'start', offset: target.offset ?? 0 },
  );
  const label = `${target.selector}${target.text ? ` "${target.text}"` : ''}`;
  if (outcome === 'missing') throw new Error(`nothing to scroll to: ${label}`);
  if (outcome === 'unsettled') throw new Error(`the page kept moving away from ${label}`);
}

/** Turns a docs slug into a screenshot name: `''` is `home`, slashes become hyphens. */
export const slugName = (slug: string) => (slug === '' ? 'home' : slug.replaceAll('/', '-'));
