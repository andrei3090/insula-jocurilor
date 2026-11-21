import { expect, test } from '@playwright/test';
import { openGame, start } from './helpers';

// Regression B6: the sand must accept a real S Pen stroke along the groove.
test('sand writing accepts an S Pen stroke traced along the groove', async ({ page }) => {
  await start(page);
  await openGame(page, 'laguna', 'nisip');
  await page.evaluate(async () => {
    const cv = document.querySelector('[data-testid=sand] [data-testid=ink-live]')!;
    const r = cv.getBoundingClientRect();
    if (r.height < 100) throw new Error(`sand surface too small: ${r.height}`);
    const P = (type: string, x: number, y: number, b = 1) =>
      cv.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 9,
          pointerType: 'pen',
          pressure: 0.6,
          buttons: b,
          clientX: r.left + x * r.width,
          clientY: r.top + y * r.height,
        }),
      );
    const groove = document.querySelector('[data-testid=sand] svg path[d^="M"]');
    if (groove) {
      const pts = groove
        .getAttribute('d')!
        .split(/[ML]/)
        .filter(Boolean)
        .map((s) => s.trim().split(' ').map(Number));
      const dense: number[][] = [];
      for (let i = 1; i < pts.length; i++)
        for (let k = 0; k < 10; k++)
          dense.push([
            pts[i - 1][0] + ((pts[i][0] - pts[i - 1][0]) * k) / 10,
            pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * k) / 10,
          ]);
      dense.push(pts[pts.length - 1]);
      P('pointerdown', dense[0][0], dense[0][1]);
      for (const p of dense.slice(1)) P('pointermove', p[0], p[1]);
      P('pointerup', dense[dense.length - 1][0], dense[dense.length - 1][1], 0);
    } else {
      // rain drops: tap each dot
      for (const c of document.querySelectorAll('[data-testid=sand] svg circle')) {
        const x = Number(c.getAttribute('cx'));
        const y = Number(c.getAttribute('cy'));
        P('pointerdown', x, y);
        P('pointerup', x, y, 0);
        await new Promise((res) => setTimeout(res, 120));
      }
    }
  });
  await expect(page.getByTestId('bead-done')).toHaveCount(1, { timeout: 8000 });
});

test('connect-the-dots: an S Pen stroke through the dots in order completes the picture', async ({
  page,
}) => {
  await start(page);
  await openGame(page, 'bambus', 'puncte');
  await page.evaluate(async () => {
    const svg = document.querySelector('[data-testid=dots-board]')!;
    const r = svg.getBoundingClientRect();
    const cs = [...svg.querySelectorAll('circle')].map((c) => [
      r.left + Number(c.getAttribute('cx')),
      r.top + Number(c.getAttribute('cy')),
    ]);
    const P = (t: string, x: number, y: number, b = 1) =>
      svg.dispatchEvent(
        new PointerEvent(t, {
          bubbles: true,
          cancelable: true,
          pointerId: 12,
          pointerType: 'pen',
          pressure: 0.6,
          buttons: b,
          clientX: x,
          clientY: y,
        }),
      );
    P('pointerdown', cs[0][0], cs[0][1]);
    for (let i = 1; i < cs.length; i++)
      for (let k = 1; k <= 10; k++)
        P(
          'pointermove',
          cs[i - 1][0] + ((cs[i][0] - cs[i - 1][0]) * k) / 10,
          cs[i - 1][1] + ((cs[i][1] - cs[i - 1][1]) * k) / 10,
        );
    P('pointerup', cs[cs.length - 1][0], cs[cs.length - 1][1], 0);
  });
  await expect(page.getByTestId('bead-done')).toHaveCount(1, { timeout: 10000 });
});

test('sand writing: choosing "Cifre" shows a digit to trace', async ({ page }) => {
  await start(page);
  await page.getByTestId('island-laguna').click();
  await page.getByTestId('card-nisip').click();
  await page.getByTestId('pick-digits').click();
  await expect(page.getByTestId('sand')).toBeVisible();
  await expect(page.getByTestId('sand').locator('span').first()).toHaveText(/^[0-9]$/);
});
