import { band, type LevelSpec, within } from '../../core/levels';
import { int, pick, type Rand, sample, shuffle } from '../../core/rng';

export const SKILLS = ['bule.color2', 'bule.color5', 'bule.count5', 'bule.digit5'] as const;
export type BuleSkill = (typeof SKILLS)[number];

/** Bubble colours: the plural adjective goes in the spoken line ("Sparge bulele roșii!"). */
export const COLORS = {
  red: '#ff5f6d',
  blue: '#4c8df0',
  yellow: '#ffd84c',
  green: '#5fcf5f',
  orange: '#ffa24c',
  purple: '#9b7bff',
  pink: '#ff8fc8',
} as const;
export type ColorId = keyof typeof COLORS;
const ORDER: ColorId[] = ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink'];

export type Bubble = { id: number; color: ColorId; digit?: number; slot: number };
export type BuleItem = {
  mode: 'color' | 'count' | 'digit';
  /** colour mode: the colour to pop */
  color?: ColorId;
  /** count mode: how many to pop; digit mode: the digit to pop */
  n?: number;
  bubbles: Bubble[];
};

/** Bubbles sit in slots of a 4 × 3 grid (the screen places and wobbles them). */
export const SLOTS = 12;

export type BuleSpec = LevelSpec & {
  skill: BuleSkill;
  bubbles: number;
  /** colour mode: how many colours are on screen */
  colors?: number;
  /** colour/digit mode: how many bubbles to pop (always ≥ 2: the line says "the red bubbles") */
  targets?: [number, number];
  /** count mode: the largest number she is asked for */
  max?: number;
};

/**
 * Levels 1…50: two colours (3–5 bubbles) → up to five colours (6–8 bubbles) → "pop three bubbles" (count 1–5,
 * counted aloud) → bubbles with digits ("the bubbles with the number 3").
 */
const BANDS = [12, 13, 15, 10] as const;
export function levelSpec(n: number): BuleSpec {
  const b = band(n, BANDS);
  const w = within(n, BANDS);
  if (b === 0) return { skill: 'bule.color2', bubbles: 3 + Math.round(2 * w), colors: 2, targets: [2, 2] };
  if (b === 1)
    return {
      skill: 'bule.color5',
      bubbles: 6 + Math.round(2 * w),
      colors: 3 + Math.round(2 * w),
      targets: [2, 3],
    };
  if (b === 2) return { skill: 'bule.count5', bubbles: 6 + Math.round(2 * w), max: 2 + Math.round(3 * w) };
  return { skill: 'bule.digit5', bubbles: 5 + Math.round(3 * w), targets: [2, 3] };
}

const slots = (r: Rand, k: number) =>
  sample(
    r,
    Array.from({ length: SLOTS }, (_, i) => i),
    k,
  );

export function makeItem(spec: BuleSpec, r: Rand, prev?: BuleItem): BuleItem {
  const n = Math.min(spec.bubbles, SLOTS);
  const at = slots(r, n);
  if (spec.skill === 'bule.count5') {
    let c = int(r, 1, Math.min(spec.max ?? 5, n - 1));
    for (let i = 0; i < 6 && c === prev?.n; i++) c = int(r, 1, Math.min(spec.max ?? 5, n - 1));
    const palette = sample(r, ORDER, 3);
    return { mode: 'count', n: c, bubbles: at.map((slot, id) => ({ id, slot, color: palette[id % 3] })) };
  }
  const [lo, hi] = spec.targets ?? [2, 2];
  const t = Math.max(2, Math.min(int(r, lo, hi), n - 1));
  if (spec.skill === 'bule.digit5') {
    let d = int(r, 1, 5);
    for (let i = 0; i < 6 && d === prev?.n; i++) d = int(r, 1, 5);
    const others = [1, 2, 3, 4, 5].filter((x) => x !== d);
    const digits = shuffle(r, [...Array(t).fill(d), ...Array.from({ length: n - t }, () => pick(r, others))]);
    const palette = sample(r, ORDER, 4);
    return {
      mode: 'digit',
      n: d,
      bubbles: at.map((slot, id) => ({ id, slot, digit: digits[id], color: palette[id % 4] })),
    };
  }
  const k = Math.max(2, Math.min(spec.colors ?? 2, ORDER.length));
  let color = pick(r, ORDER.slice(0, Math.max(k, 4)));
  for (let i = 0; i < 6 && color === prev?.color; i++) color = pick(r, ORDER.slice(0, Math.max(k, 4)));
  const rest = sample(
    r,
    ORDER.filter((c) => c !== color),
    k - 1,
  );
  const colors = shuffle(r, [
    ...Array<ColorId>(t).fill(color),
    ...Array.from({ length: n - t }, (_, i) => rest[i % rest.length]),
  ]);
  return { mode: 'color', color, bubbles: at.map((slot, id) => ({ id, slot, color: colors[id] })) };
}

/** Is this bubble one she is asked to pop? (count mode: any bubble) */
export const isTarget = (it: BuleItem, b: Bubble) =>
  it.mode === 'count' ? true : it.mode === 'digit' ? b.digit === it.n : b.color === it.color;

/** How many pops finish the item. */
export const needed = (it: BuleItem) =>
  it.mode === 'count' ? (it.n ?? 1) : it.bubbles.filter((b) => isTarget(it, b)).length;

/** A tap on bubble `id`, with `popped` already gone: pop it, or it is the wrong one; 'done' ends the item. */
export function tap(it: BuleItem, popped: readonly number[], id: number): 'pop' | 'done' | 'wrong' | 'gone' {
  const b = it.bubbles.find((x) => x.id === id);
  if (!b || popped.includes(id)) return 'gone';
  if (!isTarget(it, b)) return 'wrong';
  return popped.length + 1 >= needed(it) ? 'done' : 'pop';
}
