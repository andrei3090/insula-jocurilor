import { expect, type Page, test } from '@playwright/test';
import { openGame, pickAge, start } from './helpers';

/** Plays one round of "Memorie la bal" (3 items); `stumble` makes every item need a hint first. */
async function playRound(page: Page, stumble = false) {
  for (let i = 1; i <= 3; i++) {
    if (stumble) {
      await page.evaluate(() => window.__test!.fail());
      await page.waitForTimeout(300);
    }
    await page.evaluate(() => window.__test!.solve());
    if (i < 3) await expect(page.getByTestId('bead-done')).toHaveCount(i, { timeout: 8000 });
  }
  await expect(page.getByTestId('round-end')).toBeVisible({ timeout: 8000 });
}

async function unlockParent(page: Page, lockId: string) {
  const lock = page.getByTestId(lockId);
  await lock.hover();
  await page.mouse.down();
  await page.waitForTimeout(3200);
  await page.mouse.up();
  await expect(page.getByTestId('pin-pad')).toBeVisible();
  for (const d of '0000') await page.getByRole('button', { name: d, exact: true }).click();
}

test.describe('levels 1…50', () => {
  test('a good round gives 3 stars, opens level 2, and the level is kept after a reload', async ({
    page,
  }) => {
    await start(page);
    await openGame(page, 'castel', 'memorie');
    await expect(page.getByTestId('level-number')).toHaveText('1');
    await playRound(page);
    await expect(page.getByTestId('round-stars')).toHaveAttribute('data-stars', '3');
    await page.getByTestId('next-level').click();
    await expect(page.getByTestId('level-number')).toHaveText('2');
    await expect(page.getByTestId('round-end')).toHaveCount(0);

    // the island card shows where she is
    await page.getByTestId('home').click();
    await expect(page.getByTestId('card-level-memorie')).toContainText('2');

    // saved on the device: a reload keeps level 2 and the stars
    await page.reload();
    await start(page);
    await openGame(page, 'castel', 'memorie');
    await expect(page.getByTestId('level-number')).toHaveText('2');
    await page.getByTestId('level-badge').click();
    await expect(page.getByTestId('level-path')).toBeVisible();
    await expect(page.getByTestId('level-1')).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('level-2')).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('level-3')).toHaveAttribute('data-open', 'false');
  });

  test('a hard round plays the level again; the second one opens the next level (never stuck)', async ({
    page,
  }) => {
    await start(page);
    await openGame(page, 'castel', 'memorie');
    await playRound(page, true);
    await expect(page.getByTestId('round-stars')).toHaveAttribute('data-stars', '1');
    await expect(page.getByTestId('next-level')).toHaveCount(0);
    await page.getByTestId('again').click();
    await expect(page.getByTestId('level-number')).toHaveText('1');
    await playRound(page, true);
    await expect(page.getByTestId('next-level')).toBeVisible();
  });

  test('the level path: locked stones stay locked, an open one starts that level', async ({ page }) => {
    await start(page);
    await openGame(page, 'castel', 'memorie');
    await playRound(page);
    await page.getByTestId('next-level').click();
    await page.getByTestId('level-badge').click();
    await page.getByTestId('level-5').click(); // locked: nothing happens
    await expect(page.getByTestId('level-path')).toBeVisible();
    await page.getByTestId('level-1').click();
    await expect(page.getByTestId('level-path')).toHaveCount(0);
    await expect(page.getByTestId('level-number')).toHaveText('1');
  });
});

test.describe('language and reset at the start screen', () => {
  test('English: the start screen, the map and the game titles switch; Romanian switches back', async ({
    page,
  }) => {
    await page.goto('./');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('start')).toContainText("Let's play!");
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    await page.getByTestId('start').click();
    await pickAge(page);
    await expect(page.getByTestId('island-bambus')).toHaveAttribute('aria-label', 'Bamboo Forest');
    await page.getByTestId('island-bambus').click();
    await expect(page.getByTestId('card-panda')).toContainText('Feed Pufi');
    // the language is kept after a reload
    await page.reload();
    await expect(page.getByTestId('start')).toContainText("Let's play!");
    await page.getByTestId('lang-ro').click();
    await expect(page.getByTestId('start')).toContainText('Hai să ne jucăm!');
  });

  test('total reset for the child, from the start screen, behind the parent lock', async ({ page }) => {
    await start(page);
    await openGame(page, 'castel', 'memorie');
    await playRound(page);
    await page.getByTestId('next-level').click();
    await expect(page.getByTestId('level-number')).toHaveText('2');
    await page.reload();
    // a quick tap does nothing
    await page.getByTestId('start-lock').click();
    await expect(page.getByTestId('pin-pad')).toHaveCount(0);
    await unlockParent(page, 'start-lock');
    await expect(page.getByTestId('reset-sheet')).toBeVisible();
    await page.getByTestId('reset-child').click();
    await page.getByTestId('reset-yes').click();
    await page.getByTestId('reset-close').click();
    await start(page);
    await openGame(page, 'castel', 'memorie');
    await expect(page.getByTestId('level-number')).toHaveText('1');
    await page.getByTestId('home').click();
    await page.getByTestId('island-screen-castel').getByTestId('home').click();
    await page.getByTestId('album').click();
    await expect(page.getByText('0 / 24')).toBeVisible();
  });
});

test.describe('parent zone', () => {
  test('levels per game, open all levels, and the child language', async ({ page }) => {
    await start(page);
    await unlockParent(page, 'lock');
    await expect(page.getByTestId('parent-level-panda')).toContainText('1 / 50');
    await page.getByTestId('open-all-levels').click();
    await expect(page.getByTestId('parent-level-panda')).toContainText('50 / 50');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByText("Parents' area")).toBeVisible();
  });
});
