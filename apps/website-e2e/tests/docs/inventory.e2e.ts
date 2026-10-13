import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { docsPages } from '../../support/docs-pages.ts';
import { isDesktopTarget } from '../../support/stable.ts';

const docsJson = fileURLToPath(new URL('../../../../docs/docs.json', import.meta.url));
const script = fileURLToPath(new URL('../../scripts/sync-docs-pages.mjs', import.meta.url));

test('the page list matches docs/ while docs/ exists', { tags: ['docs'] }, async ({ browser }) => {
  test.skip(!(await isDesktopTarget(browser)), 'runs once, on desktop');
  test.skip(!existsSync(docsJson), 'docs/ is retired; support/docs-pages.ts is the record now');
  // Throws with the script's message when a page was added, renamed, or retitled without `pnpm sync:docs`.
  execFileSync(process.execPath, [script, '--check'], { encoding: 'utf8', stdio: 'pipe' });
  expect(docsPages.length).toBeGreaterThan(0);
});
