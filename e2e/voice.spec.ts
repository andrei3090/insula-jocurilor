import { expect, test } from '@playwright/test';

// The app's own voice is ON here, but the BROWSER is muted (--mute-audio): nothing reaches the speakers.
// Every voice clip (AudioBufferSourceNode) is recorded: when it starts, when it ends or is stopped.
test.use({
  storageState: { cookies: [], origins: [] },
  launchOptions: { args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] },
});

test.beforeEach(({ browserName }, info) => {
  test.skip(
    browserName !== 'chromium' || info.project.name !== 'tab-s9-land',
    'one muted Chromium is enough',
  );
});

test('one voice at a time: in a played round no sentence is cut by the app itself', async ({ page }) => {
  await page.addInitScript(() => {
    const log: { dur: number; start: number; end?: number }[] = [];
    (window as unknown as { __voiceLog: typeof log }).__voiceLog = log;
    const P = AudioBufferSourceNode.prototype as unknown as {
      start: (...a: unknown[]) => void;
      stop: (...a: unknown[]) => void;
    };
    const start0 = P.start;
    const stop0 = P.stop;
    P.start = function (this: AudioBufferSourceNode & { __rec?: (typeof log)[number] }, ...a: unknown[]) {
      const rec = { dur: this.buffer?.duration ?? 0, start: performance.now() } as (typeof log)[number];
      log.push(rec);
      this.__rec = rec;
      this.addEventListener('ended', () => {
        rec.end ??= performance.now();
      });
      return start0.apply(this, a);
    };
    P.stop = function (this: AudioBufferSourceNode & { __rec?: (typeof log)[number] }, ...a: unknown[]) {
      if (this.__rec) this.__rec.end ??= performance.now();
      return stop0.apply(this, a);
    };
  });
  // her own taps may cut a sentence (leaving a screen, counting, "a pair!"); nothing else may
  const actions: number[] = [];
  const tap = async (id: string) => {
    actions.push(await page.evaluate(() => performance.now()));
    await page.getByTestId(id).click();
  };
  await page.goto('./');
  await tap('start');
  await page.waitForTimeout(1500);
  await tap('island-castel');
  await page.waitForTimeout(1500);
  await tap('card-memorie');
  await page.waitForFunction(() => typeof window.__test?.solve === 'function');
  await page.waitForTimeout(600);
  for (let i = 0; i < 3; i++) {
    actions.push(await page.evaluate(() => performance.now()));
    await page.evaluate(() => window.__test!.solve());
    await page.waitForTimeout(2500);
  }
  await expect(page.getByTestId('round-end')).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(5000);
  const log = await page.evaluate(
    () => (window as unknown as { __voiceLog: { dur: number; start: number; end?: number }[] }).__voiceLog,
  );
  const clips = log.filter((r) => r.dur > 0.25);
  expect(clips.length).toBeGreaterThanOrEqual(4);
  const byChild = (t: number) => actions.some((a) => t >= a - 50 && t <= a + 600);
  const cut = clips.filter(
    (r) => r.end !== undefined && r.end - r.start < r.dur * 1000 - 150 && !byChild(r.end),
  );
  expect(cut, JSON.stringify(cut)).toEqual([]);
  // and never two at the same time
  for (let i = 1; i < clips.length; i++) {
    const prevEnd = clips[i - 1].end ?? clips[i - 1].start + clips[i - 1].dur * 1000;
    expect(clips[i].start).toBeGreaterThanOrEqual(prevEnd - 30);
  }
});
