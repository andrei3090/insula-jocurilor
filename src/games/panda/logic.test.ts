import { describe, expect, it } from 'vitest';
import { rng } from '../../core/rng';
import { check, makeItem, need, type SKILLS } from './logic';

const many = (skill: (typeof SKILLS)[number], n = 300) => {
  const r = rng(42);
  return Array.from({ length: n }, () => makeItem(skill, r));
};

describe('panda: item generator', () => {
  it('count.3 asks for 1–3 sticks with at least 2 extra on offer', () => {
    for (const it of many('count.3')) {
      expect(it.mode).toBe('count');
      expect(it.target).toBeGreaterThanOrEqual(1);
      expect(it.target).toBeLessThanOrEqual(3);
      expect(it.offered).toBeGreaterThanOrEqual(it.target + 2);
    }
  });

  it('count.5 / count.10 / digit.10 stay in range', () => {
    expect(many('count.5').every((i) => i.target >= 2 && i.target <= 5)).toBe(true);
    expect(many('count.10').every((i) => i.target >= 4 && i.target <= 10 && i.offered <= 12)).toBe(true);
    expect(many('digit.10').every((i) => i.mode === 'digit' && i.target >= 3 && i.target <= 10)).toBe(true);
  });

  it('add.10: a + b = target ≤ 10, and the 3 choices include the answer', () => {
    for (const it of many('add.10')) {
      expect(it.mode).toBe('add');
      expect(it.a + it.b).toBe(it.target);
      expect(it.target).toBeLessThanOrEqual(10);
      expect(it.a).toBeGreaterThanOrEqual(1);
      expect(it.b).toBeGreaterThanOrEqual(1);
      expect(it.choices).toHaveLength(3);
      expect(new Set(it.choices).size).toBe(3);
      expect(it.choices).toContain(it.target);
      expect(it.choices!.every((c) => c >= 1 && c <= 10)).toBe(true);
      expect(it.offered).toBeGreaterThanOrEqual(it.b + 2);
    }
  });

  it('does not repeat the previous target', () => {
    const r = rng(7);
    let prev = makeItem('count.5', r);
    for (let i = 0; i < 100; i++) {
      const next = makeItem('count.5', r, prev.target);
      expect(next.target).not.toBe(prev.target);
      prev = next;
    }
  });
});

describe('panda: check', () => {
  it('compares the sticks the child placed with what is needed', () => {
    const item = { mode: 'add' as const, target: 5, a: 3, b: 2, offered: 5 };
    expect(need(item)).toBe(2);
    expect(check(item, 2)).toBe('ok');
    expect(check(item, 1)).toBe('few');
    expect(check(item, 3)).toBe('many');
    expect(check({ mode: 'count', target: 4, a: 0, b: 4, offered: 6 }, 4)).toBe('ok');
  });
});
