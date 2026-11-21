import { describe, expect, it } from 'vitest';
import { rng } from '../../core/rng';
import { lines } from '../../voice/lines';
import { LETTERS, sayLetter, startsWith } from './data';
import { catchOptions, pickLetter, soundOptions } from './logic';

describe('alfabet: data', () => {
  it('has all 31 Romanian letters, each with something to say', () => {
    expect(LETTERS).toHaveLength(31);
    for (const l of LETTERS) expect(lines[sayLetter(l)], l.id).toBeTruthy();
  });

  it('pictures for "starts with" really start with the letter', () => {
    for (const l of LETTERS.filter(startsWith)) expect(l.word![0].toUpperCase(), l.id).toBe(l.glyph);
  });
});

describe('alfabet: logic', () => {
  it('starts with the first letters taught at school (A, M)', () => {
    const r = rng(1);
    const got = new Set(Array.from({ length: 40 }, () => pickLetter({}, r).id));
    expect([...got].sort()).toEqual(['A', 'M']);
  });

  it('moves on when letters are mastered and still reviews old ones', () => {
    const r = rng(2);
    const boxes = { 'L-A': 3, 'L-M': 4, 'L-U': 3 };
    const got = Array.from({ length: 80 }, () => pickLetter(boxes, r).id);
    expect(got.filter((x) => x === 'N' || x === 'I').length).toBeGreaterThan(40);
    expect(got.some((x) => ['A', 'M', 'U'].includes(x))).toBe(true);
  });

  it('balloons: 3 different letters, the target included, no look-alike family', () => {
    const r = rng(3);
    for (const t of LETTERS) {
      const o = catchOptions(t, r);
      expect(o).toHaveLength(3);
      expect(new Set(o.map((x) => x.id)).size).toBe(3);
      expect(o).toContain(t);
      if (t.id === 'A') expect(o.some((x) => x.id === 'A2' || x.id === 'A3')).toBe(false);
    }
  });

  it('"Ce începe cu…": 3 pictures, only one starts with the letter', () => {
    const r = rng(4);
    for (const t of LETTERS.filter(startsWith)) {
      const o = soundOptions(t, r);
      expect(o).toHaveLength(3);
      expect(o.filter((x) => x.word![0].toUpperCase() === t.glyph)).toHaveLength(1);
    }
  });
});
