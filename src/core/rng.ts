export type Rand = () => number;

/** mulberry32: small, fast, seedable PRNG (deterministic tests and replays). */
export function rng(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Integer in [min, max], both inclusive. */
export const int = (r: Rand, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

export const pick = <T>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

export function shuffle<T>(r: Rand, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** n distinct items (n ≤ xs.length). */
export const sample = <T>(r: Rand, xs: readonly T[], n: number): T[] => shuffle(r, xs).slice(0, n);
