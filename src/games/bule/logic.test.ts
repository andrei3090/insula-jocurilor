import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../../core/levels';
import { rng } from '../../core/rng';
import { isTarget, levelSpec, makeItem, needed, SLOTS, tap } from './logic';

const ALL = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

describe('Bule de săpun', () => {
  it('every level makes valid items: distinct slots, at least 2 to pop, at least one bubble not to pop', () => {
    for (const n of ALL)
      for (let seed = 1; seed <= 40; seed++) {
        const spec = levelSpec(n);
        const it = makeItem(spec, rng(seed * 97 + n));
        expect(it.bubbles.length).toBe(spec.bubbles);
        expect(new Set(it.bubbles.map((b) => b.slot)).size).toBe(it.bubbles.length);
        for (const b of it.bubbles) expect(b.slot).toBeLessThan(SLOTS);
        const k = needed(it);
        if (it.mode === 'count') {
          expect(k).toBeGreaterThanOrEqual(1);
          expect(k).toBeLessThan(it.bubbles.length);
        } else {
          // the spoken line is plural ("the red bubbles"): always two or more
          expect(k, `level ${n}`).toBeGreaterThanOrEqual(2);
          expect(
            it.bubbles.some((b) => !isTarget(it, b)),
            `level ${n}`,
          ).toBe(true);
        }
      }
  });

  it('colour levels use the number of colours of the level; digits stay 1–5', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const two = makeItem(levelSpec(1), rng(seed));
      expect(new Set(two.bubbles.map((b) => b.color)).size).toBe(2);
      const d = makeItem(levelSpec(45), rng(seed));
      for (const b of d.bubbles) expect(b.digit).toBeGreaterThanOrEqual(1);
      for (const b of d.bubbles) expect(b.digit).toBeLessThanOrEqual(5);
    }
  });

  it('levels go colours (2) → colours (5) → count → digits', () => {
    expect(levelSpec(1).skill).toBe('bule.color2');
    expect(levelSpec(13).skill).toBe('bule.color5');
    expect(levelSpec(26).skill).toBe('bule.count5');
    expect(levelSpec(50).skill).toBe('bule.digit5');
    expect(levelSpec(25).colors).toBe(5);
    expect(levelSpec(40).max).toBe(5);
  });

  it('tapping: the right bubbles pop, a wrong one does not, the last right one finishes', () => {
    const it = makeItem(levelSpec(5), rng(7));
    const targets = it.bubbles.filter((b) => isTarget(it, b)).map((b) => b.id);
    const other = it.bubbles.find((b) => !isTarget(it, b))!.id;
    expect(tap(it, [], other)).toBe('wrong');
    const popped: number[] = [];
    for (const [i, id] of targets.entries()) {
      expect(tap(it, popped, id)).toBe(i === targets.length - 1 ? 'done' : 'pop');
      popped.push(id);
    }
    expect(tap(it, popped, targets[0])).toBe('gone');
  });

  it('count mode: any bubble pops, and exactly n pops finish', () => {
    const it = makeItem(levelSpec(35), rng(3));
    const n = needed(it);
    const popped: number[] = [];
    for (let i = 0; i < n; i++) {
      expect(tap(it, popped, it.bubbles[i].id)).toBe(i === n - 1 ? 'done' : 'pop');
      popped.push(it.bubbles[i].id);
    }
  });
});
