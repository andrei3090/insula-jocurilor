import { describe, expect, it } from 'vitest';
import { rng } from '../../core/rng';
import { isNextInOrder, makeItem, matchOk, SKILLS } from './logic';

describe('ursi: items', () => {
  it('match items offer 3 distinct sizes', () => {
    const r = rng(5);
    for (let i = 0; i < 50; i++) {
      const it = makeItem('size.match3', r);
      expect(it.mode).toBe('match');
      expect([...it.sizes].sort()).toEqual([0, 1, 2]);
      expect(it.sizes).not.toEqual([2, 1, 0]); // not already under the right bears
      expect(it.sizes).not.toEqual([0, 1, 2]);
    }
  });

  it('order items have n distinct sizes, shuffled, for each skill', () => {
    const r = rng(6);
    const n = { 'size.order3': 3, 'size.order4': 4, 'size.order5': 5 } as const;
    for (const s of SKILLS.filter((x) => x !== 'size.match3')) {
      const it = makeItem(s, r);
      expect(it.mode).toBe('order');
      expect(it.sizes).toHaveLength(n[s as keyof typeof n]);
      expect(new Set(it.sizes).size).toBe(it.sizes.length);
    }
  });
});

describe('ursi: checks', () => {
  it('matchOk: an object goes to the bear of the same size', () => {
    expect(matchOk(0, 0)).toBe(true);
    expect(matchOk(2, 1)).toBe(false);
  });

  it('isNextInOrder: always the smallest one still left', () => {
    expect(isNextInOrder([3, 0, 2, 1], [], 0)).toBe(true);
    expect(isNextInOrder([3, 0, 2, 1], [], 1)).toBe(false);
    expect(isNextInOrder([3, 0, 2, 1], [0], 1)).toBe(true);
  });
});
