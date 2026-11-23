import { describe, expect, it } from 'vitest';
import { ageFor, groupOf } from './age';
import { gamesFor } from './registry';

describe('age groups', () => {
  it('picking a group keeps the exact age inside it, else moves to its start', () => {
    expect(ageFor('small', 3)).toBe(3);
    expect(ageFor('small', 4)).toBe(4);
    expect(ageFor('small', 6)).toBe(4);
    expect(ageFor('big', 4)).toBe(5);
    expect(ageFor('big', 6)).toBe(6);
    expect(ageFor('big', 9)).toBe(5);
    expect(groupOf(3)).toBe('small');
    expect(groupOf(5)).toBe('big');
  });

  it('3–4 sees its own new games and not the 5–7 ones, and the other way round', () => {
    const ids = (island: Parameters<typeof gamesFor>[0], age: number) =>
      gamesFor(island, age).map((g) => g.id);
    expect(ids('castel', 4)).toContain('bule');
    expect(ids('castel', 5)).not.toContain('bule');
    expect(ids('pestera', 4)).toContain('umbre');
    expect(ids('pestera', 4)).not.toContain('modele');
    expect(ids('pestera', 5)).toContain('modele');
    expect(ids('pestera', 5)).not.toContain('umbre');
    expect(ids('laguna', 6)).toContain('navigator');
    expect(ids('laguna', 4)).not.toContain('navigator');
    // the games both groups share stay in both
    for (const age of [3, 4, 5, 6, 7]) expect(ids('bambus', age)).toContain('panda');
  });
});
