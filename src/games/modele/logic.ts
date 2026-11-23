import { band, type LevelSpec } from '../../core/levels';
import { int, pick, type Rand, sample, shuffle } from '../../core/rng';

export const SKILLS = ['pattern.ab', 'pattern.aab', 'pattern.abc', 'pattern.aabb', 'pattern.gap'] as const;
export type ModeleSkill = (typeof SKILLS)[number];

export const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'] as const;
export const COLORS = {
  red: '#ff5f6d',
  blue: '#4c8df0',
  yellow: '#ffd84c',
  green: '#5fcf5f',
  purple: '#9b7bff',
} as const;
export type Shape = (typeof SHAPES)[number];
export type ColorId = keyof typeof COLORS;
export type Token = { shape: Shape; color: ColorId };

/** Pattern units: letters stand for distinct tokens (AAB = two of A, then B). */
const UNITS: Record<ModeleSkill, readonly string[]> = {
  'pattern.ab': ['AB'],
  'pattern.aab': ['AAB', 'ABB'],
  'pattern.abc': ['ABC'],
  'pattern.aabb': ['AABB', 'ABCC', 'ABBC'],
  'pattern.gap': ['AB', 'AAB', 'ABB', 'ABC', 'AABB', 'ABCC'],
};

export type ModeleItem = {
  unit: string;
  /** the row, with `gap` = the index she must fill */
  row: Token[];
  gap: number;
  answer: Token;
  options: Token[];
};

export type ModeleSpec = LevelSpec & { skill: ModeleSkill; options: number; vary: 'one' | 'both' };

/** Levels 1…50: AB → AAB/ABB → ABC → AABB/ABCC → a gap inside the row with shape and colour both changing. */
const BANDS = [10, 10, 10, 10, 10] as const;
export function levelSpec(n: number): ModeleSpec {
  const b = band(n, BANDS);
  return { skill: SKILLS[b], options: b < 2 ? 3 : 4, vary: b === 4 ? 'both' : 'one' };
}

export const same = (a: Token, b: Token) => a.shape === b.shape && a.color === b.color;
const COLOR_IDS = Object.keys(COLORS) as ColorId[];

/** Distinct tokens for the letters of a unit: only the colour changes, only the shape, or both. */
function tokensFor(letters: number, vary: 'color' | 'shape' | 'both', r: Rand): Token[] {
  const shapes = sample(r, SHAPES, letters);
  const colors = sample(r, COLOR_IDS, letters);
  if (vary === 'both') return shapes.map((shape, i) => ({ shape, color: colors[i] }));
  if (vary === 'color') {
    const shape = pick(r, SHAPES);
    return colors.map((color) => ({ shape, color }));
  }
  const color = pick(r, COLOR_IDS);
  return shapes.map((shape) => ({ shape, color }));
}

export function makeItem(spec: ModeleSpec, r: Rand): ModeleItem {
  const unit = pick(r, UNITS[spec.skill]);
  const letters = [...new Set(unit)];
  const vary = spec.vary === 'both' ? 'both' : pick(r, ['color', 'shape'] as const);
  const toks = tokensFor(letters.length, vary, r);
  const tok = (ch: string) => toks[letters.indexOf(ch)];
  // two full units plus the start of a third, so the repeat is always clear
  const len = unit.length * 2 + int(r, 1, unit.length);
  const row = Array.from({ length: len }, (_, i) => tok(unit[i % unit.length]));
  // the gap: the last place, or (gap levels) a place inside the second half, never in the first unit
  const gap = spec.skill === 'pattern.gap' ? int(r, unit.length, len - 1) : len - 1;
  const answer = row[gap];
  // choices: the other tokens of the pattern first (she must read the pattern), then a new one
  const inUnit = toks.filter((t) => !same(t, answer));
  const extra = tokensFor(SHAPES.length, vary, r).filter((t) => !toks.some((u) => same(u, t)));
  const distractors = [...inUnit, ...extra].slice(0, spec.options - 1);
  return { unit, row, gap, answer, options: shuffle(r, [answer, ...distractors]) };
}

export const isRight = (it: ModeleItem, t: Token) => same(t, it.answer);
