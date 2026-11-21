import { describe, expect, it } from 'vitest';
import { rng } from '../../core/rng';
import { lines } from '../../voice/lines';
import { dotAt, PICTURES, pickPicture, picturesFor, reach, SKILLS } from './logic';

describe('unește punctele: pictures', () => {
  it('every level has at least 2 pictures, all dots inside the box', () => {
    for (const s of SKILLS) expect(picturesFor(s).length, s).toBeGreaterThanOrEqual(2);
    for (const p of PICTURES)
      for (const [x, y] of p.dots) expect(x >= 0 && x <= 1 && y >= 0 && y <= 1, p.id).toBe(true);
  });

  it('dots of a picture are far enough apart to tell them apart with a finger', () => {
    for (const p of PICTURES)
      for (let i = 0; i < p.dots.length; i++)
        for (let j = i + 1; j < p.dots.length; j++) {
          const d = Math.hypot(p.dots[i][0] - p.dots[j][0], p.dots[i][1] - p.dots[j][1]);
          expect(d, `${p.id} ${i}-${j}`).toBeGreaterThan(0.07);
        }
  });

  it('every picture has its spoken name', () => {
    for (const p of PICTURES) expect(lines[`dots.pic.${p.id}` as keyof typeof lines], p.id).toBeTruthy();
  });

  it('does not repeat the previous picture', () => {
    const r = rng(3);
    let prev = pickPicture('dots.10', r);
    for (let i = 0; i < 20; i++) {
      const next = pickPicture('dots.10', r, prev.id);
      expect(next.id).not.toBe(prev.id);
      prev = next;
    }
  });
});

describe('unește punctele: connecting', () => {
  const dots: [number, number][] = [
    [0.1, 0.1],
    [0.5, 0.1],
    [0.9, 0.1],
  ];

  it('dotAt finds the nearest dot within the radius', () => {
    expect(dotAt({ x: 0.52, y: 0.12 }, dots, 0.08)).toBe(1);
    expect(dotAt({ x: 0.3, y: 0.5 }, dots, 0.08)).toBe(-1);
  });

  it('only the next dot connects; the last one reached is ignored; others are wrong', () => {
    let s = { next: 0, done: false };
    let r = reach(s, 0, 3);
    expect(r.event).toBe('connect');
    s = r.state;
    expect(reach(s, 0, 3).event).toBe('same');
    expect(reach(s, 2, 3).event).toBe('wrong');
    r = reach(s, 1, 3);
    s = r.state;
    r = reach(s, 2, 3);
    expect(r.state.done).toBe(true);
  });
});
