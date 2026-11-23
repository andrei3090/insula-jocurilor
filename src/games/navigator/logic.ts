import { band, type LevelSpec, within } from '../../core/levels';
import { int, type Rand } from '../../core/rng';

export const SKILLS = ['code.line', 'code.turn', 'code.rocks', 'code.long', 'code.big'] as const;
export type NavSkill = (typeof SKILLS)[number];

export type Dir = 'U' | 'D' | 'L' | 'R';
export const DIRS: Record<Dir, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
export type Cell = [number, number];

export type Board = { cols: number; rows: number; start: Cell; goal: Cell; rocks: Cell[] };
export type NavSpec = LevelSpec & {
  skill: NavSkill;
  cols: number;
  rows: number;
  rocks: [number, number];
  /** length of the shortest way to the island */
  path: [number, number];
};

/** The most arrows she can place (the strip has room for this many). */
export const MAX_PROGRAM = 10;

/**
 * Levels 1…50: one direction (1–3 steps) → two directions → rocks in the way → longer ways → a 6 × 6 sea with
 * more rocks (up to 8 moves).
 */
const BANDS = [8, 10, 12, 10, 10] as const;
export function levelSpec(n: number): NavSpec {
  const b = band(n, BANDS);
  const w = within(n, BANDS);
  const at = (lo: number, hi: number) => Math.round(lo + (hi - lo) * w);
  switch (b) {
    case 0:
      return { skill: 'code.line', cols: 4, rows: 3, rocks: [0, 0], path: [1, at(1, 3)] };
    case 1:
      return { skill: 'code.turn', cols: 4, rows: 4, rocks: [0, 0], path: [2, at(3, 5)] };
    case 2:
      // rocks that force a detour add at least 2 moves to a direct way of at least 2: never fewer than 4
      return { skill: 'code.rocks', cols: 5, rows: 4, rocks: [2, at(2, 4)], path: [4, at(4, 6)] };
    case 3:
      return { skill: 'code.long', cols: 5, rows: 5, rocks: [3, at(3, 5)], path: [5, at(6, 7)] };
    default:
      return { skill: 'code.big', cols: 6, rows: 6, rocks: [5, at(5, 8)], path: [6, at(7, 8)] };
  }
}

const key = ([x, y]: Cell) => `${x},${y}`;
const inside = (b: Board, [x, y]: Cell) => x >= 0 && y >= 0 && x < b.cols && y < b.rows;
const isRock = (b: Board, c: Cell) => b.rocks.some((r) => r[0] === c[0] && r[1] === c[1]);

/** Shortest list of moves from the start to the goal (BFS), or null when there is none. */
export function shortest(b: Board): Dir[] | null {
  const prev = new Map<string, { from: string; d: Dir } | null>([[key(b.start), null]]);
  const queue: Cell[] = [b.start];
  while (queue.length) {
    const c = queue.shift()!;
    if (c[0] === b.goal[0] && c[1] === b.goal[1]) {
      const moves: Dir[] = [];
      let k = key(c);
      for (let p = prev.get(k); p; p = prev.get(k)) {
        moves.unshift(p.d);
        k = p.from;
      }
      return moves;
    }
    for (const d of Object.keys(DIRS) as Dir[]) {
      const n: Cell = [c[0] + DIRS[d][0], c[1] + DIRS[d][1]];
      if (!inside(b, n) || isRock(b, n) || prev.has(key(n))) continue;
      prev.set(key(n), { from: key(c), d });
      queue.push(n);
    }
  }
  return null;
}

export type Outcome = { kind: 'arrived' | 'rock' | 'edge' | 'short'; steps: Cell[]; stoppedAt: number };

/**
 * Runs her program. The canoe stops BEFORE a rock or the edge (it never sits on a rock), and arrives as soon
 * as it reaches the island, even if arrows are left.
 */
export function run(b: Board, program: readonly Dir[]): Outcome {
  let c: Cell = b.start;
  const steps: Cell[] = [c];
  for (let i = 0; i < program.length; i++) {
    const n: Cell = [c[0] + DIRS[program[i]][0], c[1] + DIRS[program[i]][1]];
    if (!inside(b, n)) return { kind: 'edge', steps, stoppedAt: i };
    if (isRock(b, n)) return { kind: 'rock', steps, stoppedAt: i };
    c = n;
    steps.push(c);
    if (c[0] === b.goal[0] && c[1] === b.goal[1]) return { kind: 'arrived', steps, stoppedAt: i };
  }
  return { kind: 'short', steps, stoppedAt: program.length };
}

/** A board whose shortest way has the level's length, with the level's number of rocks. */
export function makeBoard(spec: NavSpec, r: Rand): Board {
  const [plo, phi] = spec.path;
  const want = int(r, plo, Math.min(phi, MAX_PROGRAM));
  for (let attempt = 0; attempt < 2000; attempt++) {
    const start: Cell = [int(r, 0, spec.cols - 1), int(r, 0, spec.rows - 1)];
    let goal: Cell;
    if (spec.skill === 'code.line') {
      // one direction only: the island in the same row or column
      const horizontal = r() < 0.6;
      goal = horizontal ? [int(r, 0, spec.cols - 1), start[1]] : [start[0], int(r, 0, spec.rows - 1)];
    } else goal = [int(r, 0, spec.cols - 1), int(r, 0, spec.rows - 1)];
    if (goal[0] === start[0] && goal[1] === start[1]) continue;
    if (spec.skill === 'code.turn' && (goal[0] === start[0] || goal[1] === start[1])) continue;
    const rocks: Cell[] = [];
    const nr = int(r, spec.rocks[0], spec.rocks[1]);
    for (let k = 0; rocks.length < nr && k < 60; k++) {
      const c: Cell = [int(r, 0, spec.cols - 1), int(r, 0, spec.rows - 1)];
      if (key(c) === key(start) || key(c) === key(goal) || rocks.some((x) => key(x) === key(c))) continue;
      rocks.push(c);
    }
    if (rocks.length !== nr) continue;
    const b: Board = { cols: spec.cols, rows: spec.rows, start, goal, rocks };
    const way = shortest(b);
    if (!way || way.length !== want) continue;
    // rock levels: the rocks must matter (a straight Manhattan way would be blocked)
    if (
      nr > 0 &&
      way.length === Math.abs(goal[0] - start[0]) + Math.abs(goal[1] - start[1]) &&
      spec.skill !== 'code.big'
    )
      continue;
    return b;
  }
  // never reached in the tests; a safe board anyway
  return {
    cols: spec.cols,
    rows: spec.rows,
    start: [0, 0],
    goal: [Math.min(want, spec.cols - 1), 0],
    rocks: [],
  };
}

/**
 * What to suggest next: where the canoe gets with her arrows, then a shortest way from there (its first move is
 * the arrow to add; the dots show the rest). A wrong arrow is pointed out first, and the dots start at the start.
 */
export function suggestion(
  b: Board,
  program: readonly Dir[],
): { next?: Dir; badAt?: number; from: Cell; way: Dir[] } {
  const o = run(b, program);
  if (o.kind === 'rock' || o.kind === 'edge')
    return { badAt: o.stoppedAt, from: b.start, way: shortest(b) ?? [] };
  if (o.kind === 'arrived') return { from: b.goal, way: [] };
  const here = o.steps.at(-1) as Cell;
  const way = shortest({ ...b, start: here }) ?? [];
  return { next: way[0], from: here, way };
}
