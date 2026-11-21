import { describe, expect, it } from 'vitest';
import { rng } from '../../core/rng';
import { close, flip, GRID, initial, makeDeck, SKILLS } from './logic';

describe('memorie: deck', () => {
  it('has exactly two cards per pair and fills the grid', () => {
    for (const s of SKILLS) {
      const deck = makeDeck(s, rng(3));
      const [c, r] = GRID[s];
      expect(deck).toHaveLength(c * r);
      const counts = new Map<string, number>();
      for (const card of deck) counts.set(card.pair, (counts.get(card.pair) ?? 0) + 1);
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
      expect(new Set(deck.map((d) => d.uid)).size).toBe(deck.length);
    }
  });

  it('bigger boards mix picture pairs with number ↔ quantity pairs', () => {
    const deck = makeDeck('mem.3x4', rng(9));
    expect(deck.some((d) => d.face.kind === 'digit')).toBe(true);
    for (const d of deck.filter((x) => x.face.kind === 'digit')) {
      const twin = deck.find((x) => x.pair === d.pair && x.uid !== d.uid)!;
      expect(twin.face.kind).toBe('count');
    }
  });
});

describe('memorie: flip state machine', () => {
  const deck = [
    { uid: 0, pair: 'a', face: { kind: 'emoji' as const, name: 'crown' as const } },
    { uid: 1, pair: 'b', face: { kind: 'emoji' as const, name: 'ring' as const } },
    { uid: 2, pair: 'a', face: { kind: 'emoji' as const, name: 'crown' as const } },
    { uid: 3, pair: 'b', face: { kind: 'emoji' as const, name: 'ring' as const } },
  ];

  it('two equal cards stay matched', () => {
    let s = initial();
    let e: string;
    [s, e] = flip(s, 0, deck);
    expect(e).toBe('open1');
    [s, e] = flip(s, 2, deck);
    expect(e).toBe('match');
    expect(s.matched).toEqual(['a']);
    expect(s.open).toEqual([]);
  });

  it('a mismatch locks input until close()', () => {
    let s = initial();
    let e: string;
    [s] = flip(s, 0, deck);
    [s, e] = flip(s, 1, deck);
    expect(e).toBe('mismatch');
    expect(s.locked).toBe(true);
    expect(s.mismatches).toBe(1);
    [, e] = flip(s, 3, deck);
    expect(e).toBe('ignored');
    s = close(s);
    expect(s).toMatchObject({ open: [], locked: false });
  });

  it('ignores taps on an open or matched card', () => {
    let s = initial();
    let e: string;
    [s] = flip(s, 0, deck);
    [, e] = flip(s, 0, deck);
    expect(e).toBe('ignored');
    [s] = flip(s, 2, deck);
    [, e] = flip(s, 2, deck);
    expect(e).toBe('ignored');
  });
});
