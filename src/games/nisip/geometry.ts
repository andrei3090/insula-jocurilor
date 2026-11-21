export type Pt = { x: number; y: number };

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export const line = (...pts: [number, number][]): Pt[] => pts.map(([x, y]) => ({ x, y }));

/** Elliptic arc sampled every ~6°. Angles in degrees, y grows downwards (screen), a0 → a1 in that order. */
export function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Pt[] {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 6));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

export const join = (...parts: Pt[][]): Pt[] => parts.flatMap((p, i) => (i ? p.slice(1) : p));

export const pathLength = (pts: readonly Pt[]) => pts.slice(1).reduce((s, p, i) => s + dist(p, pts[i]), 0);

/** n evenly spaced points along a polyline (n ≥ 2), first = start, last = end. */
export function resample(pts: readonly Pt[], n: number): Pt[] {
  if (pts.length === 1) return [pts[0]];
  const total = pathLength(pts);
  const out: Pt[] = [pts[0]];
  const step = total / (n - 1);
  let acc = 0;
  for (let i = 1; i < pts.length && out.length < n; i++) {
    let a = pts[i - 1];
    const b = pts[i];
    let seg = dist(a, b);
    while (acc + seg >= step && out.length < n) {
      const t = (step - acc) / seg;
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(p);
      a = p;
      seg = dist(a, b);
      acc = 0;
    }
    acc += seg;
  }
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out;
}

/** Distance from a point to a polyline. */
export function distToPath(p: Pt, pts: readonly Pt[]): number {
  if (pts.length === 1) return dist(p, pts[0]);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}
