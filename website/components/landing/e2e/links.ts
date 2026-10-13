export const E2E_GITHUB_REPO = "tester-army/e2e";
export const E2E_GITHUB_URL = `https://github.com/${E2E_GITHUB_REPO}`;
export const E2E_DOCS_URL = "https://e2e.tester.army/docs";

/* The init command pins @latest so npx skips an older project-local e2e; see
   docs/decisions.md "The site's e2e init command pins @latest". */
export const E2E_INIT_COMMAND = "npx e2e@latest init";
export const E2E_SKILL_COMMAND = "npx skills add tester-army/e2e";

/** The Tester Army site, home of the header's logo link. */
export const TESTER_ARMY_URL = "https://tester.army";
