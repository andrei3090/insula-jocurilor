import { describe, expect, it } from 'vitest';
import { rng } from '../../core/rng';
import { digitOptions, maxOf, modeOf, pickDigit, SKILLS } from './logic';

describe('cifre', () => {
  it('digits stay in range for each level; counting never asks for 0', () => {
    const r = rng(5);
    for (const s of SKILLS)
      for (let i = 0; i < 100; i++) {
        const d = pickDigit(s, r);
        expect(d).toBeLessThanOrEqual(maxOf(s));
        expect(d).toBeGreaterThanOrEqual(modeOf(s) === 'count' ? 1 : 0);
      }
  });

  it('options: 3 different digits including the target', () => {
    const r = rng(6);
    for (let t = 0; t <= 10; t++) {
      const o = digitOptions(t, 10, r);
      expect(new Set(o).size).toBe(3);
      expect(o).toContain(t);
      expect(o.every((d) => d >= 0 && d <= 10)).toBe(true);
    }
  });
});
