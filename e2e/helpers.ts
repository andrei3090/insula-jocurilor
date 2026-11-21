import { expect, type Page } from '@playwright/test';

export async function start(page: Page) {
  await page.goto('./');
  await page.getByTestId('start').click();
  await expect(page.getByTestId('map')).toBeVisible();
}

export async function openGame(page: Page, island: string, id: string) {
  await page.getByTestId(`island-${island}`).click();
  await expect(page.getByTestId(`island-screen-${island}`)).toBeVisible();
  await page.getByTestId(`card-${id}`).click();
  await expect(page.getByTestId(`game-${id}`)).toBeVisible();
  // the game registers its test hooks once it is loaded
  await page.waitForFunction(() => typeof window.__test?.solve === 'function');
  await page.waitForTimeout(600);
  // games that start with a choice (the sand: lines / letters / digits): take the first option
  const picker = page.getByTestId('nisip-picker');
  if (await picker.isVisible().catch(() => false)) {
    await page.getByTestId('pick-strokes').click();
    await page.waitForTimeout(800);
  }
}

declare global {
  interface Window {
    __test?: { solve(): void; fail(): void };
  }
}
