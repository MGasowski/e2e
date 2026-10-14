import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { get, landing, landingUrlPattern } from '../../support/site.ts';
import { brokenImages, horizontalOverflow, prepare } from '../../support/stable.ts';

const session = 'Intro to e2e';

describe('live sessions', { tags: ['landing'] }, () => {
  test.beforeEach(async ({ browser }) => {
    await prepare(browser, 'dark');
  });

  test('the sessions page lists the live session and leads to its page', async ({ app, browser, screen }) => {
    await app.open(landing('sessions'));
    await expect(browser).toHaveTitle('Sessions · e2e by TesterArmy');
    await expect(screen.getByRole('heading', { level: 1, name: session })).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Recordings' })).toBeVisible();
    expect(await horizontalOverflow(browser), 'no horizontal scroll').toBe(0);
    await expect.poll(() => brokenImages(browser)).toEqual([]);

    const save = screen.getByRole('main').getByRole('link', { name: /^Save my seat/ }).first();
    await expect(save).toHaveAttribute('href', '/e2e/sessions/intro-to-e2e');
    await save.tap();
    await expect(browser).toHaveURL(landingUrlPattern('sessions/intro-to-e2e'));
  });

  test('the session page shows the agenda, the host, and a way to save a seat', async ({ app, browser, screen }) => {
    await app.open(landing('sessions/intro-to-e2e'));
    await expect(browser).toHaveTitle('Intro to e2e · e2e live session');
    await expect(screen.getByRole('heading', { level: 1, name: session })).toBeVisible();
    await expect(screen.getByText('Running it on CI', { exact: true })).toBeAttached();
    await expect(screen.getByRole('link', { name: 'Kacper on LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/kacperkapusciak/',
    );
    // tester.army takes the email on the page; website/ links there, since sign-up needs the app's backend.
    const panel = screen.getByRole('complementary').filter({ hasText: /Save my seat|Live now|Session ended/ });
    await expect(panel).toBeVisible();
    expect(await horizontalOverflow(browser), 'no horizontal scroll').toBe(0);

    await screen.getByRole('link', { name: 'All sessions' }).tap();
    await expect(browser).toHaveURL(landingUrlPattern('sessions'));
  });

  test('the session invite downloads as a calendar file', async () => {
    const response = await get(landing('sessions/intro-to-e2e/invite.ics'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/calendar/);
    const body = await response.text();
    expect(body).toContain('BEGIN:VEVENT');
    expect(body).toContain('SUMMARY:Intro to e2e');
  });
});
