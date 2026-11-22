import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DESIGN_LONG, DESIGN_SHORT, fitScale, installPhoneFit, NATIVE_VIEWPORT, viewportFor } from './fit';

describe('phone fit', () => {
  it('tablets keep their native size', () => {
    for (const [w, h] of [
      [640, 1024], // Galaxy Tab S9 portrait
      [1024, 640], // Galaxy Tab S9 landscape
      [944, 656], // iPad landscape
      [1180, 820],
    ])
      expect(fitScale(w, h), `${w}x${h}`).toBe(1);
    expect(viewportFor(1024, 640)).toBe(NATIVE_VIEWPORT);
  });

  it('phones get the tablet layout, scaled down to fit', () => {
    expect(fitScale(360, 780)).toBe(0.5625);
    expect(fitScale(780, 360)).toBe(0.5625);
    expect(fitScale(412, 915)).toBe(0.6437);
    expect(fitScale(780, 304)).toBe(0.475); // landscape in the browser, under the address bar
    for (const [w, h] of [
      [360, 780],
      [780, 360],
      [412, 915],
      [915, 412],
      [780, 304],
      [320, 658],
    ]) {
      const s = fitScale(w, h);
      expect(Math.min(w, h) / s, `${w}x${h}`).toBeGreaterThanOrEqual(DESIGN_SHORT);
      expect(Math.max(w, h) / s, `${w}x${h}`).toBeGreaterThanOrEqual(DESIGN_LONG);
    }
    const v = viewportFor(360, 780);
    expect(v).toContain('width=640,');
    expect(v).toContain('initial-scale=0.5625');
    expect(v).toContain('maximum-scale=0.5625');
    expect(v).toContain('user-scalable=no');
  });

  it('the native viewport is the one index.html starts with', () => {
    expect(readFileSync('index.html', 'utf8')).toContain(`content="${NATIVE_VIEWPORT}"`);
  });

  it('odd sizes never break the page', () => {
    expect(fitScale(0, 0)).toBe(1);
    expect(fitScale(Number.NaN, 500)).toBe(1);
  });
});

/** A fake browser window: `vv` is what the browser shows (layout px) and the page scale it applied. */
function fakeHost(w: number, h: number) {
  let content = NATIVE_VIEWPORT;
  const meta = { getAttribute: () => content, setAttribute: (_: string, v: string) => (content = v) };
  let onResize: () => void = () => {};
  const host = {
    vv: { width: w, height: h, scale: 1 },
    get innerWidth() {
      return host.vv.width;
    },
    get innerHeight() {
      return host.vv.height;
    },
    get visualViewport() {
      return host.vv;
    },
    document: { querySelector: () => meta },
    addEventListener: (_: string, fn: () => void) => (onResize = fn),
    removeEventListener: () => {},
    /** what a browser that honours the meta does next */
    honour() {
      const s = Number(/initial-scale=([\d.]+)/.exec(content)?.[1] ?? 1);
      const dw = host.vv.width * host.vv.scale;
      const dh = host.vv.height * host.vv.scale;
      host.vv = { width: dw / s, height: dh / s, scale: s };
      onResize();
    },
    resizeDevice(dw: number, dh: number) {
      const s = host.vv.scale;
      host.vv = { width: dw / s, height: dh / s, scale: s };
      onResize();
    },
    content: () => content,
  };
  return host;
}

describe('installPhoneFit', () => {
  it('scales a phone once and stays put after the browser applies it', () => {
    const host = fakeHost(360, 780);
    installPhoneFit(host);
    expect(host.content()).toContain('initial-scale=0.5625');
    host.honour();
    expect(host.innerWidth).toBe(640);
    expect(host.content()).toContain('initial-scale=0.5625');
  });

  it('rotating the phone recomputes from the real device size', () => {
    const host = fakeHost(360, 780);
    installPhoneFit(host);
    host.honour();
    host.resizeDevice(780, 304); // landscape, with the address bar
    expect(host.content()).toContain('initial-scale=0.475');
    host.honour();
    expect(host.innerHeight).toBeCloseTo(640, 0);
  });

  it('the keyboard or the browser bars (height only) never rescale', () => {
    const host = fakeHost(360, 780);
    installPhoneFit(host);
    host.honour();
    const before = host.content();
    host.resizeDevice(360, 420);
    expect(host.content()).toBe(before);
  });

  it('a browser that ignores the meta does not spiral', () => {
    const host = fakeHost(360, 780);
    installPhoneFit(host);
    host.resizeDevice(360, 780); // resize event, but the page scale stayed 1
    expect(host.content()).toContain('initial-scale=0.5625');
  });

  it('a tablet is left exactly as it was', () => {
    const host = fakeHost(1024, 640);
    installPhoneFit(host);
    expect(host.content()).toBe(NATIVE_VIEWPORT);
  });
});
