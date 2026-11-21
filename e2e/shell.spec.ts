import { expect, test } from '@playwright/test';
import { start } from './helpers';

test('loads with title "Insula Jocurilor"', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Insula Jocurilor');
});

test('splash → map → island → home → map', async ({ page }) => {
  await start(page);
  for (const id of ['bambus', 'pestera', 'castel', 'laguna', 'atelier']) {
    await expect(page.getByTestId(`island-${id}`)).toBeVisible();
  }
  await page.getByTestId('island-bambus').click();
  await expect(page.getByTestId('card-panda')).toBeVisible();
  await page.getByTestId('home').click();
  await expect(page.getByTestId('map')).toBeVisible();
});

test('Android back goes up one level and never leaves the app', async ({ page }) => {
  await start(page);
  await page.getByTestId('island-castel').click();
  await expect(page.getByTestId('island-screen-castel')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('map')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('map')).toBeVisible();
  expect(page.url()).toContain('/insula-jocurilor/');
});

test('parent zone: a short tap stays locked, a 3 s hold + PIN opens it', async ({ page }) => {
  await start(page);
  const lock = page.getByTestId('lock');
  await lock.click();
  await expect(page.getByTestId('pin-pad')).toHaveCount(0);
  await lock.hover();
  await page.mouse.down();
  await page.waitForTimeout(3200);
  await page.mouse.up();
  await expect(page.getByTestId('pin-pad')).toBeVisible();
  for (const d of '0000') await page.getByRole('button', { name: d, exact: true }).click();
  await expect(page.getByTestId('parent')).toBeVisible();
  await expect(page.getByText('Alege un PIN al tău')).toBeVisible();
});

test('album opens with an empty sticker book', async ({ page }) => {
  await start(page);
  await page.getByTestId('album').click();
  await expect(page.getByTestId('album-screen')).toBeVisible();
  await expect(page.getByText('0 / 24')).toBeVisible();
});

test('every child-screen button is at least 72 px (most ≥ 86 px)', async ({ page }) => {
  await start(page);
  const small = await page.evaluate(
    () =>
      [...document.querySelectorAll('button')]
        .filter((b) => b.dataset.testid !== 'lock')
        .map((b) => b.getBoundingClientRect())
        .filter((r) => r.width > 0 && Math.min(r.width, r.height) < 72).length,
  );
  expect(small).toBe(0);
});
