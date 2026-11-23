import { expect, test } from '@playwright/test';
import { openGame, pickAge, start } from './helpers';

test('the age groups show their own games', async ({ page }) => {
  await start(page, 'small');
  await page.getByTestId('island-castel').click();
  await expect(page.getByTestId('card-bule')).toBeVisible();
  await page.getByTestId('island-screen-castel').getByTestId('home').click();
  await page.getByTestId('island-laguna').click();
  await expect(page.getByTestId('card-navigator')).toHaveCount(0);

  await page.goto('./');
  await page.getByTestId('start').click();
  await pickAge(page, 'big');
  await page.getByTestId('island-laguna').click();
  await expect(page.getByTestId('card-navigator')).toBeVisible();
  await page.getByTestId('island-screen-laguna').getByTestId('home').click();
  await page.getByTestId('island-castel').click();
  await expect(page.getByTestId('card-bule')).toHaveCount(0);
  await page.getByTestId('island-screen-castel').getByTestId('home').click();
  await page.getByTestId('island-pestera').click();
  await expect(page.getByTestId('card-modele')).toBeVisible();
  await expect(page.getByTestId('card-umbre')).toHaveCount(0);
});

test('Bule de săpun: a wrong bubble does not pop; the right ones pop and finish the item', async ({
  page,
}) => {
  await start(page);
  await openGame(page, 'castel', 'bule');
  const right = page.getByTestId('bubble-right');
  const before = await right.count();
  expect(before).toBeGreaterThanOrEqual(2);
  // bubbles bob gently forever, so Playwright never sees them "stable": click at their centre anyway
  await page.getByTestId('bubble').first().click({ force: true });
  await page.waitForTimeout(500);
  await expect(page.getByTestId('bubble')).not.toHaveCount(0);
  await expect(page.getByTestId('bead-done')).toHaveCount(0);
  for (let i = 0; i < before; i++) {
    await page.getByTestId('bubble-right').first().click({ force: true });
    await page.waitForTimeout(350);
  }
  await expect(page.getByTestId('bead-done')).toHaveCount(1, { timeout: 8000 });
});

test('Umbrele animalelor: dragging the animal onto its shadow finishes the item', async ({ page }) => {
  await start(page);
  await openGame(page, 'pestera', 'umbre');
  const animal = page.getByTestId('animal');
  const target = page.getByTestId('shadow-right');
  const a = (await animal.boundingBox())!;
  const b = (await target.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++)
    await page.mouse.move(
      a.x + a.width / 2 + ((b.x + b.width / 2 - a.x - a.width / 2) * k) / 12,
      a.y + a.height / 2 + ((b.y + b.height / 2 - a.y - a.height / 2) * k) / 12,
    );
  await page.mouse.up();
  await expect(page.getByTestId('bead-done')).toHaveCount(1, { timeout: 8000 });
});

test('Navigatorul stelelor: arrows go in the strip, a tap removes one, "Pornim" waits for arrows', async ({
  page,
}) => {
  await start(page, 'big');
  await openGame(page, 'laguna', 'navigator');
  await expect(page.getByTestId('go')).toBeDisabled();
  await page.getByTestId('arrow-R').click();
  await page.getByTestId('arrow-U').click();
  await expect(page.getByTestId('step')).toHaveCount(2);
  await page.getByTestId('step').first().click();
  await expect(page.getByTestId('step')).toHaveCount(1);
  await page.getByTestId('step').first().click();
  await expect(page.getByTestId('step')).toHaveCount(0);
  await expect(page.getByTestId('go')).toBeDisabled();
  await page.evaluate(() => window.__test!.solve());
  await expect(page.getByTestId('bead-done')).toHaveCount(1, { timeout: 10000 });
});

test('Modele în peșteră: a wrong piece shakes and the "?" stays; the right one fills it', async ({
  page,
}) => {
  await start(page, 'big');
  await openGame(page, 'pestera', 'modele');
  await page.getByTestId('option').first().click();
  await page.waitForTimeout(500);
  await expect(page.getByTestId('gap')).toBeVisible();
  await expect(page.getByTestId('bead-done')).toHaveCount(0);
  await page.getByTestId('option-right').click();
  await expect(page.getByTestId('bead-done')).toHaveCount(1, { timeout: 8000 });
});
