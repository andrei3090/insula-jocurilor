import { band, type LevelSpec } from '../../core/levels';
import { pick, type Rand, shuffle } from '../../core/rng';

export const SKILLS = ['size.match3', 'size.order3', 'size.order4', 'size.order5'] as const;
export type UrsiSkill = (typeof SKILLS)[number];
export type Thing = 'bowl' | 'chair' | 'bed';

/** sizes: 0 = smallest. In match mode index 0/1/2 = cub / mother / father. */
export type UrsiItem = { mode: 'match' | 'order'; thing: Thing; sizes: number[] };

export function makeItem(skill: UrsiSkill, r: Rand, prev?: Thing): UrsiItem {
  const things: Thing[] = ['bowl', 'chair', 'bed'];
  const thing = pick(
    r,
    things.filter((t) => t !== prev),
  );
  const n = skill === 'size.match3' || skill === 'size.order3' ? 3 : skill === 'size.order4' ? 4 : 5;
  let sizes = shuffle(
    r,
    Array.from({ length: n }, (_, i) => i),
  );
  // never start already solved: ascending (order mode) or lined up with the bears, big → small (match mode)
  const solvedLayout = (xs: number[]) =>
    xs.every((s, i) => s === i) || xs.every((s, i) => s === xs.length - 1 - i);
  while (solvedLayout(sizes)) sizes = [...sizes.slice(1), sizes[0]];
  return { mode: skill === 'size.match3' ? 'match' : 'order', thing, sizes };
}

export const matchOk = (objectSize: number, bearSize: number) => objectSize === bearSize;

/** In order mode the child picks the smallest object still left. */
export const isNextInOrder = (sizes: readonly number[], placed: readonly number[], size: number) =>
  size === Math.min(...sizes.filter((s) => !placed.includes(s)));

/** Levels 1…50: give each bear its own → order 3 → order 4 → order 5. */
const BANDS = [10, 12, 14, 14] as const;
export const levelSpec = (n: number): LevelSpec & { skill: UrsiSkill } => ({ skill: SKILLS[band(n, BANDS)] });
