import type { EmojiName } from '../../art/Emoji';
import { pick, type Rand } from '../../core/rng';

export const SKILLS = ['dots.5', 'dots.10', 'dots.15'] as const;
export type DotsSkill = (typeof SKILLS)[number];

export type Picture = {
  id: string;
  /** emoji shown when the picture comes alive */
  emoji: EmojiName;
  color: string;
  closed: boolean;
  /** dots in drawing order, unit box (0..1, y down) */
  dots: [number, number][];
};

export const PICTURES: Picture[] = [
  {
    id: 'casa',
    emoji: 'house',
    color: '#ffb4a2',
    closed: true,
    dots: [
      [0.22, 0.88],
      [0.22, 0.45],
      [0.5, 0.14],
      [0.78, 0.45],
      [0.78, 0.88],
    ],
  },
  {
    id: 'diamant',
    emoji: 'gem-stone',
    color: '#9be7ff',
    closed: true,
    dots: [
      [0.3, 0.22],
      [0.7, 0.22],
      [0.88, 0.42],
      [0.5, 0.88],
      [0.12, 0.42],
    ],
  },
  {
    id: 'munte',
    emoji: 'snowflake',
    color: '#c6f0a8',
    closed: false,
    dots: [
      [0.06, 0.85],
      [0.3, 0.35],
      [0.5, 0.62],
      [0.72, 0.2],
      [0.94, 0.85],
    ],
  },
  {
    id: 'stea',
    emoji: 'glowing-star',
    color: '#ffd166',
    closed: true,
    dots: Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 0.18 : 0.42;
      return [0.5 + r * Math.cos(a), 0.54 + r * Math.sin(a)] as [number, number];
    }),
  },
  {
    id: 'peste',
    emoji: 'tropical-fish',
    color: '#4cc9c0',
    closed: true,
    dots: [
      [0.9, 0.5],
      [0.58, 0.24],
      [0.32, 0.42],
      [0.1, 0.24],
      [0.1, 0.76],
      [0.32, 0.58],
      [0.58, 0.76],
    ],
  },
  {
    id: 'inima',
    emoji: 'red-heart',
    color: '#ff8a80',
    closed: true,
    dots: [
      [0.5, 0.88],
      [0.14, 0.5],
      [0.14, 0.3],
      [0.3, 0.16],
      [0.5, 0.3],
      [0.7, 0.16],
      [0.86, 0.3],
      [0.86, 0.5],
    ],
  },
  {
    id: 'coroana',
    emoji: 'crown',
    color: '#ffd166',
    closed: true,
    dots: [
      [0.14, 0.8],
      [0.14, 0.3],
      [0.32, 0.55],
      [0.5, 0.2],
      [0.68, 0.55],
      [0.86, 0.3],
      [0.86, 0.8],
    ],
  },
  {
    id: 'barca',
    emoji: 'sailboat',
    color: '#7cc7f2',
    closed: false,
    dots: [
      [0.08, 0.66],
      [0.24, 0.86],
      [0.76, 0.86],
      [0.92, 0.66],
      [0.52, 0.66],
      [0.52, 0.1],
      [0.84, 0.58],
      [0.52, 0.58],
    ],
  },
  {
    id: 'fluture',
    emoji: 'butterfly',
    color: '#cfaef0',
    closed: true,
    dots: [
      [0.5, 0.3],
      [0.32, 0.1],
      [0.1, 0.16],
      [0.12, 0.42],
      [0.36, 0.5],
      [0.14, 0.62],
      [0.2, 0.86],
      [0.42, 0.8],
      [0.5, 0.6],
      [0.58, 0.8],
      [0.8, 0.86],
      [0.86, 0.62],
      [0.64, 0.5],
      [0.88, 0.42],
      [0.9, 0.16],
      [0.68, 0.1],
    ],
  },
  {
    id: 'castel',
    emoji: 'castle',
    color: '#f8bbd0',
    closed: true,
    dots: [
      [0.12, 0.9],
      [0.12, 0.3],
      [0.24, 0.18],
      [0.36, 0.3],
      [0.36, 0.45],
      [0.5, 0.12],
      [0.64, 0.45],
      [0.64, 0.3],
      [0.76, 0.18],
      [0.88, 0.3],
      [0.88, 0.9],
      [0.6, 0.9],
      [0.6, 0.7],
      [0.4, 0.7],
      [0.4, 0.9],
    ],
  },
];

const RANGE: Record<DotsSkill, [number, number]> = {
  'dots.5': [3, 5],
  'dots.10': [6, 10],
  'dots.15': [11, 16],
};

export const picturesFor = (skill: DotsSkill) =>
  PICTURES.filter((p) => p.dots.length >= RANGE[skill][0] && p.dots.length <= RANGE[skill][1]);

export function pickPicture(skill: DotsSkill, r: Rand, prevId?: string): Picture {
  const list = picturesFor(skill);
  const others = list.filter((p) => p.id !== prevId);
  return pick(r, others.length ? others : list);
}

/** Index of the dot under the pointer (unit coordinates), or -1. */
export function dotAt(p: { x: number; y: number }, dots: readonly [number, number][], r: number): number {
  let best = -1;
  let bestD = r;
  dots.forEach(([x, y], i) => {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

export type DotsState = { next: number; done: boolean };

/** Reaching dot `i`: connects it if it is the next one. */
export function reach(
  s: DotsState,
  i: number,
  total: number,
): { state: DotsState; event: 'connect' | 'wrong' | 'same' } {
  if (i === s.next) {
    const next = s.next + 1;
    return { state: { next, done: next >= total }, event: 'connect' };
  }
  if (i === s.next - 1 || i < 0) return { state: s, event: 'same' };
  return { state: s, event: 'wrong' };
}
