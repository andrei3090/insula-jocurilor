/**
 * The child app is laid out for a tablet (Galaxy Tab S9, iPad): every screen fits once the
 * short side has at least DESIGN_SHORT CSS px and the long side DESIGN_LONG. A phone is smaller,
 * so instead of clipping we ask the browser for a wider layout viewport and let it scale the
 * whole page down. The browser does the scaling, so touch and pen coordinates stay exact.
 */
export const DESIGN_SHORT = 640;
export const DESIGN_LONG = 940;

/** must match the meta tag in index.html */
export const NATIVE_VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

/** Page scale for a device of w × h CSS px (at scale 1): 1 on tablets, < 1 on phones. */
export function fitScale(w: number, h: number): number {
  if (!(w > 0 && h > 0)) return 1;
  const s = Math.min(1, Math.min(w, h) / DESIGN_SHORT, Math.max(w, h) / DESIGN_LONG);
  // round down, so the scaled layout is never smaller than the design
  return Math.floor(s * 10_000) / 10_000;
}

export function viewportFor(w: number, h: number): string {
  const s = fitScale(w, h);
  if (s === 1) return NATIVE_VIEWPORT;
  return `width=${Math.ceil(w / s)}, initial-scale=${s}, minimum-scale=${s}, maximum-scale=${s}, user-scalable=no, viewport-fit=cover`;
}

type Host = {
  innerWidth: number;
  innerHeight: number;
  visualViewport?: { width: number; height: number; scale: number } | null;
  document: {
    querySelector(
      sel: string,
    ): { getAttribute(n: string): string | null; setAttribute(n: string, v: string): void } | null;
  };
  addEventListener(type: 'resize', fn: () => void): void;
  removeEventListener(type: 'resize', fn: () => void): void;
};

/**
 * Keeps the viewport meta fitted to the device. The device size is measured, never assumed:
 * visible layout px × the page scale the browser really applied. So a browser that ignores
 * the meta just stays at scale 1. Only a new width (rotation) rescales; a height-only change
 * (keyboard, browser bars) does not, so the page never jumps while typing.
 */
export function installPhoneFit(host: Host = window): () => void {
  const meta = host.document.querySelector('meta[name="viewport"]');
  if (!meta) return () => {};
  let lastW = 0;
  const refit = () => {
    const vv = host.visualViewport;
    const k = vv?.scale || 1;
    const w = (vv?.width ?? host.innerWidth) * k;
    const h = (vv?.height ?? host.innerHeight) * k;
    if (lastW && Math.abs(w - lastW) / lastW < 0.02) return;
    lastW = w;
    const next = viewportFor(w, h);
    if (meta.getAttribute('content') !== next) meta.setAttribute('content', next);
  };
  refit();
  host.addEventListener('resize', refit);
  return () => host.removeEventListener('resize', refit);
}
