import { expect, test } from '@playwright/test';

// Regression: characters' eyes must blink in place and arms must wave from the shoulder
// (motion pivots SVG on the element's own box; px origins made the eyes "fall off").
test('eyes blink in place and arms wave from the shoulder', async ({ page }) => {
  await page.goto('./#art');
  await page.waitForSelector('[data-part=eyes]');
  const r = await page.evaluate(async () => {
    const pt = (g: SVGGraphicsElement, fx: number, fy: number) => {
      const bb = g.getBBox();
      const q = new DOMPoint(bb.x + bb.width * fx, bb.y + bb.height * fy).matrixTransform(g.getScreenCTM()!);
      return [q.x, q.y];
    };
    // the big figures are idle (no hop), so their eyes and shoulders must not move at all
    const big = [...document.querySelector('.grid')!.children].map((card) => card.querySelector('svg')!);
    const eyes = big.map((s) => s.querySelector('[data-part=eyes]') as SVGGraphicsElement);
    const base = eyes.map((g) => g.getBoundingClientRect());
    let shift = 0;
    let blinked = 0;
    const seen = new Set<number>();
    const t0 = performance.now();
    while (performance.now() - t0 < 9000) {
      await new Promise((res) => setTimeout(res, 25));
      eyes.forEach((g, i) => {
        const b = g.getBoundingClientRect();
        shift = Math.max(shift, Math.abs(b.y + b.height / 2 - (base[i].y + base[i].height / 2)));
        if (b.height < base[i].height * 0.4 && !seen.has(i)) {
          seen.add(i);
          blinked++;
        }
      });
    }
    const arms = [...document.querySelectorAll('[data-part=arm]')] as SVGGraphicsElement[];
    const shoulders = arms.map((g) => {
      const [ox, oy] = (g.dataset.origin ?? '0.25,0.08').split(',').map(Number);
      return { g, ox, oy, p: pt(g, ox, oy) };
    });
    await new Promise((res) => setTimeout(res, 700));
    const shoulderMove = Math.max(
      ...shoulders.map(({ g, ox, oy, p }) => {
        const q = pt(g, ox, oy);
        return Math.hypot(q[0] - p[0], q[1] - p[1]);
      }),
    );
    return { shift, blinked, shoulderMove };
  });
  expect(r.shift).toBeLessThan(1.5);
  expect(r.blinked).toBeGreaterThan(0);
  expect(r.shoulderMove).toBeLessThan(3);
});
