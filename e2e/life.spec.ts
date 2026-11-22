import { expect, test } from '@playwright/test';
import { openGame, start } from './helpers';

test('island screen: the guides stand on their island and react when tapped', async ({ page }) => {
  await start(page);
  await page.getByTestId('island-laguna').click();
  const scene = page.getByTestId('island-scene');
  await expect(scene).toBeVisible();
  await expect(scene.locator('svg').first()).toBeVisible();
  const marina = page.getByTestId('live-marina');
  await expect(marina).toHaveAttribute('data-mood', 'wave');
  await marina.click();
  await expect(marina).toHaveAttribute('data-mood', 'happy');
  await expect(marina).toHaveAttribute('data-mood', 'wave', { timeout: 3000 });
  // the next tap does something else: never the resting wave, so it is always visible
  await marina.click();
  await expect(marina).toHaveAttribute('data-mood', 'dance');
  const tavi = page.getByTestId('live-tavi');
  await tavi.click();
  await expect(tavi).toHaveAttribute('data-mood', 'happy');
  // the game cards still work next to the live guides
  await page.getByTestId('card-nisip').click();
  await expect(page.getByTestId('game-nisip')).toBeVisible();
});

test('in a game the guide reacts to a tap too, without stopping the game', async ({ page }) => {
  await start(page);
  await openGame(page, 'pestera', 'xilofon');
  const bruno = page.getByTestId('live-bruno');
  if (!(await bruno.isVisible())) test.skip(true, 'the guide is hidden in portrait');
  await bruno.click();
  await expect(bruno).not.toHaveAttribute('data-mood', 'idle');
  await page.evaluate(() => window.__test!.solve());
  await expect(page.getByTestId('bead-done')).toHaveCount(1, { timeout: 8000 });
});

test('end of a round: Pufi and the island guide dance next to the sticker', async ({ page }) => {
  await start(page);
  await openGame(page, 'atelier', 'ghidat');
  await page.evaluate(() => window.__test!.solve());
  const end = page.getByTestId('round-end');
  await expect(end).toBeVisible({ timeout: 8000 });
  await expect(end.getByTestId('live-pufi')).toHaveAttribute('data-mood', 'dance');
  await expect(end.getByTestId('live-tavi')).toHaveAttribute('data-mood', 'dance');
});
