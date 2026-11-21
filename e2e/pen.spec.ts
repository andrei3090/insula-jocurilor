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
