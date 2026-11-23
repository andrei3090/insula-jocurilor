import { expect, test } from '@playwright/test';
import { openGame, start, traceGuide } from './helpers';

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

test('guided drawing: the sun traced with the S Pen, then coloured inside her lines and saved', async ({
  page,
}) => {
  await start(page);
  await openGame(page, 'atelier', 'ghidat');
  await page.getByTestId('drawing-soare').click();
  const paper = page.getByTestId('paper');
  await expect(paper).toHaveAttribute('data-step', '0');
  // the paper takes its size first, then the ink surface appears
  await page.locator('[data-testid=paper] [data-testid=ink-live]').waitFor();

  // draw a polyline (unit coordinates of the paper) as one pen stroke
  const stroke = (pts: number[][]) =>
    page.evaluate(async (pts) => {
      const cv = document.querySelector('[data-testid=paper] [data-testid=ink-live]')!;
      const r = cv.getBoundingClientRect();
      const P = (type: string, x: number, y: number, b = 1) =>
        cv.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 7,
            pointerType: 'pen',
            pressure: 0.6,
            buttons: b,
            clientX: r.left + x * r.width,
            clientY: r.top + y * r.height,
          }),
        );
      P('pointerdown', pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) P('pointermove', p[0], p[1]);
      const last = pts[pts.length - 1];
      P('pointerup', last[0], last[1], 0);
      await new Promise((res) => setTimeout(res, 150));
    }, pts);
  const around = (cx: number, cy: number, rx: number, ry: number, a0 = -90, a1 = 270, n = 60) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });

  // a scribble in the corner is not taken, and the step stays
  await stroke([
    [0.05, 0.05],
    [0.12, 0.08],
    [0.06, 0.12],
  ]);
  await expect(paper).toHaveAttribute('data-step', '0');

  // 1 the face: a slightly wobbly circle, in two strokes
  const face = around(0.5, 0.5, 0.245, 0.235);
  await stroke(face.slice(0, 35));
  await expect(paper).toHaveAttribute('data-step', '0');
  await stroke(face.slice(33));
  await expect(paper).toHaveAttribute('data-step', '1');
  // 2 six rays
  for (const a of [-90, -30, 30, 90, 150, 210]) {
    const c = Math.cos((a * Math.PI) / 180);
    const s = Math.sin((a * Math.PI) / 180);
    await stroke([0.31, 0.34, 0.37, 0.4, 0.44].map((d) => [0.5 + d * c, 0.5 + d * s]));
  }
  await expect(paper).toHaveAttribute('data-step', '2');
  // 3 two eyes: a tap each
  await stroke([[0.42, 0.45]]);
  await stroke([[0.58, 0.45]]);
  await expect(paper).toHaveAttribute('data-step', '3');
  // 4 the smile
  await stroke(around(0.5, 0.53, 0.11, 0.09, 20, 160, 20));
  await expect(paper).toHaveAttribute('data-phase', 'color');

  // colour the face yellow and the sky blue: each stays on its side of her line
  const box = (await paper.boundingBox())!;
  await page.getByRole('button', { name: 'yellow', exact: true }).click();
  await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.6);
  await page.getByRole('button', { name: 'blue', exact: true }).click();
  await page.mouse.click(box.x + box.width * 0.08, box.y + box.height * 0.92);
  const px = (x: number, y: number) =>
    page.evaluate(
      ([x, y]) => {
        const c = document.querySelector<HTMLCanvasElement>('[data-testid=fill]')!;
        const d = c
          .getContext('2d')!
          .getImageData(Math.round(x * c.width), Math.round(y * c.height), 1, 1).data;
        return [d[0], d[1], d[2], d[3]];
      },
      [x, y],
    );
  expect(await px(0.35, 0.6)).toEqual([255, 216, 76, 255]);
  expect(await px(0.08, 0.92)).toEqual([76, 141, 240, 255]);
  expect(await px(0.5, 0.68)).toEqual([255, 216, 76, 255]);

  await page.getByTestId('save').click();
  await expect(page.getByTestId('round-end')).toBeVisible({ timeout: 8000 });
});

for (const id of ['soare', 'peste', 'floare', 'panda', 'urs', 'testoasa', 'castel']) {
  test(`guided drawing: ${id} can be finished by tracing its guides`, async ({ page }) => {
    await start(page);
    await openGame(page, 'atelier', 'ghidat');
    // every drawing is open from level 13
    await page.evaluate(() => window.__test?.level?.(14));
    await page.getByTestId(`drawing-${id}`).click();
    await page.locator('[data-testid=paper] [data-testid=ink-live]').waitFor();
    await page.waitForTimeout(400);
    const paper = page.getByTestId('paper');
    for (let i = 0; i < 8 && (await paper.getAttribute('data-phase')) === 'draw'; i++) await traceGuide(page);
    await expect(paper).toHaveAttribute('data-phase', 'color');
  });
}
