import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../../core/levels';
import { rng } from '../../core/rng';
import {
  type Board,
  DIRS,
  type Dir,
  levelSpec,
  MAX_PROGRAM,
  makeBoard,
  run,
  shortest,
  suggestion,
} from './logic';

describe('Navigatorul stelelor', () => {
  it('every level makes a board that can be solved, with the level’s way length and rocks', () => {
    for (let n = 1; n <= MAX_LEVEL; n++)
      for (let seed = 1; seed <= 25; seed++) {
        const spec = levelSpec(n);
        const b = makeBoard(spec, rng(seed * 7919 + n));
        const way = shortest(b);
        expect(way, `level ${n} seed ${seed}`).not.toBeNull();
        expect(way!.length).toBeGreaterThanOrEqual(spec.path[0]);
        expect(way!.length).toBeLessThanOrEqual(Math.min(spec.path[1], MAX_PROGRAM));
        expect(b.rocks.length).toBeGreaterThanOrEqual(spec.rocks[0]);
        expect(b.rocks.length).toBeLessThanOrEqual(spec.rocks[1]);
        expect(run(b, way!).kind).toBe('arrived');
        // rock levels: the rocks really force a detour
        if (spec.skill === 'code.rocks' || spec.skill === 'code.long')
          expect(way!.length, `level ${n}`).toBeGreaterThan(
            Math.abs(b.goal[0] - b.start[0]) + Math.abs(b.goal[1] - b.start[1]),
          );
        if (spec.skill === 'code.line') expect(new Set(way).size).toBe(1);
        if (spec.skill === 'code.turn') expect(new Set(way).size).toBe(2);
      }
  });

  const b: Board = { cols: 4, rows: 3, start: [0, 1], goal: [3, 1], rocks: [[2, 1]] };

  it('the canoe stops before a rock and before the edge, never on them', () => {
    expect(run(b, ['R', 'R'])).toMatchObject({ kind: 'rock', stoppedAt: 1 });
    expect(run(b, ['R', 'R']).steps.at(-1)).toEqual([1, 1]);
    expect(run(b, ['L'])).toMatchObject({ kind: 'edge', stoppedAt: 0 });
    expect(run(b, ['U', 'R'])).toMatchObject({ kind: 'short' });
  });

  it('any way that reaches the island counts, and extra arrows after it do not matter', () => {
    expect(run(b, ['U', 'R', 'R', 'R', 'D']).kind).toBe('arrived');
    expect(run(b, ['D', 'R', 'R', 'R', 'U', 'U', 'L']).kind).toBe('arrived');
    expect(shortest(b)).toHaveLength(5);
  });

  it('a board walled off has no way', () => {
    expect(shortest({ cols: 3, rows: 1, start: [0, 0], goal: [2, 0], rocks: [[1, 0]] })).toBeNull();
  });

  it('the hint: the suggested arrow and the dots follow ONE way, from where her arrows lead', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const board = makeBoard(levelSpec(30), rng(seed));
      const way = shortest(board)!;
      // a valid start that is not the shortest way: one step along it, then the hint must still reach the island
      const prefix: Dir[] = way.slice(0, 1);
      const h = suggestion(board, prefix);
      expect(h.badAt).toBeUndefined();
      expect(h.next).toBe(h.way[0]);
      expect(run(board, [...prefix, ...h.way]).kind).toBe('arrived');
      // the dots start next to the canoe, in the direction of the suggested arrow
      const end = run(board, prefix).steps.at(-1)!;
      expect(h.from).toEqual(end);
      const first = [end[0] + DIRS[h.next!][0], end[1] + DIRS[h.next!][1]];
      expect(run({ ...board, start: end }, [h.next!]).steps[1]).toEqual(first);
    }
    // a wrong arrow is pointed out first, and the dots start at the start
    const hb = suggestion(b, ['L']);
    expect(hb.badAt).toBe(0);
    expect(hb.from).toEqual(b.start);
  });
});
