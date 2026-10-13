# @e2e-dev/website

The e2e site: the landing page at `/e2e` and the documentation under `/docs`.
It replaces the Mintlify docs (`docs/`, published at https://e2e.tester.army/docs)
and the landing page in the Tester Army app (https://tester.army/e2e).

```bash
pnpm --filter @e2e-dev/website dev     # http://localhost:3000/docs
pnpm --filter @e2e-dev/website build
```

## Where things come from

- **The docs pages stay Markdown in `docs/`.** The site reads `docs/docs.json`
  (tabs, groups, page order, redirects, the sidebar promo, footer links) and
  every page's `.mdx` at build time. Adding or editing a page needs no change
  here. `lib/docs/source.ts` reads them, `lib/docs/render.ts` compiles a page
  with MDX, and `lib/docs/remark-docs.ts` adapts it: root-relative links gain
  `/docs`, headings get ids for the table of contents, and code fences are
  highlighted with Shiki in both themes at build time.
- **Mintlify's components** (`Card`, `CardGroup`, `CodeGroup`, `Tabs`, `Steps`,
  `Accordion`, `Note`, `Warning`, `Prompt`, …) are in `components/docs/mdx/`,
  mapped to their tags in `components/docs/mdx/index.tsx`.
- **The docs snippets** (`docs/snippets/*.jsx`) are copied into
  `components/docs/snippets/` by `scripts/sync-docs.mjs`, which `dev` and
  `build` run first, with the React imports Mintlify supplies as globals.
  The same script copies `docs/images` and the logos into `public/docs/` and
  lists the page paths for `proxy.ts`. All three outputs are gitignored.
- **The landing page** is `components/landing/e2e/`, ported from the Tester
  Army app (`apps/website/components/landing/e2e`), with its analytics on the
  docs' PostHog project and the GitHub star count fetched without the app's
  GitHub App. Keep it in step with the app's `main`.

## What the site serves

| Path | |
|---|---|
| `/e2e` | The landing page. `/e2e.md` is its markdown twin. |
| `/docs/<page>` | A docs page, prerendered. `/docs` is the introduction. |
| `/docs/<page>.md`, `/docs/index.md` | The page as markdown, for agents and "Copy page". |
| `/docs/llms.txt`, `/docs/llms-full.txt` | Every page, linked or in full. |
| `/docs/sitemap.xml`, `/robots.txt` | |
| `/docs/search.json` | The search dialog's index, every page and `##`/`###` section. |
| `/docs/images/…` | The docs' images and social cards. |
| `/` | Redirects to `/docs`. `/discord` redirects to the invite. |

`proxy.ts` sends a page's markdown twin to a request whose Accept header
prefers markdown, or that comes from a known AI fetcher, and answers an
unknown docs path with a 404 before rendering starts. The old Mintlify paths
in `docs.json` `redirects` redirect permanently (`next.config.ts`).

## Testing

`apps/website-e2e` holds the functional and visual suites for both pages,
at desktop and phone sizes. Point them at a production build:

```bash
cd website && SITE_URL=http://127.0.0.1:3200 pnpm build
./node_modules/.bin/next start --hostname 0.0.0.0 --port 3200

cd apps/website-e2e
E2E_LANDING_URL=http://127.0.0.1:3200/e2e E2E_DOCS_URL=http://127.0.0.1:3200/docs pnpm test
E2E_LANDING_URL=http://127.0.0.1:3200/e2e E2E_DOCS_URL=http://127.0.0.1:3200/docs pnpm test:visual
```

`SITE_URL` makes the absolute URLs in the pages' metadata point at the local
server; without it they point at https://e2e.tester.army.
