import { describe, expect, it } from 'vitest';
import { lines } from '../../voice/lines';
import { dist, line, type Pt, pathLength, resample } from '../nisip/geometry';
import { circle, DRAWINGS, outside, regionsOf } from './drawings';
import {
  applyStroke,
  coverageNeed,
  emptyProgress,
  floodFill,
  growInto,
  outsideRun,
  pickRegion,
  pointInPolygon,
  type Region,
  tolFor,
} from './logic';

const tol4 = tolFor(4, false);
const need4 = coverageNeed(4);
const wobble = (pts: Pt[], amp: number) =>
  resample(pts, 80).map((p, i) => ({ x: p.x + amp * Math.sin(i), y: p.y + amp * Math.cos(i * 1.3) }));

describe('how much must be drawn', () => {
  it('80% at age 4, 88% from age 7', () => {
    expect(coverageNeed(4)).toBeCloseTo(0.8);
    expect(coverageNeed(7)).toBeCloseTo(0.88);
    expect(coverageNeed(10)).toBeCloseTo(0.88);
  });
  it('the errorless rung widens the tolerance', () => {
    expect(tolFor(4, true).r).toBeCloseTo(tolFor(4, false).r * 1.6);
  });
});

describe('tracing a step', () => {
  const head = circle(0.5, 0.5, 0.3);

  it('a wobbly circle all the way round finishes it, in either direction', () => {
    for (const pts of [head, [...head].reverse()]) {
      const r = applyStroke(emptyProgress([head]), wobble(pts, 0.03), [head], tol4, need4);
      expect(r.accepted).toBe(true);
      expect(r.done).toBe(true);
    }
  });

  it('several strokes add up, in any order', () => {
    const half1 = head.slice(0, 32);
    const half2 = head.slice(30);
    let s = applyStroke(emptyProgress([head]), half2, [head], tol4, need4);
    expect(s.accepted && !s.done).toBe(true);
    s = applyStroke(s.prog, half1, [head], tol4, need4);
    expect(s.done).toBe(true);
  });

  it('a stroke away from the guide is not accepted and marks nothing', () => {
    const r = applyStroke(emptyProgress([head]), line([0.02, 0.02], [0.15, 0.1]), [head], tol4, need4);
    expect(r.accepted).toBe(false);
    expect(r.prog[0].some(Boolean)).toBe(false);
  });

  it('a stroke mostly off the guide is not accepted', () => {
    const scribble = [...head.slice(0, 10), ...resample(line([0.5, 0.5], [0.52, 0.55]), 30)];
    expect(applyStroke(emptyProgress([head]), scribble, [head], tol4, need4).accepted).toBe(false);
  });

  it('one tap cannot finish a short line, a stroke along it can', () => {
    const ray = line([0.5, 0.1], [0.5, 0.22]);
    const tap = applyStroke(emptyProgress([ray]), [{ x: 0.5, y: 0.16 }], [ray], tol4, need4);
    expect(tap.done).toBe(false);
    const stroke = applyStroke(emptyProgress([ray]), resample(ray, 10), [ray], tol4, need4);
    expect(stroke.done).toBe(true);
  });

  it('dots (eyes) are done by a tap near each of them', () => {
    const eyes = [[{ x: 0.4, y: 0.5 }], [{ x: 0.6, y: 0.5 }]];
    let s = applyStroke(emptyProgress(eyes), [{ x: 0.43, y: 0.52 }], eyes, tol4, need4);
    expect(s.accepted && !s.done).toBe(true);
    s = applyStroke(s.prog, [{ x: 0.61, y: 0.47 }], eyes, tol4, need4);
    expect(s.done).toBe(true);
    expect(applyStroke(emptyProgress(eyes), [{ x: 0.5, y: 0.9 }], eyes, tol4, need4).accepted).toBe(false);
  });

  it('the tolerance tightens with age', () => {
    const sloppy = wobble(head, 0.075);
    expect(applyStroke(emptyProgress([head]), sloppy, [head], tol4, need4).done).toBe(true);
    expect(
      applyStroke(emptyProgress([head]), sloppy, [head], tolFor(8, false), coverageNeed(8)).accepted,
    ).toBe(false);
  });
});

describe('shapes', () => {
  it('point in polygon', () => {
    const sq = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, sq)).toBe(true);
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, sq)).toBe(false);
  });

  it('an ear behind the head is traced only where it shows, as one piece', () => {
    const head = circle(0.5, 0.56, 0.3);
    const ear = circle(0.26, 0.3, 0.11);
    const arcPts = outside(ear, head);
    expect(arcPts.every((p) => !pointInPolygon(p, head))).toBe(true);
    expect(pathLength(arcPts)).toBeGreaterThan(pathLength(ear) * 0.5);
    expect(pathLength(arcPts)).toBeLessThan(pathLength(ear) * 0.95);
    for (let i = 1; i < arcPts.length; i++) expect(dist(arcPts[i], arcPts[i - 1])).toBeLessThan(0.03);
  });

  it('an open path keeps its longest outside run', () => {
    const l = resample(line([0, 0.5], [1, 0.5]), 11);
    const run = outsideRun(l, (p) => p.x > 0.25 && p.x < 0.45);
    expect(run[0].x).toBeCloseTo(0.5);
    expect(run.at(-1)?.x).toBeCloseTo(1);
  });

  it('a tap picks the top region, the border counts within the pad, elsewhere is background', () => {
    const regions: Region[] = [
      { pts: circle(0.5, 0.5, 0.3), z: 1, suggest: '#fff' },
      { pts: circle(0.4, 0.45, 0.04), z: 3, suggest: '#fff' },
    ];
    expect(pickRegion({ x: 0.4, y: 0.45 }, regions, 0.02)).toBe(1);
    expect(pickRegion({ x: 0.6, y: 0.6 }, regions, 0.02)).toBe(0);
    expect(pickRegion({ x: 0.81, y: 0.5 }, regions, 0.02)).toBe(0);
    expect(pickRegion({ x: 0.05, y: 0.05 }, regions, 0.02)).toBe(-1);
  });

  it('an eye has no pad: a tap just beside it colours the patch round it', () => {
    const regions: Region[] = [
      { pts: circle(0.4, 0.5, 0.1), z: 2, suggest: '#000' },
      { pts: circle(0.4, 0.5, 0.032), z: 3, suggest: '#fff', pad: 0 },
    ];
    expect(pickRegion({ x: 0.34, y: 0.5 }, regions, 0.06)).toBe(0);
    expect(pickRegion({ x: 0.41, y: 0.5 }, regions, 0.06)).toBe(1);
  });
});

describe('flood fill', () => {
  // a 20×20 image with a square ring of ink from 5 to 14
  const W = 20;
  const ring = new Uint8Array(W * W);
  for (let i = 5; i <= 14; i++) {
    ring[5 * W + i] = 1;
    ring[14 * W + i] = 1;
    ring[i * W + 5] = 1;
    ring[i * W + 14] = 1;
  }
  const count = (m: Uint8Array) => m.reduce((s, v) => s + v, 0);

  it('fills inside her lines and stops at them', () => {
    const m = floodFill(W, W, ring, null, 10, 10);
    expect(count(m)).toBe(64);
    expect(m[0]).toBe(0);
  });

  it('fills the outside without entering the shape', () => {
    const m = floodFill(W, W, ring, null, 1, 1);
    expect(count(m)).toBe(400 - 64 - 36);
    expect(m[10 * W + 10]).toBe(0);
  });

  it('never leaves the allowed mask, even through a gap in her line', () => {
    const gap = ring.slice();
    gap[5 * W + 10] = 0;
    const allowed = new Uint8Array(W * W);
    for (let y = 4; y <= 15; y++) for (let x = 4; x <= 15; x++) allowed[y * W + x] = 1;
    const m = floodFill(W, W, gap, allowed, 10, 10);
    expect(m[0]).toBe(0);
    expect(m[2 * W + 10]).toBe(0);
    expect(m[10 * W + 10]).toBe(1);
  });

  it('the colour runs two pixels under her line, never further', () => {
    const m = growInto(floodFill(W, W, ring, null, 10, 10), ring, W);
    expect(m[10 * W + 5]).toBe(1);
    expect(m[10 * W + 4]).toBe(0);
    expect(count(m)).toBe(64 + 36);
  });

  it('a tap on the line itself fills the nearest free side', () => {
    const m = floodFill(W, W, ring, null, 5, 10);
    expect(count(m)).toBeGreaterThan(0);
  });
});

describe('the drawings', () => {
  it('ids are unique and every step has a voice line and something to trace', () => {
    expect(new Set(DRAWINGS.map((d) => d.id)).size).toBe(DRAWINGS.length);
    for (const d of DRAWINGS) {
      expect(d.steps.length).toBeGreaterThanOrEqual(4);
      for (const s of d.steps) {
        expect(s.voice in lines).toBe(true);
        expect(s.paths.length).toBeGreaterThan(0);
        for (const p of s.paths) expect(p.length).toBeGreaterThan(0);
      }
    }
  });

  it('everything stays inside the box', () => {
    for (const d of DRAWINGS)
      for (const s of d.steps)
        for (const p of [...s.paths.flat(), ...s.regions.flatMap((r) => r.pts)]) {
          expect(p.x).toBeGreaterThanOrEqual(0.02);
          expect(p.x).toBeLessThanOrEqual(0.98);
          expect(p.y).toBeGreaterThanOrEqual(0.02);
          expect(p.y).toBeLessThanOrEqual(0.98);
        }
  });

  it('every drawing has something to colour, back to front', () => {
    for (const d of DRAWINGS) {
      const r = regionsOf(d);
      expect(r.length).toBeGreaterThan(1);
      for (let i = 1; i < r.length; i++) expect(r[i].z).toBeGreaterThanOrEqual(r[i - 1].z);
    }
  });

  it('tracing each part as shown finishes every step, at age 4 and at age 8', () => {
    for (const age of [4, 8])
      for (const d of DRAWINGS)
        for (const s of d.steps) {
          let prog = emptyProgress(s.paths);
          let done = false;
          for (const p of s.paths) {
            const r = applyStroke(
              prog,
              p.length === 1 ? p : resample(p, 60),
              s.paths,
              tolFor(age, false),
              coverageNeed(age),
            );
            expect(r.accepted, `${d.id} ${s.voice}`).toBe(true);
            prog = r.prog;
            done = r.done;
          }
          expect(done, `${d.id} ${s.voice}`).toBe(true);
        }
  });
});
