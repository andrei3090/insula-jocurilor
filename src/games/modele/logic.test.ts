import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../../core/levels';
import { rng } from '../../core/rng';
import { levelSpec, makeItem, same, type Token } from './logic';

const key = (t: Token) => `${t.shape}-${t.color}`;

/** Every token sequence that repeats with period p: the smallest such p. */
function period(row: Token[], gap: number) {
  for (let p = 1; p <= row.length; p++) {
    let ok = true;
    for (let i = 0; i < row.length && ok; i++)
      for (let j = i + p; j < row.length; j += p)
        if (i !== gap && j !== gap && !same(row[i], row[j])) ok = false;
    if (ok) return p;
  }
  return row.length;
}

describe('Modele în peșteră', () => {
  it('every level: one right answer among distinct options, and the row has exactly one reading', () => {
    for (let n = 1; n <= MAX_LEVEL; n++)
      for (let seed = 1; seed <= 40; seed++) {
        const spec = levelSpec(n);
        const it = makeItem(spec, rng(seed * 13 + n));
        expect(it.options.length, `level ${n}`).toBe(spec.options);
        expect(new Set(it.options.map(key)).size).toBe(it.options.length);
        expect(it.options.filter((o) => same(o, it.answer)).length).toBe(1);
        expect(same(it.row[it.gap], it.answer)).toBe(true);
        // the visible row (without the gap) repeats with the unit's length and no shorter period
        expect(period(it.row, it.gap)).toBe(it.unit.length);
        // the gap is never inside the first unit, so the pattern is shown before it is asked
        expect(it.gap).toBeGreaterThanOrEqual(it.unit.length);
        // filling the gap with any wrong option breaks the pattern
        for (const o of it.options.filter((x) => !same(x, it.answer))) {
          const filled = it.row.map((t, i) => (i === it.gap ? o : t));
          expect(period(filled, -1), `level ${n} seed ${seed}`).not.toBe(it.unit.length);
        }
      }
  });

  it('levels: AB first, gaps inside the row and both attributes changing at the end', () => {
    expect(levelSpec(1).skill).toBe('pattern.ab');
    expect(levelSpec(11).skill).toBe('pattern.aab');
    expect(levelSpec(50).skill).toBe('pattern.gap');
    expect(levelSpec(50).vary).toBe('both');
    expect(levelSpec(1).options).toBe(3);
    expect(levelSpec(30).options).toBe(4);
  });
});
