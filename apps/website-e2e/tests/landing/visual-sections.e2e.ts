import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { landing } from '../../support/site.ts';
import { openStill, stabilize } from '../../support/stable.ts';
import { compareScreens, compareViewport, scrollTo, type ScrollTarget } from '../../support/visual.ts';
import { hideCanvases, landingMask } from './mask.ts';

/**
 * Every section of the landing page as it first renders, one viewport each,
 * on both targets. A section starts 24px below the viewport top so its
 * heading never sits under the edge.
 */
const sections: [name: string, target: ScrollTarget][] = [
  ['why', { selector: 'p', text: 'Most AI tests start from scratch.', offset: 120 }],
  ['configurator', { selector: 'h2', text: 'Your testing stack. Your call.', offset: 24 }],
  ['features', { selector: 'h2', text: 'AI where it helps. Code where it counts.', offset: 24 }],
  ['testimonials', { selector: 'h2', text: 'Loved by developers.', offset: 24 }],
  ['faq', { selector: 'h2', text: 'Questions, answered.', offset: 24 }],
  ['footer', { selector: 'footer', offset: 0 }],
];

describe('landing visuals: sections', { tags: ['landing', 'visual'] }, () => {
  test.beforeEach(async ({ browser, screen }) => {
    await stabilize(browser, 'dark');
    await openStill(browser, landing());
    await expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    await hideCanvases(browser);
  });

  test('hero', async ({ browser, screen }) => {
    await compareScreens(browser, screen, 'landing-hero', { mask: landingMask(browser) });
  });

  test('the page at its middle and end', async ({ browser, screen }) => {
    await compareScreens(browser, screen, 'landing-page', { at: ['middle', 'end'], mask: landingMask(browser) });
  });

  for (const [name, target] of sections) {
    test(`${name} section`, async ({ browser, screen }) => {
      await scrollTo(browser, target);
      await compareViewport(browser, screen, `landing-${name}`, landingMask(browser));
    });
  }
});
