import { describe, expect, it } from 'vitest';
import { outlineToSvgPath, strokeOutline } from './ink';

const line = (p: number) =>
  Array.from({ length: 12 }, (_, i) => [10 + i * 10, 50, p] as [number, number, number]);

const height = (pts: number[][]) => Math.max(...pts.map((q) => q[1])) - Math.min(...pts.map((q) => q[1]));

describe('ink', () => {
  it('produces a closed outline for 3+ points', () => {
    const o = strokeOutline(line(0.5), 12, true);
    expect(o.length).toBeGreaterThan(6);
    expect(outlineToSvgPath(o)).toMatch(/^M.+Z$/);
  });

  it('pen pressure makes the line thicker', () => {
    const light = height(strokeOutline(line(0.15), 12, true));
    const heavy = height(strokeOutline(line(0.95), 12, true));
    expect(heavy).toBeGreaterThan(light * 1.5);
  });

  it('a single tap still makes a dot', () => {
    expect(strokeOutline([[5, 5, 0.5]], 12, false).length).toBeGreaterThan(3);
  });
});
