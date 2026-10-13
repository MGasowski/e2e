import {
  E2E_DOCS_URL,
  E2E_GITHUB_URL,
  E2E_INIT_COMMAND,
  E2E_SKILL_COMMAND,
} from "@/components/landing/e2e/links";
import { LANDING_CANONICAL } from "@/lib/site";

const DISCORD_INVITE_URL = "https://discord.gg/2b2Y8apb8V";
const X_PROFILE_URL = "https://x.com/testerarmy";
const TESTER_ARMY_HOME = "https://tester.army/";

const docs = (page: string) => `${E2E_DOCS_URL}/${page}`;

const EXAMPLE = `\`\`\`ts
import { test, expect } from 'e2e';

test('a member upgrades to Pro', async ({ app, agent, screen }) => {
  await app.open('/settings/billing');

  await agent.act('upgrade the workspace to the Pro plan');
  await agent.assert('the invoice preview shows a prorated amount');

  await expect(screen.getByRole('status')).toContainText('Pro');
});
\`\`\``;

const SETUP = `## Get started

Run this in your app's directory (\`pnpm dlx e2e@latest init\` or \`bunx e2e@latest init\` work too):

\`\`\`bash
${E2E_INIT_COMMAND}
\`\`\`

The wizard asks for Web (Playwright) or Mobile (iOS/Android) and a model provider, or None for tests without AI. It writes \`e2e.config.ts\`, an example test, the e2e skill, and the \`e2e mcp\` registration for Claude Code and Cursor. Existing files stay intact. Then run the suite (\`pnpm exec e2e run\` or \`bunx e2e run\` with those package managers):

\`\`\`bash
npx e2e run
\`\`\`

Requires Node.js 24.8 or newer (22.22.3 or newer on Node.js 22). On Windows, run inside WSL. Mobile tests need Xcode with an iOS simulator runtime, or the Android SDK with an emulator.

### For coding agents

To set up a project for the user, run \`${E2E_INIT_COMMAND} --yes\` (non-interactive: web config on Vercel AI Gateway, example test, skill, MCP config), then read the skill with \`npx e2e guide\` (\`npx e2e guide <topic>\` for one topic) and follow it. Point the target at the app, ask the user which model to use, install dependencies, and iterate until the example test passes. The [Quickstart](${docs("quickstart.md")}) has the full setup prompt.

In a project that already uses e2e, install the skill and read \`.agents/skills/e2e/SKILL.md\` before writing or running a test:

\`\`\`bash
${E2E_SKILL_COMMAND}
\`\`\``;

const STRENGTHS = `## Why e2e

- **Deterministic cache replay.** A passing \`agent.act\` step is recorded once a later check verifies it. The next run replays the recorded actions with no model call, matching controls by role, name, test id, and context, and checking the step produced the same effect. When the app changed, the agent takes over from the current screen instead of failing. \`agent.assert\`, \`agent.waitFor\`, and \`agent.extract\` always run live. Commit \`.e2e/cache/\` (\`e2e init\` gitignores it) and CI replays the same recordings; the summary reports replayed, handed off, and missed steps. [Caching agent steps](${docs("cache.md")})
- **AI where it helps, code where it counts.** Mix goals (\`agent.act\`, \`agent.assert\`, \`agent.waitFor\`, \`agent.extract\`) with deterministic locators and \`expect\` in the same test, or write tests with no agent steps and no model at all.
- **\`e2e explore\`.** Give the agent a goal instead of a test file: \`npx e2e explore 'Explore checkout like a first-time buyer and report anything off'\`. It plans its own steps, drives the app, and reports findings with severity, expected vs. observed behavior, repro steps, and screenshots. Good for scouting a feature and picking flows to turn into regression tests. [Exploring without a test](${docs("explore.md")})
- **Bug bashes.** A coding agent fans out several \`e2e explore\` runs, one per area and persona, then reproduces every finding with a repro test. A finding counts as a confirmed bug only when its test fails for the reported reason. Run \`npx e2e guide bug-bash\` for the steps. [Bug bashes](${docs("bug-bash.md")})
- **\`e2e mcp\`.** An MCP server that lets Claude Code, Cursor, and other coding agents open live sessions on the app, observe it, act, take masked screenshots, record video, and check locators with \`locate\` before writing a test. Each subagent can open its own session, so several drive the app in parallel. Needs no model. [MCP server](${docs("reference/mcp.md")})
- **Built for coding agents.** The skill teaches agents to write, run, and debug tests; \`.e2e/report.json\` gives them the failing step, screenshots, traces, and logs; the package ships the docs offline under \`node_modules/e2e/docs\`. [Coding agents](${docs("coding-agents.md")})
- **One API for web and mobile.** The same tests, fixtures, and assertions drive Chromium, Firefox, and WebKit through Playwright, and iOS simulators, Android emulators, and physical devices through agent-device. [Testing iOS and Android](${docs("mobile.md")})
- **Bring your own model.** Any AI SDK model: your ChatGPT, GitHub Copilot, OpenCode Console, or SuperGrok subscription (\`npx e2e login\`), an API key, Vercel AI Gateway, OpenRouter, or a local server. e2e adds no markup. [Models](${docs("models.md")})
- **Secrets stay out of the model.** Credentials are filled by name at run time and redacted from model input. [Security model](${docs("security.md")})
- **CI-ready.** CI mode turns on automatically (one retry, cache read-only so CI never records), and \`@e2e-dev/github\` posts one pull request comment per run. [Continuous integration](${docs("ci.md")})
- **Make it yours.** Define your own agents, tools, executors, engines, and hosted browser or device backends. See below.
- **Open source.** Apache-2.0 licensed on GitHub: ${E2E_GITHUB_URL}`;

const CUSTOMIZE = `## Make it yours

### Define your own agents

\`agents\` in \`e2e.config.ts\` holds named agents. Each one sets its own \`model\` (plus an optional separate \`judge\` model for \`assert\`, \`waitFor\`, and \`extract\`), a \`system\` prompt for how the acting agent works, a \`context\` with your app's vocabulary that every model call reads, \`tools\`, and budgets. Tests use \`default\` unless they pick another agent, so one suite can run a flow as a buyer and as an admin, or send hard steps to a stronger model. \`e2e explore --agent <name>\` explores as a persona.

\`\`\`ts
agents: {
  default: { model: gateway('openai/gpt-6-luna-fast'), context: 'Plans are called tiers.' },
  admin: {
    model: gateway('anthropic/claude-opus-5'),
    system: 'You manage orders and approve refunds.',
    context: 'Plans are called tiers.',
  },
},
\`\`\`

[Agents and personas](${docs("agents.md")})

### Give the agent project tools

Wrap any AI SDK tool with \`defineTool\` and add it to an agent's \`tools\`: seed data through a test API, read a database, or run a device operation in the middle of a goal. Mark it \`mutates: true\` or \`false\` and limit it to some platforms. [Project tools](${docs("tools.md")})

### Replace the agent loop

When a prompt and tools are not enough, set \`executor\` on an agent:

- \`createToolLoopExecutor\` (\`e2e/agent\`) keeps the built-in loop (budgets, verdicts, usage accounting, transcripts) with your own system prompt, prompt builder, and tools.
- A \`StepExecutor\` implements \`runStep(ctx)\` from scratch, with or without a model. Actions through \`ctx.actions\` are authorized and recorded, and the runner records the verdict.
- \`@e2e-dev/decision\` runs \`act\` and \`assert\` through a decision model that picks bounded choices, plus a small text model for field values, instead of a full LLM agent.

[Custom executors](${docs("executors.md")}), [Decision models](${docs("decision-models.md")})

### Bring your own backend

- **Engines.** An engine connects \`screen\`, \`app\`, and agent steps to a UI platform. \`@e2e-dev/web\` and \`@e2e-dev/mobile\` are built on the same public \`defineEngine\` API from \`e2e/engine\`, so you can write one for a desktop app, a TV, or another platform. The runner keeps owning retries, polling, timeouts, the cache, and secret handling. [Writing an engine](${docs("writing-an-engine.md")})
- **Hosted browsers and devices.** The web engine takes a \`BrowserProvider\` and the mobile engine a \`DeviceProvider\`, so tests run unchanged on a hosted service. Official integrations: \`@e2e-dev/kernel\` for Kernel's hosted Chromium and \`@e2e-dev/eas\` for EAS Simulators. Any other service is one small provider in your project. [Integrations](${docs("integrations/index.md")})
- **Reporters.** A custom reporter receives run events and publishes results anywhere. [Reporters](${docs("reference/reporters.md")})`;

const comparison = (homeUrl: string) => `## How e2e differs from other tools

### vs Playwright, Cypress, and Selenium

Scripted frameworks make you write and maintain every selector, wait, and step, and a UI change breaks the test until someone fixes it. e2e keeps the same deterministic core (\`screen\` locators, retrying \`expect\` assertions, Playwright under the hood for the web) and adds agent goals for the parts that break most: multi-step flows, wizards, and copy that changes. Once a committed cache holds a verified recording, those \`act\` steps replay without a model call until the app changes; agent checks still call the model. On top of that you get \`e2e explore\`, \`e2e mcp\` for coding agents, and the same API for iOS and Android. Locator names match exactly by default, so \`Save\` never matches \`Save as draft\`. \`@e2e-dev/web\` pins its own \`playwright-core\`, so e2e runs beside an existing Playwright suite and you migrate one file at a time. Guides: [Playwright](${docs("migrate/playwright.md")}), [Cypress](${docs("migrate/cypress.md")}), [Selenium](${docs("migrate/selenium.md")}).

### vs Maestro and Detox

Maestro flows are YAML, and Detox needs its own build step (\`detox build\`). e2e tests are TypeScript that run against your normal debug or release build, and React Native \`testID\` props work with \`getByTestId\` on both platforms. The same test file, fixtures, and assertions cover web, iOS, and Android. Agent goals replace long tap-and-type sequences, and \`e2e mcp\` gives a coding agent a live session on the simulator to find locators before it writes a test. Both runners can share one simulator while you migrate. Guides: [Maestro](${docs("migrate/maestro.md")}), [Detox](${docs("migrate/detox.md")}).

### vs Playwright MCP and agent-only AI testing

Tools that hand the whole test to an agent call the model on every run, so runs are slow, cost tokens, and can take a different path each time. Playwright MCP gives an agent a browser, not a test suite. e2e records a verified \`agent.act\` step and replays it with no model call, checks that the replay produced the same effect, and only hands back to the agent when the app changed. Exact checks stay in code with \`expect\`. Runs produce a JSON report, JUnit output, and CI exit codes, and tests live in your repo next to the code.

### vs TesterArmy

e2e is the open source framework: tests are TypeScript in your repo, run locally or in your CI, with your own model. [TesterArmy](${homeUrl}) is the hosted service: tests are written in plain language in a dashboard and run in TesterArmy cloud, with no test code in your repo.

### When to keep your current tool

- Component tests: e2e tests the running app; Cypress component testing has no equivalent.
- An HTML report: e2e writes \`.e2e/report.json\` and a markdown summary instead.
- Maestro Studio or Maestro Cloud: no equivalent. Use \`e2e mcp\` for live exploration and your own CI for runs.`;

const DOCUMENTATION = `## Documentation

Every docs page is available as markdown by appending \`.md\`.

- [Docs index](${docs("llms.txt")}): list of all documentation pages
- [Quickstart](${docs("quickstart.md")}): set up with one prompt to your coding agent, or step by step
- [Goals](${docs("goals.md")}): write test steps as goals with \`agent.act\`
- [Assertions](${docs("assertions.md")}): check the screen with \`agent.assert\`, wait, and extract data
- [Locators](${docs("locators.md")}): deterministic actions and checks with \`screen\` and \`expect\`
- [Caching agent steps](${docs("cache.md")}): replay verified actions without model calls
- [Exploring without a test](${docs("explore.md")}): \`e2e explore\` goals, budgets, and findings
- [Bug bashes](${docs("bug-bash.md")}): parallel explorations proven with repro tests
- [Coding agents](${docs("coding-agents.md")}): the skill, \`e2e mcp\`, and reports for debugging
- [Testing iOS and Android](${docs("mobile.md")}): simulator and emulator targets
- [Models](${docs("models.md")}) and [Subscriptions](${docs("subscriptions.md")}): configure the model for agent steps
- [Signing in](${docs("authentication.md")}): reuse sessions and pass secrets without exposing them
- [Debugging a run](${docs("debugging.md")}): read the report and the evidence
- [Continuous integration](${docs("ci.md")}): run tests on pull requests
- Migration guides: [Playwright](${docs("migrate/playwright.md")}), [Cypress](${docs("migrate/cypress.md")}), [Selenium](${docs("migrate/selenium.md")}), [Detox](${docs("migrate/detox.md")}), [Maestro](${docs("migrate/maestro.md")})
- References: [CLI](${docs("reference/cli.md")}), [config](${docs("reference/config.md")}), [MCP server](${docs("reference/mcp.md")}), [agent](${docs("reference/agent.md")}), [screen](${docs("reference/screen.md")}), [expect](${docs("reference/expect.md")})`;

/** /e2e in markdown form for agents (served at `/e2e.md`, see `proxy.ts`). */
export function landingMarkdown() {
  return `# e2e

> The open source AI testing framework. Customizable TypeScript testing framework for web, mobile apps and more.

e2e is a TypeScript end-to-end test runner by TesterArmy. You choose how agentic each test is: fully deterministic with locators and assertions, fully driven by an agent from goals in natural language, or a mix of both in the same test. Tests run against a real browser, iOS simulator, or Android emulator, and verified agent steps replay from a cache without calling the model again.

${EXAMPLE}

${SETUP}

${STRENGTHS}

${CUSTOMIZE}

${comparison(TESTER_ARMY_HOME)}

${DOCUMENTATION}

## Links

- Landing page: ${LANDING_CANONICAL}
- Source: ${E2E_GITHUB_URL}
- Discord: ${DISCORD_INVITE_URL}
- X: ${X_PROFILE_URL}
`;
}
