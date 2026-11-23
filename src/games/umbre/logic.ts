import type { EmojiName } from '../../art/Emoji';
import { band, type LevelSpec } from '../../core/levels';
import { pick, type Rand, sample, shuffle } from '../../core/rng';

export const SKILLS = ['umbre.2', 'umbre.3', 'umbre.4', 'umbre.5'] as const;
export type UmbreSkill = (typeof SKILLS)[number];

/** Whole-body pictures only (a face has no telling shadow), grouped by look-alike families. */
export const ANIMALS = {
  dolphin: { emoji: 'dolphin', family: 'sea' },
  whale: { emoji: 'spouting-whale', family: 'sea' },
  shark: { emoji: 'shark', family: 'sea' },
  seal: { emoji: 'seal', family: 'sea' },
  octopus: { emoji: 'octopus', family: 'sea' },
  crab: { emoji: 'crab', family: 'sea' },
  duck: { emoji: 'duck', family: 'bird' },
  chicken: { emoji: 'chicken', family: 'bird' },
  penguin: { emoji: 'penguin', family: 'bird' },
  owl: { emoji: 'owl', family: 'bird' },
  butterfly: { emoji: 'butterfly', family: 'bug' },
  bee: { emoji: 'honeybee', family: 'bug' },
  ladybug: { emoji: 'lady-beetle', family: 'bug' },
  snail: { emoji: 'snail', family: 'bug' },
  elephant: { emoji: 'elephant', family: 'land' },
  turtle: { emoji: 'turtle', family: 'land' },
  hedgehog: { emoji: 'hedgehog', family: 'land' },
  snake: { emoji: 'snake', family: 'land' },
} as const satisfies Record<string, { emoji: EmojiName; family: string }>;
export type AnimalId = keyof typeof ANIMALS;
export const ANIMAL_IDS = Object.keys(ANIMALS) as AnimalId[];
const family = (a: AnimalId) => ANIMALS[a].family;

export type UmbreItem = { target: AnimalId; shadows: AnimalId[] };
export type UmbreSpec = LevelSpec & { skill: UmbreSkill; shadows: number; alike: boolean };

/** Levels 1…50: 2 shadows of very different animals → 3 → 4 look-alikes → 5 look-alikes. */
const BANDS = [12, 13, 15, 10] as const;
export function levelSpec(n: number): UmbreSpec {
  const b = band(n, BANDS);
  return { skill: SKILLS[b], shadows: b + 2, alike: b >= 2 };
}

export function makeItem(spec: UmbreSpec, r: Rand, prev?: AnimalId): UmbreItem {
  let target = pick(r, ANIMAL_IDS);
  for (let i = 0; i < 8 && target === prev; i++) target = pick(r, ANIMAL_IDS);
  const k = spec.shadows - 1;
  const same = ANIMAL_IDS.filter((a) => a !== target && family(a) === family(target));
  const different = ANIMAL_IDS.filter((a) => family(a) !== family(target));
  // easy levels: other families only; look-alike levels: the same family first, then the closest others
  const others = spec.alike
    ? [...sample(r, same, Math.min(k, same.length)), ...sample(r, different, Math.max(0, k - same.length))]
    : sample(r, different, k);
  return { target, shadows: shuffle(r, [target, ...others]) };
}

export const isRight = (it: UmbreItem, a: AnimalId) => a === it.target;
