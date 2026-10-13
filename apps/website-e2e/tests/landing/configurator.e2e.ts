import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { expectCopied, recordClipboard } from '../../support/clipboard.ts';
import { landing } from '../../support/site.ts';
import { prepare, viewportWidth } from '../../support/stable.ts';

/** The visible copy of a config line: desktop has one sticky terminal, smaller screens a snippet per step. */
const line = (key: string) => `[data-line="${key}"]:visible`;

const defaultConfig = [
  "import type { E2EConfig } from 'e2e';",
  "import { web } from '@e2e-dev/web';",
  "import { gateway } from 'ai';",
  '',
  'export default {',
  "  targets: [{ engine: web(), app: { url: 'http://localhost:3000' } }],",
  '  agents: {',
  '    default: {',
  "      model: gateway('openai/gpt-6-luna-fast'),",
  "      system: 'You are a QA testing agent.',",
  '    },',
  '  },',
  '} satisfies E2EConfig;',
].join('\n');

describe('configurator', { tags: ['landing'] }, () => {
  test.beforeEach(async ({ app, browser, screen }) => {
    await prepare(browser, 'dark');
    await app.open(landing());
    await expect(screen.getByRole('heading', { level: 2, name: 'Your testing stack. Your call.' })).toBeAttached();
    await recordClipboard(browser);
  });

  test('lists its five steps with their headings', async ({ screen }) => {
    for (const heading of [
      'Connect on your terms.',
      'Your favorite AI? Bring it along.',
      'Your agent. Your rules.',
      'Your app. Your environment.',
      'Your stack. Ready to test.',
    ]) {
      await expect(screen.getByRole('heading', { name: heading })).toBeAttached();
    }
    await expect(screen.getByText('Pick every layer. The config writes itself.', { exact: true }).first()).toBeAttached();
  });

  test('starts on Vercel AI Gateway, OpenAI, and Web', async ({ screen }) => {
    for (const name of ['Vercel AI Gateway', 'OpenAI', 'Web']) {
      await expect(screen.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
    for (const name of ['OpenRouter', 'Direct API key', 'Subscription', 'Claude', 'Gemini', 'Mobile', 'Custom engine']) {
      await expect(screen.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  test('copies the default config untouched', async ({ browser, screen }) => {
    const copy = screen.getByRole('button', { name: 'Copy config', exact: true });
    await copy.scrollIntoView();
    await copy.tap();
    await expect(screen.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
    await expectCopied(browser, defaultConfig);
  });

  const models: [string, string][] = [
    ['OpenAI', "model: gateway('openai/gpt-6-luna-fast'),"],
    ['Claude', "model: gateway('anthropic/claude-sonnet-5'),"],
  ];
  for (const [name, expected] of models) {
    test(`picking ${name} on the gateway writes its model line`, async ({ browser, screen }) => {
      await screen.getByRole('button', { name, exact: true }).tap();
      await expect(browser.locator(line('model')).first()).toHaveText(expected);
    });
  }

  test('every model on the gateway writes a gateway model line', async ({ browser, screen }) => {
    for (const name of ['OpenAI', 'Claude', 'Gemini', 'SpaceXAI', 'Llama', 'Mistral', 'DeepSeek']) {
      const chip = screen.getByRole('button', { name, exact: true });
      await chip.tap();
      await expect(chip).toHaveAttribute('aria-pressed', 'true');
      await expect(browser.locator(line('model')).first()).toHaveText(/^model: gateway\('[a-z-]+\/[\w.-]+'\),$/);
    }
  });

  test('Custom model asks for a model id', async ({ screen }) => {
    await screen.getByRole('button', { name: 'Custom', exact: true }).tap();
    await expect(screen.getByLabel('Model id', { exact: true }).first()).toBeVisible();
  });

  test('writes the config for every picked layer and inline edit', async ({ browser, screen }) => {
    const openRouter = screen.getByRole('button', { name: 'OpenRouter', exact: true });
    await openRouter.tap();
    await expect(openRouter).toHaveAttribute('aria-pressed', 'true');
    await screen.getByRole('button', { name: 'Claude', exact: true }).tap();
    await expect(browser.locator(line('model')).first()).toHaveText("model: openrouter('anthropic/claude-sonnet-5'),");

    await screen.getByRole('textbox', { name: 'Edit url' }).first().fill('https://staging.example.test');
    const copy = screen.getByRole('button', { name: 'Copy config', exact: true });
    await copy.scrollIntoView();
    await copy.tap();
    await expectCopied(
      browser,
      [
        "import type { E2EConfig } from 'e2e';",
        "import { web } from '@e2e-dev/web';",
        "import { openrouter } from '@openrouter/ai-sdk-provider';",
        '',
        'export default {',
        "  targets: [{ engine: web(), app: { url: 'https://staging.example.test' } }],",
        '  agents: {',
        '    default: {',
        "      model: openrouter('anthropic/claude-sonnet-5'),",
        "      system: 'You are a QA testing agent.',",
        '    },',
        '  },',
        '} satisfies E2EConfig;',
      ].join('\n'),
    );
  });

  test('Subscription narrows the models and falls back to OpenAI', async ({ browser, screen }) => {
    await screen.getByRole('button', { name: 'Claude', exact: true }).tap();
    await screen.getByRole('button', { name: 'Subscription', exact: true }).tap();
    await expect(browser.locator(line('import-connection')).first()).toHaveText(
      "import { copilot } from 'e2e/oauth/copilot'; // npx e2e login github-copilot",
    );
    await expect(browser.locator(line('model')).first()).toHaveText("model: copilot('claude-sonnet-5'),");
    await expect(screen.getByRole('button', { name: 'Mistral', exact: true })).toBeHidden();
    await expect(screen.getByRole('button', { name: 'Claude', exact: true })).toHaveAttribute('aria-pressed', 'true');

    await screen.getByRole('button', { name: 'Vercel AI Gateway', exact: true }).tap();
    await screen.getByRole('button', { name: 'Mistral', exact: true }).tap();
    await screen.getByRole('button', { name: 'Subscription', exact: true }).tap();
    await expect(screen.getByRole('button', { name: 'Mistral', exact: true })).toBeHidden();
    await expect(screen.getByRole('button', { name: 'OpenAI', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(browser.locator(line('model')).first()).toHaveText("model: chatgpt('gpt-6-luna'),");
  });

  test('builds a direct-key mobile config with a custom model and prompt', async ({ browser, screen }) => {
    await screen.getByRole('button', { name: 'Direct API key', exact: true }).tap();
    await screen.getByRole('button', { name: 'Mistral', exact: true }).tap();
    await expect(browser.locator(line('import-connection')).first()).toHaveText(
      "import { mistral } from '@ai-sdk/mistral';",
    );
    await screen.getByLabel('System prompt', { exact: true }).first().fill("Check the user's cart");
    await screen.getByRole('button', { name: 'Custom engine', exact: true }).tap();
    await expect(screen.getByLabel('Engine', { exact: true }).first()).toBeVisible();
    await screen.getByRole('button', { name: 'Mobile', exact: true }).tap();
    await expect(browser.locator(line('agent-tools')).first()).toHaveText('tools: mobileTools(device),');

    const copy = screen.getByRole('button', { name: 'Copy config', exact: true });
    await copy.scrollIntoView();
    await copy.tap();
    await expectCopied(
      browser,
      [
        "import type { E2EConfig } from 'e2e';",
        "import { mobile } from '@e2e-dev/mobile';",
        "import { mobileTools } from '@e2e-dev/mobile/tools';",
        "import { mistral } from '@ai-sdk/mistral';",
        '',
        "const device = mobile({ platform: 'ios' });",
        '',
        'export default {',
        "  targets: [{ engine: device, app: { bundleId: 'com.yourapp.app' } }],",
        '  workers: 1,',
        '  agents: {',
        '    default: {',
        "      model: mistral('mistral-large-3'),",
        "      system: 'Check the user\\'s cart',",
        '      tools: mobileTools(device),',
        '    },',
        '  },',
        '} satisfies E2EConfig;',
      ].join('\n'),
    );
  });

  test('the system prompt stops at 220 characters', async ({ screen }) => {
    const prompt = screen.getByLabel('System prompt', { exact: true }).first();
    await prompt.fill('x'.repeat(300));
    expect((await prompt.inputValue()).length).toBeLessThanOrEqual(220);
  });

  test('on desktop, a picked layer highlights its lines in the sticky terminal', async ({ browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 1024, 'the sticky terminal is desktop only');
    const highlighted = () =>
      browser.evaluate(() =>
        [...document.querySelectorAll('[data-line].border-l-2')]
          .filter((element) => element.checkVisibility())
          .map((element) => element.getAttribute('data-line') ?? ''),
      );
    await screen.getByRole('button', { name: 'OpenRouter', exact: true }).tap();
    await screen.getByRole('button', { name: 'Claude', exact: true }).tap();
    await expect.poll(highlighted).toContain('model');
    await browser.evaluate(() => {
      document.querySelectorAll('[data-config-step]')[2]?.scrollIntoView({ block: 'center' });
      return null;
    });
    await expect.poll(highlighted).toEqual(['system']);
    await expect(screen.getByText('e2e.config.ts', { exact: true }).first()).toBeVisible();
  });

  test('on desktop, picking a custom engine keeps the Copy config button in place', async ({ browser, screen }) => {
    test.skip((await viewportWidth(browser)) < 1024, 'the steps reflow below 1024px');
    // Layout offset, not getBoundingClientRect: the step's reveal translate
    // would make the reading depend on whether its animation has finished.
    const copyTop = () =>
      browser.evaluate(() => {
        let node: Element | null | undefined = [...document.querySelectorAll('button')].find(
          (candidate) => candidate.textContent === 'Copy config',
        );
        if (!node) return null;
        let top = 0;
        for (; node instanceof HTMLElement; node = node.offsetParent) top += node.offsetTop;
        return top;
      });
    const before = await copyTop();
    expect(before).not.toBeNull();
    await screen.getByRole('button', { name: 'Custom engine', exact: true }).tap();
    await expect(screen.getByLabel('Engine', { exact: true }).first()).toBeVisible();
    expect(await copyTop()).toBe(before);
  });

  test('on desktop, a scroll inside the steps settles with the nearest step centered', async ({ browser }) => {
    test.skip((await viewportWidth(browser)) < 1024, 'the scroll settle is desktop only');
    const secondStepOffset = () =>
      browser.evaluate(() => {
        const step = document.querySelectorAll('[data-config-step]')[1];
        if (!step) return null;
        const rect = step.getBoundingClientRect();
        return Math.round(rect.top + rect.height / 2 - window.innerHeight / 2);
      });
    await browser.evaluate(() => {
      document.querySelectorAll('[data-config-step]')[1]?.scrollIntoView({ block: 'center' });
      return null;
    });
    await expect.poll(async () => Math.abs((await secondStepOffset()) ?? 99)).toBeLessThan(1);
    await browser.evaluate(() => {
      window.addEventListener('scrollend', () => {
        const step = document.querySelectorAll('[data-config-step]')[1];
        if (!step) return;
        const rect = step.getBoundingClientRect();
        const offset = Math.round(rect.top + rect.height / 2 - window.innerHeight / 2);
        document.body.dataset.scrollEndOffsets = `${document.body.dataset.scrollEndOffsets ?? ''} ${offset}`;
      });
      return null;
    });
    await browser.keyboard.press('ArrowDown');
    // One scroll end shows the key moved the page, the last one is the settle back.
    await expect
      .poll(async () => {
        const offsets = await browser.evaluate(() =>
          (document.body.dataset.scrollEndOffsets ?? '').trim().split(' ').map(Number),
        );
        return offsets.some((offset) => Math.abs(offset) >= 10) && Math.abs(offsets.at(-1) ?? 99) < 3;
      })
      .toBe(true);
  });

  test('on smaller screens every step shows its own snippet', async ({ browser, screen }) => {
    test.skip((await viewportWidth(browser)) >= 1024, 'desktop shows one sticky terminal instead');
    const snippetLine = (step: number, key: string) =>
      browser.locator(`[data-config-step]:nth-child(${step + 1}) [data-line="${key}"]`);
    await screen.getByRole('button', { name: 'OpenRouter', exact: true }).tap();
    await expect(snippetLine(0, 'model')).toHaveText("model: openrouter('openai/gpt-6-luna-fast'),");
    await expect(snippetLine(1, 'import-connection')).toHaveText(
      "import { openrouter } from '@openrouter/ai-sdk-provider';",
    );
    await screen.getByRole('textbox', { name: 'Edit url' }).first().fill('https://staging.example.test');
    await expect(snippetLine(4, 'targets')).toContainText('https://staging.example.test');
    await screen.getByRole('button', { name: 'Custom engine', exact: true }).tap();
    await expect(screen.getByLabel('Engine', { exact: true }).first()).toBeVisible();
    await expect(snippetLine(3, 'targets')).toContainText('engine: yourEngine');
    await expect(snippetLine(4, 'config-close')).toBeVisible();
  });
});
