import { describe, expect, it } from 'vitest';
import { games, gamesFor } from './registry';
import type { GameManifest } from './types';

const g = (id: string, island: GameManifest['island'], ages: [number, number]) =>
  ({ id, island, ages, title: id, skills: ['x'] }) as unknown as GameManifest;

describe('registry', () => {
  it('filters by island and age (one year early allowed)', () => {
    const list = [g('a', 'bambus', [4, 6]), g('b', 'bambus', [6, 9]), g('c', 'castel', [4, 10])];
    expect(gamesFor('bambus', 4, list).map((x) => x.id)).toEqual(['a']);
    expect(gamesFor('bambus', 5, list).map((x) => x.id)).toEqual(['a', 'b']);
    expect(gamesFor('bambus', 8, list).map((x) => x.id)).toEqual(['b']);
  });

  it('manifests have unique ids and ordered, non-empty skills', () => {
    const ids = games().map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of games()) {
      expect(m.skills.length).toBeGreaterThan(0);
      expect(m.ages[0]).toBeLessThanOrEqual(m.ages[1]);
    }
  });
});
