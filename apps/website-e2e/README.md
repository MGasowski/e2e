# @e2e-dev/website-e2e

Functional and visual suites for `website/`: the e2e landing page and the
docs. They began as the safety net for moving the landing page (in the
Tester Army app, at https://tester.army/e2e) and the Mintlify docs (`docs/`,
at https://e2e.tester.army/docs) into `website/`, and pinned down what those
sites showed and did; `website/` now passes them.

- The functional suite passes against `website/`, the Tester Army app, and
  Mintlify alike.
- The landing baselines match both the Tester Army app and `website/`, which
  renders the same page.
- The docs baselines are `website/`'s design. Mintlify's look differs, so
  its screenshots no longer match.

## Layout

- `tests/landing/`: the landing page. Functional tests cover the metadata,
  header, hero, terminal tabs and hover docs, every configurator path
  (with the exact config each one copies), testimonials, FAQ, footer, the
  mobile menu, the markdown twin agents fetch, and the live-session pages
  under `/e2e/sessions` (`sessions`). `visual-sections` compares
  every section; `visual-states` compares the page after each interaction.
- `tests/docs/`: the docs.
  - `pages-*`: one test per page. Each checks the title, description, every
    `##` heading in order, its navigation entry, Previous/Next, layout
    overflow, and broken images.
  - `http`: status codes, markdown twins, `llms.txt`, redirects, social
    cards, the sitemap, and the 404 page.
  - `navigation` and `interactions`: the sidebar, tabs, search, theme,
    copy buttons, code groups, accordions, the page menu, the provider
    picker, and the mobile menu.
  - `visual-pages-*`: every page's first screen, plus the middle and end of
    the key pages.
  - `visual-themes`: dark mode.
  - `visual-states`: opened menus and switched controls.
- `support/docs-pages.ts`: every docs page with its title, description, and
  headings, generated from `docs/docs.json` by `pnpm sync:docs`. It is
  committed so the suite keeps its expectations after `docs/` is retired.
  `tests/docs/inventory.e2e.ts` fails while the two disagree.
- `support/site.ts`: where the sites are. Both default to production;
  `website-e2e.yml` points them at a build of the checkout.

Every test runs at 1440×1000 (`desktop`) and 390×844 (`mobile`). Tests look
the page up by role, label, and text, not Mintlify's markup, so the same
suite applies to `website/`.

## Running

```bash
pnpm run build                                  # from the repo root: the suite runs the built packages
pnpm --filter @e2e-dev/website-e2e test         # functional
pnpm --filter @e2e-dev/website-e2e test:visual  # visual, in Linux (see below)
```

Point either at a `website/` production build (the landing URL needs its
`/e2e` path; the tests build its markdown twin by adding `.md`):

```bash
cd website && SITE_URL=http://127.0.0.1:3200 pnpm build
./node_modules/.bin/next start --hostname 0.0.0.0 --port 3200 &
cd ../apps/website-e2e
E2E_LANDING_URL=http://127.0.0.1:3200/e2e E2E_DOCS_URL=http://127.0.0.1:3200/docs pnpm test
```

A red test on `website/` is a regression, or an intended change. For an
intended change, update the test or the baseline in the same pull request
that makes it.

## Visual baselines

Baselines are Linux screenshots (`tests/**/<file>-snapshots/<name>-<target>-linux.png`),
because that is what CI runs and font rendering differs by OS.
`test:visual` runs the suite on Linux directly. Anywhere else it runs it in
Playwright's Linux image (`linux/amd64`, like CI) through Docker, and copies
the screenshots back. Add `-u` to write new or changed baselines, then look
at every changed image before committing it. Diffs land in `.linux/.e2e/results/`.

What the comparisons hold still:
- Reduced motion is forced, videos stop on their first frame, and the
  landing page's particle canvases are hidden.
- The live GitHub star count and the live-session banner are removed; videos, the YouTube thumbnail, and
  the docs promo card are masked.
- Third-party scripts are blocked, the theme is pinned, and the cookie banner
  is answered before it shows.

## Bot protection and a local landing page

tester.army sits behind Vercel's firewall. A headless browser that loads a
few hundred pages quickly gets a challenge it cannot pass, and the landing
tests fail at their first assertion. Run them against a local production
build of the Tester Army app instead. It needs no database or keys for `/e2e`;
placeholders satisfy the build:

```bash
# in a worktree of tester-army/app at origin/main, with no .env file
cd apps/website
export NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_E2E=1 NEXT_PUBLIC_PREVIEW_BUILD=1 \
  DATABASE_URL=postgresql://e2e:e2e@127.0.0.1:1/e2e BASE_URL=http://127.0.0.1:4390 \
  NEXTAUTH_URL=http://127.0.0.1:4390 AUTH_SECRET=e2e-local-auth-secret-0123456789abcdef0123456789abcdef \
  WORKOS_API_KEY=sk_test_e2e WORKOS_CLIENT_ID=client_e2e \
  WORKOS_COOKIE_PASSWORD=e2e-cookie-password-0123456789abcdef0123 \
  NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://127.0.0.1:4390/callback STRIPE_SECRET_KEY=sk_test_e2e_unused \
  CREDENTIALS_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
./node_modules/.bin/next build && ./node_modules/.bin/next start --hostname 0.0.0.0 --port 4390

# here
E2E_LANDING_URL=http://127.0.0.1:4390/e2e pnpm test tests/landing
E2E_LANDING_URL=http://127.0.0.1:4390/e2e pnpm test:visual tests/landing
```

`test:visual` forwards the port into its Linux container, so the URL works
unchanged there. Bind to `0.0.0.0` so the container can reach the server.
Without GitHub credentials the build hides the header's star count; the
visual tests remove it on every run anyway, so local and production
screenshots match.

For runs against production itself, set `E2E_BYPASS_HEADER="Name: value"` to
a header that a firewall rule lets through, or to Vercel's
`x-vercel-protection-bypass` secret. The browser sends it to `*.tester.army`
only.
