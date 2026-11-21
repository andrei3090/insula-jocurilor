import { type Rand, shuffle } from './rng';

export const DAY = 86_400_000;
const INTERVAL_DAYS = [0, 1, 3, 7, 14] as const;

export type Box = 1 | 2 | 3 | 4 | 5;
export type Card = { id: string; box: Box; due: number };

export const newCard = (id: string, now: number): Card => ({ id, box: 1, due: now });

export function review(c: Card, correct: boolean, now: number): Card {
  if (!correct) return { ...c, box: 1, due: now };
  const box = Math.min(5, c.box + 1) as Box;
  return { ...c, box, due: now + INTERVAL_DAYS[box - 1] * DAY };
}

export const dueCards = (cards: readonly Card[], now: number) =>
  cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);

/** About 70% current-level items and 30% due reviews, `size` items in all. */
export function mixRound<T>(current: readonly T[], reviews: readonly T[], size: number, r: Rand): T[] {
  const nReview = Math.min(reviews.length, Math.round(size * 0.3));
  const out = shuffle(r, reviews).slice(0, nReview);
  let pool: T[] = [];
  while (out.length < size && current.length) {
    if (!pool.length) pool = shuffle(r, current);
    out.push(pool.pop()!);
  }
  while (out.length < size && reviews.length) out.push(reviews[out.length % reviews.length]);
  return shuffle(r, out);
}
