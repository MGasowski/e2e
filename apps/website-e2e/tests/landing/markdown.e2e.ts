import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { get, landing, links } from '../../support/site.ts';
import { isDesktopTarget, prepare } from '../../support/stable.ts';

const browserAccept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

/**
 * Agents read the landing page as markdown. These checks make plain HTTP
 * requests and look the same at any size, so they run on the desktop target.
 */
describe('landing page for agents', { tags: ['landing', 'markdown'] }, () => {
  test.beforeEach(async ({ browser }) => {
    test.skip(!(await isDesktopTarget(browser)), 'HTTP checks run once, on desktop');
  });

  test('advertises its markdown twin', async ({ app, browser }) => {
    await prepare(browser);
    await app.open(landing());
    await expect(browser.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute('href', /\.md$/);
  });

  test('the markdown twin carries the setup commands and the docs index', async () => {
    const response = await get(`${landing()}.md`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    const body = await response.text();
    expect(body).toContain(links.skillCommand);
    expect(body).toContain(links.initCommand);
    expect(body).toContain(`${links.docs}/llms.txt`);
    expect(body).toMatch(/^# /m);
  });

  test('Accept: text/markdown gets markdown', async () => {
    const response = await get(landing(), { headers: { accept: 'text/markdown' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await response.text()).toContain(links.initCommand);
  });

  test('AI fetchers get markdown despite a browser Accept header', async () => {
    const response = await get(landing(), {
      headers: {
        accept: browserAccept,
        'user-agent': 'Claude-User (claude-code/2.1.0; +https://support.anthropic.com/)',
      },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('vary')).toMatch(/\bUser-Agent\b/i);
  });

  test('search crawlers and browsers keep HTML', async () => {
    for (const userAgent of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    ]) {
      const response = await get(landing(), { headers: { accept: browserAccept, 'user-agent': userAgent } });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    }
  });
});
