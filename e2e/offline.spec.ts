import { expect, test } from '@playwright/test';
import { pickAge } from './helpers';

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // let the precache finish
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  await page.getByTestId('start').click();
  await pickAge(page);
  await page.getByTestId('island-bambus').click();
  await page.getByTestId('card-panda').click();
  await expect(page.getByTestId('game-panda')).toBeVisible();
  await expect(page.getByTestId('pile')).toBeVisible();
});
