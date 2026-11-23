import type { LevelSpec } from '../../core/levels';
import { int, type Rand } from '../../core/rng';

export const SKILLS = ['xilo.repeat2', 'xilo.repeat3', 'xilo.song', 'xilo.repeat4', 'xilo.repeat5'] as const;
export type XiloSkill = (typeof SKILLS)[number];

export const BAR_COLORS = [
  '#ff5f6d',
  '#ffa24c',
  '#ffd84c',
  '#6fd36f',
  '#2bb3a3',
  '#4c8df0',
  '#7b6cff',
  '#d86cff',
] as const;

/** Public-domain tunes, as bar indexes (0 = C5 … 7 = C6). */
export const SONGS = {
  // "Frère Jacques" / "Frate Ioane" (traditional)
  frate: [0, 1, 2, 0, 0, 1, 2, 0, 2, 3, 4, 2, 3, 4],
  // "Ah! vous dirai-je, maman" / "Steluța" (traditional)
  steluta: [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0],
} as const;
export type SongId = keyof typeof SONGS;

export const lengthOf = (s: XiloSkill) => (s === 'xilo.song' ? 0 : Number(s.slice(-1)));

/** A sequence to repeat: n bars, no immediate repetition, close notes for small ones (easier to hear). */
export function makeSequence(n: number, r: Rand): number[] {
  const out: number[] = [];
  const span = n <= 2 ? 4 : 7;
  while (out.length < n) {
    const b = int(r, 0, span);
    if (b !== out[out.length - 1]) out.push(b);
  }
  return out;
}

/** Repeat mode: what happens when the child taps `bar` at position `pos` of `seq`. */
export function check(seq: readonly number[], pos: number, bar: number): 'next' | 'done' | 'wrong' {
  if (seq[pos] !== bar) return 'wrong';
  return pos + 1 >= seq.length ? 'done' : 'next';
}

/** Levels 1…50: repeat 2 notes → 7 notes (8 levels each); every 10th level is a song. */
export function levelSpec(n: number): LevelSpec & { skill: XiloSkill; length: number; song: boolean } {
  const song = n % 10 === 0;
  const length = Math.min(7, 2 + Math.floor((n - 1) / 8));
  const skill = song ? 'xilo.song' : (`xilo.repeat${Math.min(5, Math.max(2, length))}` as XiloSkill);
  return { skill, length, song };
}
