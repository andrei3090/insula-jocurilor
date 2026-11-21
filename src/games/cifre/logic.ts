import { int, type Rand, sample, shuffle } from '../../core/rng';

export const SKILLS = ['cifre.meet5', 'cifre.count5', 'cifre.meet10', 'cifre.count10'] as const;
export type CifreSkill = (typeof SKILLS)[number];

export const maxOf = (s: CifreSkill) => (s.endsWith('10') ? 10 : 5);
export const modeOf = (s: CifreSkill) => (s.includes('meet') ? 'meet' : 'count');

export function pickDigit(skill: CifreSkill, r: Rand, prev?: number): number {
  const lo = modeOf(skill) === 'count' ? 1 : 0;
  let d = int(r, lo, maxOf(skill));
  for (let i = 0; i < 10 && d === prev; i++) d = int(r, lo, maxOf(skill));
  return d;
}

/** 3 balloons: the target + 2 other digits in range (neighbours preferred: harder to tell apart). */
export function digitOptions(target: number, max: number, r: Rand): number[] {
  const all = Array.from({ length: max + 1 }, (_, i) => i).filter((d) => d !== target);
  const near = all.filter((d) => Math.abs(d - target) <= 2);
  const pool = near.length >= 2 ? near : all;
  return shuffle(r, [target, ...sample(r, pool, 2)]);
}
