import { expect, type Page, test } from '@playwright/test';
import { pickAge } from './helpers';

// The child app on a phone: the tablet layout, scaled down, nothing clipped (bug B18).
test.use({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

async function fullyVisible(page: Page, testId: string) {
  const all = page.locator(`[data-testid="${testId}"]`);
  await expect(all.first()).toBeVisible();
  const view = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  for (const el of await all.all()) {
    const b = (await el.boundingBox())!;
    expect(b.x, `${testId} left edge`).toBeGreaterThanOrEqual(-1);
    expect(b.y, `${testId} top edge`).toBeGreaterThanOrEqual(-1);
    expect(b.x + b.width, `${testId} right edge`).toBeLessThanOrEqual(view.w + 1);
    expect(b.y + b.height, `${testId} bottom edge`).toBeLessThanOrEqual(view.h + 1);
  }
}

async function walk(page: Page) {
  await fullyVisible(page, 'start');
  await page.getByTestId('start').click();
  await fullyVisible(page, 'age-small');
  await fullyVisible(page, 'age-big');
  await pickAge(page);
  for (const id of ['bambus', 'pestera', 'castel', 'laguna', 'atelier'])
    await fullyVisible(page, `island-${id}`);
  await fullyVisible(page, 'album');
  await page.getByTestId('island-bambus').click();
  await fullyVisible(page, 'home');
  for (const id of ['cifre', 'panda', 'puncte']) await fullyVisible(page, `card-${id}`);
  await page.getByTestId('card-panda').click();
  await expect(page.getByTestId('game-panda')).toBeVisible();
  await fullyVisible(page, 'home');
  await fullyVisible(page, 'basket');
}

test.beforeEach(({ browserName: _ }, info) => {
  test.skip(info.project.name !== 'tab-s9-land', 'phone sizes are set here; one project is enough');
});

test('phone portrait: the child app shows the tablet layout, nothing clipped', async ({ page }) => {
  await page.goto('./');
  const layout = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  expect(layout.w).toBeGreaterThanOrEqual(640);
  await walk(page);
});

test('phone turned sideways: it rescales and still fits', async ({ page }) => {
  await page.goto('./');
  await page.setViewportSize({ width: 780, height: 360 });
  await expect.poll(() => page.evaluate(() => innerHeight)).toBeGreaterThanOrEqual(640);
  await walk(page);
});

test('phone portrait: all eight xylophone bars are on screen', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('start').click();
  await pickAge(page);
  await page.getByTestId('island-pestera').click();
  await page.getByTestId('card-xilofon').click();
  for (let i = 0; i < 8; i++) await fullyVisible(page, `bar-${i}`);
});

test('tablets are left exactly as they were', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('./');
  const content = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(content).toContain('width=device-width, initial-scale=1');
  expect(await page.evaluate(() => innerWidth)).toBe(1024);
});

test('the parent app keeps its own phone layout', async ({ page }) => {
  await page.goto('./parinti/');
  expect(await page.evaluate(() => innerWidth)).toBe(360);
});

test('parent app on a phone: chip rows stay inside their card, one page colour', async ({ page }) => {
  await page.goto('./parinti/');
  // each tab with a card of chip rows, and a control that only that tab has (tabs cross-fade)
  for (const [tab, mark] of [
    ['creeaza', 'generate'],
    ['poveste', 'make-story'],
    ['poza', 'generate-photo'],
  ]) {
    await page.getByTestId(`nav-${tab}`).click();
    await expect(page.getByTestId(mark)).toBeVisible();
    await expect(page.getByTestId(`tab-${tab}`).locator('section .overflow-x-auto').first()).toBeVisible();
    const outside = await page.evaluate(
      (tab) =>
        [...document.querySelectorAll('section')].flatMap((card) => {
          const c = card.getBoundingClientRect();
          return [...card.querySelectorAll('div.overflow-x-auto')]
            .map((row) => row.getBoundingClientRect())
            .filter((r) => r.left < c.left - 0.5 || r.right > c.right + 0.5)
            .map((r) => `${tab}: row ${r.left}..${r.right} outside card ${c.left}..${c.right}`);
        }),
      tab,
    );
    expect(outside).toEqual([]);
  }
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(250, 246, 255)');
});
