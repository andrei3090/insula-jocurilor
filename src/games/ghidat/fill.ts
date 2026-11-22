import type { Region } from './logic';
import { toD } from './Model';

/**
 * Where a fill may go, as a w×h mask (1 = allowed), drawn in unit coordinates.
 * A region: its shape widened by `pad` (her line may run a little outside), minus the regions drawn on top of
 * it (shrunk by `pad`). The background (index -1): everything except the regions (shrunk by `pad`).
 */
export function allowedMask(
  size: number,
  regions: readonly Region[],
  index: number,
  pad: number,
): Uint8Array {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.setTransform(size, 0, 0, size, 0, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  const own = index >= 0 ? regions[index] : null;
  if (own) {
    const p = new Path2D(toD(own.pts, true));
    ctx.fill(p);
    if ((own.pad ?? pad) > 0) {
      ctx.lineWidth = (own.pad ?? pad) * 2;
      ctx.stroke(p);
    }
  } else ctx.fillRect(0, 0, 1, 1);
  const above = regions.filter((r, i) => i !== index && (!own || r.z > own.z));
  if (above.length) {
    // the regions on top, shrunk by pad: fill them, then cut a band round each border
    const e = document.createElement('canvas');
    e.width = size;
    e.height = size;
    const ex = e.getContext('2d')!;
    ex.setTransform(size, 0, 0, size, 0, 0);
    ex.lineJoin = 'round';
    ex.fillStyle = '#000';
    for (const r of above) ex.fill(new Path2D(toD(r.pts, true)));
    ex.globalCompositeOperation = 'destination-out';
    for (const r of above) {
      if ((r.pad ?? pad) <= 0) continue;
      ex.lineWidth = (r.pad ?? pad) * 2;
      ex.stroke(new Path2D(toD(r.pts, true)));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(e, 0, 0);
  }
  const data = ctx.getImageData(0, 0, size, size).data;
  const out = new Uint8Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  return out;
}

/** Her lines as a barrier mask (1 = ink), read from the ink layer scaled to size×size. */
export function inkBarrier(ink: HTMLCanvasElement, size: number): Uint8Array {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(ink, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const out = new Uint8Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] >= 200 ? 1 : 0;
  return out;
}

const rgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

/** Paint the filled mask onto the colour layer (size×size device pixels). */
export function paintMask(target: HTMLCanvasElement, mask: Uint8Array, color: string) {
  const size = target.width;
  const ctx = target.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, size, size);
  const [r, g, b] = rgb(color);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
