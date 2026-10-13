import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { docsPages, docsRedirects } from '../../support/docs-pages.ts';
import { docs, get } from '../../support/site.ts';
import { isDesktopTarget } from '../../support/stable.ts';

/** Fetches with a few concurrent requests at a time, so a check of every page stays quick without hammering the host. */
async function each<T, R>(items: readonly T[], run: (item: T) => Promise<R>, concurrency = 6): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await run(items[index]!);
      }
    }),
  );
  return results;
}

/** What crawlers and agents see of the docs: plain HTTP, the same at any size, so it runs on the desktop target. */
describe('docs over HTTP', { tags: ['docs', 'http'] }, () => {
  test.beforeEach(async ({ browser }) => {
    test.skip(!(await isDesktopTarget(browser)), 'HTTP checks run once, on desktop');
  });

  test('every page answers 200 with HTML', async () => {
    const failures = await each(docsPages, async (page) => {
      const response = await get(docs(page.slug));
      const type = response.headers.get('content-type') ?? '';
      return response.status === 200 && type.startsWith('text/html') ? null : `${page.slug || '/'}: ${response.status} ${type}`;
    });
    expect(failures.filter(Boolean)).toEqual([]);
  });

  test('every page has a markdown twin that starts with its title', async () => {
    const failures = await each(docsPages, async (page) => {
      const url = page.slug === '' ? `${docs()}/index.md` : `${docs(page.slug)}.md`;
      const response = await get(url);
      const body = await response.text();
      if (response.status !== 200) return `${url}: ${response.status}`;
      return body.includes(`# ${page.title}`) ? null : `${url}: no "# ${page.title}"`;
    });
    expect(failures.filter(Boolean)).toEqual([]);
  });

  test('llms.txt lists every page', async () => {
    const response = await get(`${docs()}/llms.txt`);
    expect(response.status).toBe(200);
    const body = await response.text();
    const missing = docsPages
      .filter((page) => page.slug !== '')
      .filter((page) => !body.includes(`${docs(page.source)}.md`) && !body.includes(`${docs(page.slug)}.md`))
      .map((page) => page.slug);
    expect(missing, 'pages llms.txt does not link').toEqual([]);
  });

  test('llms-full.txt carries every page title', async () => {
    const response = await get(`${docs()}/llms-full.txt`);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(docsPages.filter((page) => !body.includes(page.title)).map((page) => page.slug)).toEqual([]);
  });

  test('every old path redirects to its new page', async () => {
    const failures = await each(docsRedirects, async ({ source, destination }) => {
      const response = await get(docs(source));
      const landed = new URL(response.url);
      const wanted = new URL(docs(destination.split('#')[0] ?? ''));
      const same = landed.pathname.replace(/\/$/, '') === wanted.pathname.replace(/\/$/, '');
      return response.status === 200 && same ? null : `${source}: ${response.status} at ${landed.pathname}, want ${wanted.pathname}`;
    });
    expect(failures.filter(Boolean)).toEqual([]);
  });

  test('every page but the home page has its own social card, and each card loads', async () => {
    const failures = await each(docsPages, async (page) => {
      const html = await (await get(docs(page.slug))).text();
      const card = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/.exec(html)?.[1]?.replaceAll('&amp;', '&');
      if (card === undefined) return `${page.slug || '/'}: no og:image`;
      if (page.slug !== '' && !card.includes(`/images/og/${page.source}.png`)) return `${page.slug}: card ${card}`;
      const image = await get(card);
      const type = image.headers.get('content-type') ?? '';
      return image.status === 200 && type.startsWith('image/') ? null : `${card}: ${image.status} ${type}`;
    });
    expect(failures.filter(Boolean)).toEqual([]);
  });

  test('the sitemap lists every page', async () => {
    const response = await get(`${docs()}/sitemap.xml`);
    expect(response.status).toBe(200);
    const body = await response.text();
    const missing = docsPages.filter((page) => !body.includes(`<loc>${docs(page.slug)}</loc>`)).map((page) => page.slug || '/');
    expect(missing).toEqual([]);
  });

  test('an unknown page answers 404', async () => {
    const response = await get(docs('this-page-does-not-exist-e2e'));
    expect(response.status).toBe(404);
  });
});
