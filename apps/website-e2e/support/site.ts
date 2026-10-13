/**
 * The two sites under test. Both default to production; point them at a
 * website/ build (`E2E_LANDING_URL=http://localhost:3000`,
 * `E2E_DOCS_URL=http://localhost:3000/docs`) to check how far a migration
 * matches what it replaces.
 *
 * A base URL keeps its path (`/e2e`, `/docs`), which WHATWG resolution drops
 * for a path like `/quickstart`, so every test builds absolute URLs here.
 */
function base(name: string, fallback: string): URL {
  const raw = process.env[name]?.trim() || fallback;
  const url = new URL(raw);
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

export const landingBase = base('E2E_LANDING_URL', 'https://tester.army/e2e');
const docsBase = base('E2E_DOCS_URL', 'https://e2e.tester.army/docs');

function join(root: URL, path: string): string {
  const [pathname = '', rest = ''] = path.split(/(?=[?#])/, 2);
  const tail = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  return `${root.origin}${root.pathname}${tail === '' ? '' : `/${tail}`}${rest}`;
}

/** The landing page, or a path below it (`landing('#faq')`). */
export const landing = (path = ''): string => join(landingBase, path);

/** A docs page by its docs.json slug (`docs('reference/cli')`); `index` and `''` are the home page. */
export const docs = (slug = ''): string => join(docsBase, slug === 'index' ? '' : slug);

/** Matches the docs page URL exactly, with or without a trailing slash, query, or hash. */
export const docsUrlPattern = (slug: string): RegExp =>
  new RegExp(`^${escape(docs(slug))}/?(?:[?#].*)?$`);

/** Same for the landing page. */
export const landingUrlPattern = (path = ''): RegExp =>
  new RegExp(`^${escape(landing(path))}/?(?:[?#].*)?$`);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A header that lets the suite past the site's bot protection, as
 * `E2E_BYPASS_HEADER="Name: value"`. tester.army sits behind Vercel's
 * firewall, which challenges a headless browser that loads many pages
 * quickly, and the challenge fails under automation. Pair it with a firewall
 * rule that bypasses on that header, or use Vercel's
 * `x-vercel-protection-bypass` secret. The browser sends it to the landing
 * page's site only (subdomains included); `get` sends it on plain requests.
 */
export const bypassHeaders: Readonly<Record<string, string>> = (() => {
  const raw = process.env.E2E_BYPASS_HEADER?.trim();
  if (!raw) return {};
  const separator = raw.indexOf(':');
  if (separator <= 0) throw new Error('E2E_BYPASS_HEADER must read "Name: value"');
  return { [raw.slice(0, separator).trim()]: raw.slice(separator + 1).trim() };
})();

/** `fetch` with the bypass header, for checks that need no browser. */
export const get = (url: string, init: RequestInit = {}) =>
  fetch(url, { ...init, headers: { ...bypassHeaders, ...(init.headers as Record<string, string> | undefined) } });

/** Where the landing page's out-links point. These are content, not configuration, so they stay pinned. */
export const links = {
  github: 'https://github.com/tester-army/e2e',
  docs: 'https://e2e.tester.army/docs',
  initCommand: 'npx e2e@latest init',
  skillCommand: 'npx skills add tester-army/e2e',
  changelog: 'https://github.com/tester-army/e2e/blob/main/packages/e2e/CHANGELOG.md',
  linkedin: 'https://www.linkedin.com/company/testerarmy',
  x: 'https://x.com/testerarmy',
} as const;
