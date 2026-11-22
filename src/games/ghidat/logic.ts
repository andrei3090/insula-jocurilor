import { dist, distToPath, type Pt, pathLength, resample } from '../nisip/geometry';
import { type Tol, tolerancesForAge } from '../nisip/logic';

export const SKILLS = ['draw.shapes'] as const;

/** Visited checkpoints, one array per path of the current step. */
export type StepProgress = boolean[][];

const isDot = (path: readonly Pt[]) => path.length === 1;

/** Checkpoints about every 0.03 of the box (a dot has one). */
export function checkpointsOf(path: readonly Pt[]): Pt[] {
  if (isDot(path)) return [path[0]];
  return resample(path, Math.max(6, Math.ceil(pathLength(path) / 0.03)));
}

/**
 * Radius that marks a checkpoint as drawn: the age tolerance, but at most a sixth of a short path,
 * so one tap cannot finish a line or a small circle.
 */
export function coverRadius(path: readonly Pt[], r: number): number {
  if (isDot(path)) return r * 1.3;
  return Math.min(r, Math.max(0.03, pathLength(path) / 6));
}

/** Share of a path that must be drawn: 80% at age 4, rising to 88% at age 7 and over. */
export function coverageNeed(age: number): number {
  const t = Math.max(0, Math.min(1, (age - 4) / 3));
  return 0.8 + 0.08 * t;
}

/** Age tolerances; the errorless rung (4) widens them by 1.6. */
export function tolFor(age: number, errorless: boolean): Tol {
  const t = tolerancesForAge(age);
  return errorless ? { r: t.r * 1.6, d: t.d * 1.6 } : t;
}

export const emptyProgress = (paths: readonly (readonly Pt[])[]): StepProgress =>
  paths.map((p) => checkpointsOf(p).map(() => false));

/** Share of the stroke samples that lie within d of any path of the step (a dot counts with 1.3 d). */
export function onGuide(samples: readonly Pt[], paths: readonly (readonly Pt[])[], d: number): number {
  if (!samples.length) return 0;
  const near = samples.filter((s) => paths.some((p) => distToPath(s, p) <= (isDot(p) ? d * 1.3 : d))).length;
  return near / samples.length;
}

export const pathCoverage = (visited: readonly boolean[]) =>
  visited.length ? visited.filter(Boolean).length / visited.length : 0;

export const pathDone = (visited: readonly boolean[], need: number) => pathCoverage(visited) >= need;

export const stepDone = (prog: StepProgress, need: number) => prog.every((v) => pathDone(v, need));

/**
 * One finished stroke on the current step. It is accepted when at least 70% of its samples lie on the
 * guide; then every checkpoint it passes near is marked, in any order and any direction.
 */
export function applyStroke(
  prog: StepProgress,
  samples: readonly Pt[],
  paths: readonly (readonly Pt[])[],
  tol: Tol,
  need: number,
): { prog: StepProgress; accepted: boolean; done: boolean } {
  if (onGuide(samples, paths, tol.d) < 0.7) return { prog, accepted: false, done: stepDone(prog, need) };
  const next = paths.map((path, i) => {
    const r = coverRadius(path, tol.r);
    return checkpointsOf(path).map((c, j) => prog[i][j] || samples.some((s) => dist(s, c) <= r));
  });
  return { prog: next, accepted: true, done: stepDone(next, need) };
}

/** Even-odd point-in-polygon test (the polygon may or may not repeat its first point). */
export function pointInPolygon(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Longest run of samples (wrapping round a closed path) for which `inside` is false. */
export function outsideRun(path: readonly Pt[], inside: (p: Pt) => boolean): Pt[] {
  const closed = path.length > 2 && dist(path[0], path[path.length - 1]) < 1e-6;
  const pts = closed ? path.slice(0, -1) : [...path];
  const firstIn = pts.findIndex((p) => inside(p));
  if (firstIn === -1) return closed ? [...pts, pts[0]] : pts;
  // a closed path is rotated to start on an inside sample, so a run that wraps round is found whole
  const seq = closed ? [...pts.slice(firstIn), ...pts.slice(0, firstIn)] : pts;
  let best: Pt[] = [];
  let run: Pt[] = [];
  for (const p of seq) {
    if (inside(p)) run = [];
    else {
      run.push(p);
      if (run.length > best.length) best = [...run];
    }
  }
  return best;
}

/** A colourable shape. `pad`: how far a fill may reach past it towards her line (0 for eyes: no line round them). */
export type Region = { pts: Pt[]; z: number; suggest: string; pad?: number };

/**
 * Which colour region a tap at p means: the top one (highest z) that contains p, or whose border is within
 * its pad (her line may run a little outside the ideal shape; `pad` is the default). -1 = the background.
 */
export function pickRegion(p: Pt, regions: readonly Region[], pad: number): number {
  let best = -1;
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    const hit = pointInPolygon(p, r.pts) || distToPath(p, r.pts) <= (r.pad ?? pad);
    if (hit && (best === -1 || r.z >= regions[best].z)) best = i;
  }
  return best;
}

/**
 * Scanline flood fill. `barrier[i] = 1` blocks a pixel (her ink); `allowed` (optional) limits the fill to a
 * mask. If the start pixel is blocked, the nearest free pixel within `search` px is used.
 * Returns the filled mask (1 = filled).
 */
export function floodFill(
  w: number,
  h: number,
  barrier: Uint8Array,
  allowed: Uint8Array | null,
  sx: number,
  sy: number,
  search = 8,
): Uint8Array {
  const out = new Uint8Array(w * h);
  const ok = (i: number) => !barrier[i] && (!allowed || allowed[i] === 1) && !out[i];
  const x0 = Math.round(sx);
  const y0 = Math.round(sy);
  let start = -1;
  let bestD = Number.POSITIVE_INFINITY;
  for (let dy = -search; dy <= search; dy++) {
    for (let dx = -search; dx <= search; dx++) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const d = dx * dx + dy * dy;
      if (d < bestD && ok(y * w + x)) {
        bestD = d;
        start = y * w + x;
      }
    }
  }
  if (start < 0) return out;
  const stack = [start];
  while (stack.length) {
    const i = stack.pop() as number;
    if (!ok(i)) continue;
    const y = Math.floor(i / w);
    const row = y * w;
    let l = i - row;
    let r = l;
    while (l > 0 && ok(row + l - 1)) l--;
    while (r < w - 1 && ok(row + r + 1)) r++;
    out.fill(1, row + l, row + r + 1);
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= h) continue;
      let open = false;
      for (let x = l; x <= r; x++) {
        const j = ny * w + x;
        if (ok(j)) {
          if (!open) stack.push(j);
          open = true;
        } else open = false;
      }
    }
  }
  return out;
}

/** Let a fill run `steps` pixels into her line (4-neighbours), so no paper shows between the colour and the ink. */
export function growInto(mask: Uint8Array, barrier: Uint8Array, w: number, steps = 2): Uint8Array {
  let cur = mask;
  for (let s = 0; s < steps; s++) {
    const next = cur.slice();
    for (let i = 0; i < cur.length; i++) {
      if (cur[i] || !barrier[i]) continue;
      const x = i % w;
      if (
        (x > 0 && cur[i - 1]) ||
        (x < w - 1 && cur[i + 1]) ||
        (i >= w && cur[i - w]) ||
        (i + w < cur.length && cur[i + w])
      )
        next[i] = 1;
    }
    cur = next;
  }
  return cur;
}
