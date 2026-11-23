import { describe, expect, it } from 'vitest';
import {
  band,
  finishRound,
  firstLevelOf,
  freshLevels,
  MAX_LEVEL,
  pickLevel,
  starsFor,
  unlockAll,
  within,
} from './levels';

describe('levels 1…50', () => {
  it('stars come from the share of first-try answers', () => {
    expect(starsFor(5, 5)).toBe(3);
    expect(starsFor(4, 5)).toBe(3);
    expect(starsFor(3, 5)).toBe(2);
    expect(starsFor(1, 5)).toBe(1);
    expect(starsFor(0, 0)).toBe(3);
  });

  it('two or three stars open the next level and move on to it', () => {
    const r = finishRound(freshLevels(), 1, 2);
    expect(r.state.unlocked).toBe(2);
    expect(r.state.current).toBe(2);
    expect(r.opened).toBe(true);
  });

  it('one star plays the level again; the second finished round opens the next one anyway (never stuck)', () => {
    const a = finishRound(freshLevels(), 1, 1);
    expect(a.state.current).toBe(1);
    expect(a.state.unlocked).toBe(1);
    const b = finishRound(a.state, 1, 1);
    expect(b.state.current).toBe(2);
    expect(b.state.unlocked).toBe(2);
  });

  it('a child who keeps finishing rounds reaches level 50 and is told she finished them all', () => {
    let s = freshLevels();
    let last = finishRound(s, 1, 1);
    for (let i = 0; i < 200 && s.current < MAX_LEVEL; i++) {
      last = finishRound(s, s.current, 1);
      s = last.state;
    }
    expect(s.unlocked).toBe(MAX_LEVEL);
    const end = finishRound(s, MAX_LEVEL, 3);
    expect(end.allDone).toBe(true);
    expect(end.state.current).toBe(MAX_LEVEL);
  });

  it('replaying an old level never closes newer ones and keeps the best stars', () => {
    let s = finishRound(freshLevels(), 1, 3).state;
    s = finishRound(s, 2, 3).state;
    s = pickLevel(s, 1);
    const r = finishRound(s, 1, 1);
    expect(r.state.unlocked).toBe(3);
    expect(r.state.stars[1]).toBe(3);
  });

  it('only open levels can be picked; the parent can open all', () => {
    const s = freshLevels();
    expect(pickLevel(s, 7).current).toBe(1);
    expect(pickLevel(unlockAll(s), 7).current).toBe(7);
  });

  it('bands and positions split 1…50', () => {
    const sizes = [10, 15, 25];
    expect([1, 10, 11, 25, 26, 50].map((n) => band(n, sizes))).toEqual([0, 0, 1, 1, 2, 2]);
    expect(within(1, sizes)).toBe(0);
    expect(within(10, sizes)).toBe(1);
    expect(within(26, sizes)).toBe(0);
  });

  it('firstLevelOf finds where a skill starts', () => {
    const spec = (n: number) => ({ skill: n <= 10 ? 'a' : 'b' });
    expect(firstLevelOf(spec, 'b')).toBe(11);
    expect(firstLevelOf(spec, 'zzz')).toBe(1);
  });
});
