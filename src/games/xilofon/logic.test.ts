import { describe, expect, it } from 'vitest';
import { rng } from '../../core/rng';
import { check, lengthOf, makeSequence, SONGS } from './logic';

describe('xilofon', () => {
  it('sequences have the asked length, valid bars and no immediate repeat', () => {
    const r = rng(9);
    for (const n of [2, 3, 4, 5])
      for (let i = 0; i < 50; i++) {
        const s = makeSequence(n, r);
        expect(s).toHaveLength(n);
        expect(s.every((b) => b >= 0 && b <= 7)).toBe(true);
        expect(s.every((b, k) => k === 0 || b !== s[k - 1])).toBe(true);
      }
  });

  it('check walks the sequence and spots a wrong bar', () => {
    expect(check([2, 4], 0, 2)).toBe('next');
    expect(check([2, 4], 1, 4)).toBe('done');
    expect(check([2, 4], 1, 3)).toBe('wrong');
  });

  it('songs only use the 8 bars; levels map to lengths', () => {
    for (const s of Object.values(SONGS)) expect(s.every((b) => b >= 0 && b <= 7)).toBe(true);
    expect(lengthOf('xilo.repeat3')).toBe(3);
    expect(lengthOf('xilo.song')).toBe(0);
  });
});
