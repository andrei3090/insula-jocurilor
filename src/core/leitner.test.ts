import { describe, expect, it } from 'vitest';
import { DAY, dueCards, mixRound, newCard, review } from './leitner';
import { rng } from './rng';

describe('Leitner boxes', () => {
  const t0 = Date.UTC(2026, 10, 21);

  it('a correct answer moves the card up one box with the right interval', () => {
    const intervals = [0, 1, 3, 7, 14];
    let c = newCard('A', t0);
    expect(c.box).toBe(1);
    for (let box = 2; box <= 5; box++) {
      c = review(c, true, t0);
      expect(c.box).toBe(box);
      expect(c.due).toBe(t0 + intervals[box - 1] * DAY);
    }
    c = review(c, true, t0);
    expect(c.box).toBe(5);
  });

  it('a wrong answer sends the card back to box 1, due now', () => {
    let c = review(review(newCard('A', t0), true, t0), true, t0);
    c = review(c, false, t0 + 5);
    expect(c).toMatchObject({ box: 1, due: t0 + 5 });
  });

  it('dueCards returns only cards due, oldest first', () => {
    const cards = [
      { id: 'a', box: 2 as const, due: t0 + DAY },
      { id: 'b', box: 1 as const, due: t0 - 10 },
      { id: 'c', box: 3 as const, due: t0 - 20 },
    ];
    expect(dueCards(cards, t0).map((c) => c.id)).toEqual(['c', 'b']);
  });

  it('mixRound gives about 70/30 current/review and the exact size', () => {
    const r = mixRound(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'], ['r1', 'r2', 'r3'], 8, rng(1));
    expect(r).toHaveLength(8);
    expect(r.filter((x) => x.startsWith('r'))).toHaveLength(2);
  });

  it('mixRound fills from current items when there are no reviews, repeating if needed', () => {
    const r = mixRound(['a', 'b'], [], 5, rng(2));
    expect(r).toHaveLength(5);
    expect(new Set(r)).toEqual(new Set(['a', 'b']));
  });
});
