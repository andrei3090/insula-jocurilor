import type { Avatar } from '../core/profile';
import type { LineId } from '../voice/lines';
import type { Mood } from './parts';

/** What a guide does when tapped, in turn: a hop, a wave, a little dance. */
export const REACTIONS = ['happy', 'wave', 'dance'] as const satisfies readonly Mood[];
export type Reaction = (typeof REACTIONS)[number];

/** How long each reaction lasts (ms); the guide ignores taps meanwhile. */
export const REACTION_MS: Record<Reaction, number> = { happy: 950, wave: 1450, dance: 2300 };

/** A spoken line at most this often, so tapping again and again is not a wall of talk. */
export const LINE_EVERY_MS = 3500;

export const reactionAt = (n: number): Reaction => REACTIONS[((n % 3) + 3) % 3];

/** The line that goes with the n-th reaction (one per reaction: hop, wave, dance). */
export const tapLine = (who: Avatar, n: number) => `tap.${who}.${(((n % 3) + 3) % 3) + 1}` as LineId;

export const GUIDE_NAMES: Record<Avatar, string> = {
  pufi: 'Pufi',
  bruno: 'Bruno',
  cenusareasa: 'Cenușăreasa',
  marina: 'Marina',
  tavi: 'Tavi',
};

/** A little giggle pitch per character (Hz): Pufi high, Tavi a deep giant. */
export const GIGGLE_HZ: Record<Avatar, number> = {
  pufi: 920,
  marina: 820,
  cenusareasa: 760,
  bruno: 440,
  tavi: 250,
};
