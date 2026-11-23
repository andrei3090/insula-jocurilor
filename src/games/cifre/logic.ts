import { band, type LevelSpec } from '../../core/levels';
import { int, type Rand, sample, shuffle } from '../../core/rng';

export const SKILLS = ['cifre.meet5', 'cifre.count5', 'cifre.meet10', 'cifre.count10'] as const;
export type CifreSkill = (typeof SKILLS)[number];

export const maxOf = (s: CifreSkill) => (s.endsWith('10') ? 10 : 5);
export const modeOf = (s: CifreSkill) => (s.includes('meet') ? 'meet' : 'count');

export function pickDigit(skill: CifreSkill, r: Rand, prev?: number, max = maxOf(skill)): number {
  const lo = modeOf(skill) === 'count' ? 1 : 0;
  let d = int(r, lo, max);
  for (let i = 0; i < 10 && d === prev; i++) d = int(r, lo, max);
  return d;
}

/** `count` balloons: the target + other digits in range (neighbours preferred: harder to tell apart). */
export function digitOptions(target: number, max: number, r: Rand, count = 3): number[] {
  const all = Array.from({ length: max + 1 }, (_, i) => i).filter((d) => d !== target);
  const near = all.filter((d) => Math.abs(d - target) <= 2);
  const pool = near.length >= count - 1 ? near : all;
  return shuffle(r, [target, ...sample(r, pool, count - 1)]);
}

/** Levels 1…50: meet 0–3 → 0–5 → count to 5 → meet 0–10 → count to 10; four balloons from level 41. */
const BANDS = [8, 8, 8, 10, 16] as const;
const BAND_SKILL: readonly CifreSkill[] = [
  'cifre.meet5',
  'cifre.meet5',
  'cifre.count5',
  'cifre.meet10',
  'cifre.count10',
];
export function levelSpec(n: number): LevelSpec & { skill: CifreSkill; max: number; choices: number } {
  const b = band(n, BANDS);
  return { skill: BAND_SKILL[b], max: [3, 5, 5, 10, 10][b], choices: n >= 41 ? 4 : 3 };
}
