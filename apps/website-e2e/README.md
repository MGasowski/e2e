# @e2e-dev/website-e2e

The safety net for moving the e2e landing page (now in the Tester Army app,
at https://tester.army/e2e) and the Mintlify docs (`docs/`, at
https://e2e.tester.army/docs) into `website/`. The suites pin down what the
current sites show and do. Run them against production to record that, then
against a `website/` build to see how far the migration matches.

## Layout

- `tests/landing/`: the landing page. Functional tests cover the metadata,
  header, hero, terminal tabs and hover docs, every configurator path
  (with the exact config each one copies), testimonials, FAQ, footer, the
  mobile menu, and the markdown twin agents fetch. `visual-sections` compares
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
- `support/site.ts`: where the sites are. Both default to production.

Every test runs at 1440×1000 (`desktop`) and 390×844 (`mobile`). Tests look
the page up by role, label, and text, not Mintlify's markup, so the same
suite applies to `website/`.

## Running

```bash
pnpm run build                                  # from the repo root: the suite runs the built packages
pnpm --filter @e2e-dev/website-e2e test         # functional
pnpm --filter @e2e-dev/website-e2e test:visual  # visual, in Linux (see below)
```

Point either at a `website/` build:

```bash
E2E_LANDING_URL=http://localhost:3000 E2E_DOCS_URL=http://localhost:3000/docs \
  pnpm --filter @e2e-dev/website-e2e test
```

A red test on `website/` is a gap in the migration, or an intended change.
For an intended change, update the test or the baseline in the same pull
request that makes it.

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
- The live GitHub star count, videos, and the YouTube thumbnail are masked.
- Third-party scripts are blocked, the theme is pinned, and the cookie banner
  is answered before it shows.

## Bot protection

tester.army sits behind Vercel's firewall. A headless browser that loads a
few hundred pages quickly gets a challenge it cannot pass, and the landing
tests fail at their first assertion. The suite runs three workers to stay
under that, but scheduled or repeated runs need a bypass: set
`E2E_BYPASS_HEADER="Name: value"` to a header that a firewall rule lets
through, or to Vercel's `x-vercel-protection-bypass` secret. The browser
sends it to `*.tester.army` only.
