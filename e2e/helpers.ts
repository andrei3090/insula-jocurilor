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

/** Trace every dashed guide of the current guided-drawing step with a slightly wobbly S Pen. */
export const traceGuide = (page: Page) =>
  page.evaluate(async () => {
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
    const svg = document.querySelector('[data-testid=paper] svg')!;
    const paths = [...svg.querySelectorAll('path[stroke-dasharray]')].map((p) =>
      p
        .getAttribute('d')!
        .split(/[ML]/)
        .filter(Boolean)
        .map((s) => s.trim().split(' ').map(Number)),
    );
    const dots = [...svg.querySelectorAll('circle[stroke-dasharray]')].map((c) => [
      Number(c.getAttribute('cx')),
      Number(c.getAttribute('cy')),
    ]);
    let k = 0;
    for (const raw of paths) {
      // a real pen sends many samples: densify the guide's corners
      const pts: number[][] = [raw[0]];
      for (let i = 1; i < raw.length; i++)
        for (let t = 1; t <= 6; t++)
          pts.push([
            raw[i - 1][0] + ((raw[i][0] - raw[i - 1][0]) * t) / 6,
            raw[i - 1][1] + ((raw[i][1] - raw[i - 1][1]) * t) / 6,
          ]);
      P('pointerdown', pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) {
        k++;
        P('pointermove', p[0] + 0.008 * Math.sin(k / 3), p[1] + 0.008 * Math.cos(k / 4));
      }
      P('pointerup', pts.at(-1)![0], pts.at(-1)![1], 0);
      await new Promise((res) => setTimeout(res, 120));
    }
    for (const d of dots) {
      P('pointerdown', d[0], d[1]);
      P('pointerup', d[0], d[1], 0);
      await new Promise((res) => setTimeout(res, 120));
    }
    await new Promise((res) => setTimeout(res, 300));
  });

declare global {
  interface Window {
    __test?: { solve(): void; fail(): void };
  }
}
