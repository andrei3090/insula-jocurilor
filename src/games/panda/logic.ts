import { band, type LevelSpec, within } from '../../core/levels';
import { int, type Rand, shuffle } from '../../core/rng';

export const SKILLS = ['count.3', 'count.5', 'digit.5', 'count.10', 'digit.10', 'add.10'] as const;
export type PandaSkill = (typeof SKILLS)[number];

export type PandaItem = {
  mode: 'count' | 'digit' | 'add';
  /** sticks Pufi has at the end */
  target: number;
  /** sticks already in the basket (add mode) */
  a: number;
  /** sticks the child must add */
  b: number;
  /** loose sticks on offer */
  offered: number;
  /** answer choices for "how many now?" (add mode) */
  choices?: number[];
};

const RANGES: Record<PandaSkill, [number, number]> = {
  'count.3': [1, 3],
  'count.5': [2, 5],
  'digit.5': [1, 5],
  'count.10': [4, 10],
  'digit.10': [3, 10],
  'add.10': [2, 10],
};

export function makeItem(
  skill: PandaSkill,
  r: Rand,
  prevTarget?: number,
  range: readonly [number, number] = RANGES[skill],
): PandaItem {
  const [lo, hi] = range;
  let target = int(r, lo, hi);
  for (let i = 0; i < 10 && target === prevTarget; i++) target = int(r, lo, hi);
  if (skill === 'add.10') {
    const a = int(r, 1, Math.min(5, target - 1));
    const b = target - a;
    const near = shuffle(
      r,
      [target - 2, target - 1, target + 1, target + 2].filter((c) => c >= 1 && c <= 10),
    ).slice(0, 2);
    return {
      mode: 'add',
      target,
      a,
      b,
      offered: Math.min(12, b + int(r, 2, 3)),
      choices: shuffle(r, [target, ...near]),
    };
  }
  const mode = skill.startsWith('digit') ? 'digit' : 'count';
  return { mode, target, a: 0, b: target, offered: Math.min(12, target + int(r, 2, 3)) };
}

export const need = (it: PandaItem) => (it.mode === 'add' ? it.b : it.target);

export const check = (it: PandaItem, placed: number): 'ok' | 'few' | 'many' => {
  const n = need(it);
  return placed === n ? 'ok' : placed < n ? 'few' : 'many';
};

/** Levels 1…50: count to 3 → to 5 → read a digit to 5 → count to 10 → digit to 10 → add within 10. */
const BANDS = [5, 5, 5, 8, 9, 9, 9] as const;
const BAND_SKILL: readonly PandaSkill[] = [
  'count.3',
  'count.5',
  'digit.5',
  'count.10',
  'digit.10',
  'add.10',
  'add.10',
];
export function levelSpec(n: number): LevelSpec & { skill: PandaSkill; range: [number, number] } {
  const b = band(n, BANDS);
  const w = within(n, BANDS);
  const range: [number, number] = [
    [1, 3],
    [2, 5],
    [1, 5],
    [4, 6 + Math.round(4 * w)],
    [3, 7 + Math.round(3 * w)],
    [3, 6 + Math.round(2 * w)],
    [5, 10],
  ][b] as [number, number];
  return { skill: BAND_SKILL[b], range };
}
