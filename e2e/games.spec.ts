import { expect, test } from '@playwright/test';
import { openGame, start } from './helpers';

const SCORED = [
  { id: 'panda', island: 'bambus' },
  { id: 'ursi', island: 'pestera' },
  { id: 'memorie', island: 'castel' },
  { id: 'nisip', island: 'laguna' },
  { id: 'puncte', island: 'bambus' },
  { id: 'abc', island: 'laguna' },
  { id: 'cifre', island: 'bambus' },
  { id: 'xilofon', island: 'pestera' },
];

for (const g of SCORED) {
  test(`${g.id}: a wrong answer gives a hint (no fail screen), a right one moves a bead`, async ({
    page,
  }) => {
    await start(page);
    await openGame(page, g.island, g.id);
    await page.evaluate(() => window.__test!.fail());
    await page.waitForTimeout(500);
    await expect(page.getByTestId(`game-${g.id}`)).toBeVisible();
    await expect(page.getByTestId('round-end')).toHaveCount(0);
    await page.evaluate(() => window.__test!.solve());
    await expect(page.getByTestId('bead-done')).toHaveCount(1, { timeout: 8000 });
    await page.getByTestId('home').click();
    await expect(page.getByTestId(`island-screen-${g.island}`)).toBeVisible();
  });
}

test('a full round ends with a sticker that shows up in the album', async ({ page }) => {
  await start(page);
  await openGame(page, 'castel', 'memorie');
  for (let i = 1; i <= 3; i++) {
    await page.evaluate(() => window.__test!.solve());
    if (i < 3) await expect(page.getByTestId('bead-done')).toHaveCount(i, { timeout: 8000 });
  }
  await expect(page.getByTestId('round-end')).toBeVisible({ timeout: 8000 });
  await page.getByTestId('round-home').click();
  await expect(page.getByTestId('island-screen-castel')).toBeVisible();
  await page.getByTestId('island-screen-castel').getByTestId('home').click();
  await expect(page.getByTestId('map')).toBeVisible();
  await page.getByTestId('album').click();
  await expect(page.getByText('1 / 24')).toBeVisible();
});

test('drawing workshop: draw with the pen and save to the album', async ({ page }) => {
  await start(page);
  await openGame(page, 'atelier', 'desen');
  const paper = page.getByTestId('paper');
  const box = (await paper.boundingBox())!;
  await page.evaluate(
    ({ x, y, w, h }) => {
      const cv = document.querySelector('[data-testid=paper] [data-testid=ink-live]')!;
      const ev = (type: string, px: number, py: number, buttons = 1) =>
        cv.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 5,
            pointerType: 'pen',
            pressure: 0.7,
            buttons,
            clientX: px,
            clientY: py,
          }),
        );
      ev('pointerdown', x + w * 0.2, y + h * 0.5);
      for (let i = 1; i <= 30; i++)
        ev('pointermove', x + w * (0.2 + i * 0.02), y + h * (0.5 - Math.sin(i / 5) * 0.2));
      ev('pointerup', x + w * 0.8, y + h * 0.5, 0);
    },
    { x: box.x, y: box.y, w: box.width, h: box.height },
  );
  await page.getByTestId('save').click();
  await page.waitForTimeout(600);
  await page.getByTestId('home').click();
  await expect(page.getByTestId('island-screen-atelier')).toBeVisible();
  await page.getByTestId('island-screen-atelier').getByTestId('home').click();
  await expect(page.getByTestId('map')).toBeVisible();
  await page.getByTestId('album').click();
  await expect(page.locator('[data-testid=album-screen] img')).toHaveCount(1);
});

test('colouring: pick a page, colour a region, save', async ({ page }) => {
  await start(page);
  await openGame(page, 'atelier', 'coloreaza');
  await page.getByTestId('page').first().click();
  await expect(page.getByTestId('sheet')).toBeVisible();
  await page.getByRole('button', { name: 'pink' }).click();
  const region = page.locator('[data-region]').first();
  await region.dispatchEvent('pointerdown');
  await expect(region).toHaveAttribute('fill', '#ff8fc7');
  await page.getByTestId('save').click();
  await page.waitForTimeout(500);
});
