import { expect, test } from '@playwright/test';

test('loads with title "Insula Jocurilor"', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Insula Jocurilor');
});
