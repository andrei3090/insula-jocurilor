/**
 * Levels 1…50 for every learning game. A finished round earns 1–3 stars (by the share of items right at the
 * first try). Two or three stars open the next level and the game moves on; one star plays the level once
 * more, and a second finished round opens the next one anyway, so a child is never stuck.
 */
import type { SkillId } from './types';

export const MAX_LEVEL = 50;
export type Stars = 1 | 2 | 3;

export type LevelState = {
  /** the level the next round is played at */
  current: number;
  /** the highest level she may choose (all below are open too) */
  unlocked: number;
  /** best stars per level */
  stars: Record<number, Stars>;
  /** finished rounds per level */
  plays: Record<number, number>;
};

/** What a game needs to know about level n: the skill it trains (for the parent's stats) and its own knobs. */
export type LevelSpec = { skill: SkillId } & Record<string, unknown>;

export const clampLevel = (n: number) => Math.max(1, Math.min(MAX_LEVEL, Math.round(n) || 1));

export const freshLevels = (start = 1): LevelState => {
  const n = clampLevel(start);
  return { current: n, unlocked: n, stars: {}, plays: {} };
};

export function starsFor(firstTry: number, total: number): Stars {
  const r = total > 0 ? firstTry / total : 1;
  return r >= 0.8 ? 3 : r >= 0.5 ? 2 : 1;
}

export type RoundOutcome = {
  state: LevelState;
  stars: Stars;
  next: number;
  opened: boolean;
  allDone: boolean;
};

/** A finished round at level n with `stars`. */
export function finishRound(s: LevelState, n: number, stars: Stars): RoundOutcome {
  const lv = clampLevel(n);
  const plays = (s.plays[lv] ?? 0) + 1;
  const best = Math.max(s.stars[lv] ?? 0, stars) as Stars;
  const pass = stars >= 2 || plays >= 2 || (s.stars[lv] ?? 0) >= 2;
  const unlocked = pass ? Math.max(s.unlocked, Math.min(MAX_LEVEL, lv + 1)) : Math.max(s.unlocked, lv);
  const next = pass ? Math.min(MAX_LEVEL, lv + 1) : lv;
  return {
    state: { current: next, unlocked, stars: { ...s.stars, [lv]: best }, plays: { ...s.plays, [lv]: plays } },
    stars,
    next,
    opened: unlocked > s.unlocked,
    allDone: pass && lv === MAX_LEVEL,
  };
}

/** Choose a level from the path: only open ones. */
export const pickLevel = (s: LevelState, n: number): LevelState =>
  clampLevel(n) <= s.unlocked ? { ...s, current: clampLevel(n) } : s;

/** The parent opens every level. */
export const unlockAll = (s: LevelState): LevelState => ({ ...s, unlocked: MAX_LEVEL });

/** First level whose skill is `skill` (a new child of an older age starts there), else 1. */
export function firstLevelOf(spec: (n: number) => LevelSpec, skill: SkillId): number {
  for (let n = 1; n <= MAX_LEVEL; n++) if (spec(n).skill === skill) return n;
  return 1;
}

/** Splits 1…50 into bands: band(n, [10, 12, 14, 14]) → index of the band n falls in. */
export function band(n: number, sizes: readonly number[]): number {
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    acc += sizes[i];
    if (n <= acc) return i;
  }
  return sizes.length - 1;
}

/** 0…1 position of n inside its band (for knobs that grow within a band). */
export function within(n: number, sizes: readonly number[]): number {
  let start = 1;
  for (const size of sizes) {
    if (n < start + size) return size <= 1 ? 1 : (n - start) / (size - 1);
    start += size;
  }
  return 1;
}
