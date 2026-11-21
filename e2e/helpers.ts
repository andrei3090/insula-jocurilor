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
}

declare global {
  interface Window {
    __test?: { solve(): void; fail(): void };
  }
}
