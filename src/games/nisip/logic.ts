import { dist, distToPath, type Pt, pathLength, resample } from './geometry';
import type { Glyph } from './glyphs';

export const SKILLS = ['trace.strokes', 'trace.upper', 'trace.digits'] as const;
export type NisipSkill = (typeof SKILLS)[number];

export type Tol = { r: number; d: number };
export type Reason = 'start' | 'order' | 'coverage' | 'corridor';
export type StrokeCheck = { ok: boolean; coverage: number; reason?: Reason };

/** Age 4: 12% of the box, tightening linearly to 6% at age 7 and above. */
export function tolerancesForAge(age: number): Tol {
  const t = Math.max(0, Math.min(1, (age - 4) / 3));
  const v = 0.12 - 0.06 * t;
  return { r: v, d: v };
}

export const checkpoints = (guide: readonly Pt[]) =>
  guide.length === 1 ? [guide[0]] : resample(guide, Math.max(5, Math.round(pathLength(guide) / 0.06)));

/** How many checkpoints the drawn samples visit in order (with a small look-ahead window). */
export function progress(drawn: readonly Pt[], cps: readonly Pt[], r: number, from = 0): number {
  let idx = from;
  for (const p of drawn) {
    for (let j = idx; j < Math.min(cps.length, idx + 4); j++) {
      if (dist(p, cps[j]) <= r) {
        idx = j + 1;
        break;
      }
    }
  }
  return idx;
}

export function validateStroke(drawn: readonly Pt[], guide: readonly Pt[], tol: Tol): StrokeCheck {
  if (!drawn.length) return { ok: false, coverage: 0, reason: 'coverage' };
  // a dot: a tap close to it
  if (guide.length === 1) {
    const ok = dist(drawn[0], guide[0]) <= tol.r * 1.2;
    return { ok, coverage: ok ? 1 : 0, reason: ok ? undefined : 'start' };
  }
  const cps = checkpoints(guide);
  const fwd = progress(drawn, cps, tol.r) / cps.length;
  const rev = progress(drawn, [...cps].reverse(), tol.r) / cps.length;
  if (dist(drawn[0], guide[0]) > tol.r) {
    return { ok: false, coverage: fwd, reason: rev >= 0.7 ? 'order' : 'start' };
  }
  if (fwd < 0.5 && rev >= 0.7) return { ok: false, coverage: fwd, reason: 'order' };
  const inside = drawn.filter((p) => distToPath(p, guide) <= tol.d).length / drawn.length;
  if (inside < 0.9) return { ok: false, coverage: fwd, reason: 'corridor' };
  if (fwd < 0.85) return { ok: false, coverage: fwd, reason: 'coverage' };
  return { ok: true, coverage: fwd };
}

/**
 * Check one drawn stroke against a glyph. From age 6 the strokes must come in the taught order;
 * younger children may do them in any order.
 */
export function matchGlyphStroke(
  drawn: readonly Pt[],
  glyph: Glyph,
  done: readonly number[],
  age: number,
  tol: Tol = tolerancesForAge(age),
): { ok: boolean; index?: number; reason?: Reason } {
  const pending = glyph.strokes.map((_, i) => i).filter((i) => !done.includes(i));
  const candidates = age >= 6 ? pending.slice(0, 1) : pending;
  let best: Reason | undefined;
  for (const i of candidates) {
    const c = validateStroke(drawn, glyph.strokes[i], tol);
    if (c.ok) return { ok: true, index: i };
    best ??= c.reason;
  }
  return { ok: false, reason: best ?? 'coverage' };
}

/**
 * Next glyph to practise: mostly the frontier (the first one not yet mastered, or the one after it),
 * sometimes a review of a mastered one. Mastered = Leitner box ≥ 3.
 */
export function pickGlyph(
  list: readonly Glyph[],
  boxes: Readonly<Record<string, number>>,
  rand: () => number,
  prevId?: string,
): Glyph {
  const mastered = (g: Glyph) => (boxes[`T-${g.id}`] ?? 0) >= 3;
  const frontier = list.findIndex((g) => !mastered(g));
  const f = frontier === -1 ? list.length - 1 : frontier;
  const reviews = list.slice(0, f).filter((g) => g.id !== prevId);
  if (reviews.length && rand() < 0.3) return reviews[Math.floor(rand() * reviews.length)];
  const window = list.slice(f, f + 2).filter((g) => g.id !== prevId);
  return window[Math.floor(rand() * window.length)] ?? list[f];
}
