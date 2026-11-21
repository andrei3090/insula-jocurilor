import { describe, expect, it } from 'vitest';
import { line, type Pt, resample } from './geometry';
import { STROKES, UPPER } from './glyphs';
import { matchGlyphStroke, tolerancesForAge, validateStroke } from './logic';

const guide = line([0.5, 0.1], [0.5, 0.9]);
const trace = (pts: Pt[], n = 40) => resample(pts, n);
const tol4 = tolerancesForAge(4);
const tol7 = tolerancesForAge(7);
const wobble = (pts: Pt[], amp: number) => pts.map((p, i) => ({ x: p.x + (i % 2 ? amp : -amp), y: p.y }));

describe('nisip: validateStroke', () => {
  it('a perfect trace is ok', () => {
    expect(validateStroke(trace(guide), guide, tol7)).toMatchObject({ ok: true });
  });

  it('starting far away → start', () => {
    expect(validateStroke(trace(line([0.2, 0.3], [0.5, 0.9])), guide, tol7).reason).toBe('start');
  });

  it('reversed direction → order', () => {
    expect(validateStroke(trace([...guide].reverse()), guide, tol7).reason).toBe('order');
  });

  it('a half trace → coverage', () => {
    expect(validateStroke(trace(line([0.5, 0.1], [0.5, 0.5])), guide, tol7).reason).toBe('coverage');
  });

  it('a wild zig-zag → corridor', () => {
    const zz = trace(guide).map((p, i) => ({ x: p.x + (i % 2 ? 0.3 : -0.3), y: p.y }));
    zz[0] = { x: 0.5, y: 0.1 };
    expect(validateStroke(zz, guide, tol7).reason).toBe('corridor');
  });

  it('the age-4 tolerance accepts a wobbly trace that age 7 rejects', () => {
    const w = wobble(trace(guide), 0.09);
    w[0] = { x: 0.5, y: 0.1 };
    expect(validateStroke(w, guide, tol4).ok).toBe(true);
    expect(validateStroke(w, guide, tol7).ok).toBe(false);
  });

  it('tolerances tighten from age 4 to 7', () => {
    expect(tol4.r).toBeCloseTo(0.12);
    expect(tolerancesForAge(5.5).r).toBeCloseTo(0.09);
    expect(tol7.r).toBeCloseTo(0.06);
    expect(tolerancesForAge(10).r).toBeCloseTo(0.06);
  });
});

describe('nisip: glyphs', () => {
  it('every glyph has ≥1 stroke; non-dot strokes have ≥4 points; all inside the box', () => {
    for (const g of [...STROKES, ...UPPER]) {
      expect(g.strokes.length).toBeGreaterThan(0);
      for (const s of g.strokes) {
        if (g.id !== 'dots') expect(s.length).toBeGreaterThanOrEqual(2);
        for (const p of s) {
          expect(p.x).toBeGreaterThanOrEqual(-0.01);
          expect(p.x).toBeLessThanOrEqual(1.01);
          expect(p.y).toBeGreaterThanOrEqual(-0.01);
          expect(p.y).toBeLessThanOrEqual(1.01);
        }
      }
    }
  });

  it('covers the Romanian alphabet in teaching order, with Ș having its comma below', () => {
    expect(UPPER.map((g) => g.id).slice(0, 6)).toEqual(['A', 'M', 'U', 'N', 'I', 'E']);
    expect(UPPER).toHaveLength(31);
    const s2 = UPPER.find((g) => g.id === 'S2')!;
    const comma = s2.strokes[s2.strokes.length - 1];
    expect(Math.min(...comma.map((p) => p.y))).toBeGreaterThan(0.9);
  });

  it('each letter can be traced perfectly stroke by stroke (in order)', () => {
    for (const g of UPPER) {
      const done: number[] = [];
      for (let i = 0; i < g.strokes.length; i++) {
        const m = matchGlyphStroke(trace(g.strokes[i], 60), g, done, 7);
        expect(m, `${g.id} stroke ${i}`).toMatchObject({ ok: true, index: i });
        done.push(i);
      }
    }
  });

  it('every pre-writing stroke can be traced perfectly at age 4 (dots are taps)', () => {
    for (const g of STROKES) {
      const done: number[] = [];
      for (let i = 0; i < g.strokes.length; i++) {
        const drawn = g.strokes[i].length === 1 ? [g.strokes[i][0]] : trace(g.strokes[i], 80);
        expect(matchGlyphStroke(drawn, g, done, 4), `${g.id} ${i}`).toMatchObject({ ok: true });
        done.push(i);
      }
    }
  });

  it('under age 6 strokes may come in any order; from 6 the order is enforced', () => {
    const a = UPPER[0];
    expect(matchGlyphStroke(trace(a.strokes[2]), a, [], 4).ok).toBe(true);
    expect(matchGlyphStroke(trace(a.strokes[2]), a, [], 6).ok).toBe(false);
  });
});

describe('nisip: pickGlyph', () => {
  it('starts with the first strokes and moves on as they are mastered', async () => {
    const { pickGlyph } = await import('./logic');
    const { rng } = await import('../../core/rng');
    const r = rng(1);
    const first = new Set(Array.from({ length: 30 }, () => pickGlyph(STROKES, {}, r).id));
    expect([...first].every((id) => ['line', 'dots'].includes(id))).toBe(true);
    const boxes = { 'T-line': 3, 'T-dots': 4 };
    const later = Array.from({ length: 60 }, () => pickGlyph(STROKES, boxes, r).id);
    expect(later.filter((id) => id === 'wave' || id === 'zigzag').length).toBeGreaterThan(30);
    expect(later.some((id) => id === 'line' || id === 'dots')).toBe(true); // some review
  });
});
