---
"e2e": minor
---

The agent skill is now three skills: `e2e` for the runner, `e2e-mcp` for using the live app through `e2e mcp`, and `e2e-bug-bash` for bug bashes. `e2e init` installs all three. A rerun adds the two new ones beside an `e2e` skill an earlier init installed and removes its old `references/mcp.md` and `references/bug-bash.md`. `e2e guide mcp` and `e2e guide bug-bash` still print them. With `npx skills add tester-army/e2e --skill <name>` you can install one alone.
