import { type Rand, sample, shuffle } from '../../core/rng';
import { LETTERS, type LetterItem, startsWith } from './data';

export const SKILLS = ['abc.meet', 'abc.sound'] as const;
export type AbcSkill = (typeof SKILLS)[number];

/** Letters that look alike or are taught as variants: not mixed as distractors while she is just meeting them. */
const FAMILY: Record<string, string> = {
  A: 'A',
  A2: 'A',
  A3: 'A',
  I: 'I',
  I2: 'I',
  S: 'S',
  S2: 'S',
  T: 'T',
  T2: 'T',
};
const family = (id: string) => FAMILY[id] ?? id;

/** Next letter: mostly the frontier (first not mastered, or the next), sometimes a review. Mastered = Leitner box ≥ 3. */
export function pickLetter(
  boxes: Readonly<Record<string, number>>,
  r: Rand,
  prevId?: string,
  list: readonly LetterItem[] = LETTERS,
): LetterItem {
  const mastered = (l: LetterItem) => (boxes[`L-${l.id}`] ?? 0) >= 3;
  const f = Math.max(
    0,
    list.findIndex((l) => !mastered(l)),
  );
  const reviews = list.slice(0, f).filter((l) => l.id !== prevId);
  if (reviews.length && r() < 0.3) return reviews[Math.floor(r() * reviews.length)];
  const window = list.slice(f, f + 2).filter((l) => l.id !== prevId);
  return window[Math.floor(r() * window.length)] ?? list[f];
}

/** 3 balloons: the target + 2 distractors from other letter families (the ones she met first are preferred). */
export function catchOptions(
  target: LetterItem,
  r: Rand,
  list: readonly LetterItem[] = LETTERS,
): LetterItem[] {
  const pool = list.filter((l) => family(l.id) !== family(target.id));
  const near = pool.slice(0, Math.max(6, list.indexOf(target) + 3));
  return shuffle(r, [target, ...sample(r, near, 2)]);
}

/** 3 pictures for "Ce începe cu…?": the target's picture + 2 pictures starting with other letters. */
export function soundOptions(
  target: LetterItem,
  r: Rand,
  list: readonly LetterItem[] = LETTERS,
): LetterItem[] {
  const pool = list.filter(
    (l) => startsWith(l) && family(l.id) !== family(target.id) && l.word?.[0] !== target.word?.[0],
  );
  return shuffle(r, [target, ...sample(r, pool, 2)]);
}

/** In "sound" mode only letters with a picture that starts with them can be asked. */
export const soundable = (l: LetterItem) => startsWith(l);
