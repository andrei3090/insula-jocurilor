import type { EmojiName } from '../../art/Emoji';
import type { Avatar } from '../../core/profile';
import { int, type Rand, sample, shuffle } from '../../core/rng';

export const SKILLS = ['mem.2x2', 'mem.2x3', 'mem.3x4', 'mem.4x4'] as const;
export type MemSkill = (typeof SKILLS)[number];

/** [columns, rows] */
export const GRID: Record<MemSkill, [number, number]> = {
  'mem.2x2': [2, 2],
  'mem.2x3': [3, 2],
  'mem.3x4': [4, 3],
  'mem.4x4': [4, 4],
};

export type Face =
  | { kind: 'guide'; id: Avatar }
  | { kind: 'emoji'; name: EmojiName }
  | { kind: 'count'; n: number; name: EmojiName }
  | { kind: 'digit'; n: number };

export type MemCard = { uid: number; pair: string; face: Face };

const GUIDES: Avatar[] = ['pufi', 'bruno', 'cenusareasa', 'marina', 'tavi'];
const BALL: EmojiName[] = [
  'crown',
  'high-heeled-shoe',
  'glowing-star',
  'gem-stone',
  'ring',
  'castle',
  'ballet-shoes',
  'magic-wand',
  'cherry-blossom',
  'unicorn',
  'butterfly',
  'birthday-cake',
  'balloon',
  'strawberry',
  'rainbow',
  'teddy-bear',
];

export function makeDeck(skill: MemSkill, r: Rand): MemCard[] {
  const [c, rows] = GRID[skill];
  const pairs = (c * rows) / 2;
  const numberPairs = skill === 'mem.3x4' ? 3 : skill === 'mem.4x4' ? 4 : 0;
  const picturePairs = pairs - numberPairs;
  const guideCount = Math.min(GUIDES.length, int(r, 1, Math.max(1, Math.floor(picturePairs / 2))));
  const faces: { pair: string; a: Face; b: Face }[] = [
    ...sample(r, GUIDES, guideCount).map((id) => ({
      pair: `g-${id}`,
      a: { kind: 'guide', id } as Face,
      b: { kind: 'guide', id } as Face,
    })),
    ...sample(r, BALL, picturePairs - guideCount).map((name) => ({
      pair: `e-${name}`,
      a: { kind: 'emoji', name } as Face,
      b: { kind: 'emoji', name } as Face,
    })),
    ...sample(r, [1, 2, 3, 4, 5, 6], numberPairs).map((n) => ({
      pair: `n-${n}`,
      a: { kind: 'digit', n } as Face,
      b: { kind: 'count', n, name: sample(r, BALL, 1)[0] } as Face,
    })),
  ];
  return shuffle(
    r,
    faces.flatMap((f) => [
      { pair: f.pair, face: f.a },
      { pair: f.pair, face: f.b },
    ]),
  ).map((x, uid) => ({ ...x, uid }));
}

export type MemState = { open: number[]; matched: string[]; locked: boolean; mismatches: number };
export type FlipEvent = 'open1' | 'match' | 'mismatch' | 'ignored';

export const initial = (): MemState => ({ open: [], matched: [], locked: false, mismatches: 0 });

export function flip(s: MemState, uid: number, deck: readonly MemCard[]): [MemState, FlipEvent] {
  const card = deck.find((d) => d.uid === uid);
  if (!card || s.locked || s.open.includes(uid) || s.matched.includes(card.pair)) return [s, 'ignored'];
  if (s.open.length === 0) return [{ ...s, open: [uid] }, 'open1'];
  const first = deck.find((d) => d.uid === s.open[0])!;
  if (first.pair === card.pair) return [{ ...s, open: [], matched: [...s.matched, card.pair] }, 'match'];
  return [{ ...s, open: [s.open[0], uid], locked: true, mismatches: s.mismatches + 1 }, 'mismatch'];
}

export const close = (s: MemState): MemState => ({ ...s, open: [], locked: false });

export const solved = (s: MemState, deck: readonly MemCard[]) => s.matched.length * 2 === deck.length;
