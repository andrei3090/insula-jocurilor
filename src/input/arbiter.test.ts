import { describe, expect, it } from 'vitest';
import { createArbiter } from './arbiter';

const ev = (type: string, pointerType: string, pointerId: number, timeStamp: number, buttons = 1) => ({
  type,
  pointerType,
  pointerId,
  timeStamp,
  buttons,
});

describe('pen / touch arbiter', () => {
  it('accepts the first touch when no pen has been seen', () => {
    const a = createArbiter();
    expect(a.accept(ev('pointerdown', 'touch', 1, 0))).toBe(true);
    expect(a.accept(ev('pointermove', 'touch', 1, 10))).toBe(true);
    expect(a.accept(ev('pointerup', 'touch', 1, 20, 0))).toBe(true);
  });

  it('ignores touch while the pen is active and for 1.5 s after it lifts', () => {
    const a = createArbiter();
    expect(a.accept(ev('pointerdown', 'pen', 7, 0))).toBe(true);
    expect(a.accept(ev('pointerdown', 'touch', 2, 50))).toBe(false); // palm
    expect(a.accept(ev('pointerup', 'pen', 7, 400, 0))).toBe(true);
    expect(a.accept(ev('pointerdown', 'touch', 3, 1800))).toBe(false); // 1.4 s after lift
    expect(a.accept(ev('pointerdown', 'touch', 4, 1950))).toBe(true); // 1.55 s after lift
  });

  it('rejects hover moves (pen in the air, buttons = 0)', () => {
    const a = createArbiter();
    expect(a.accept(ev('pointermove', 'pen', 7, 0, 0))).toBe(false);
  });

  it('rejects a second pointer while one is down', () => {
    const a = createArbiter();
    expect(a.accept(ev('pointerdown', 'touch', 1, 0))).toBe(true);
    expect(a.accept(ev('pointerdown', 'touch', 2, 5))).toBe(false);
    expect(a.accept(ev('pointermove', 'touch', 2, 6))).toBe(false);
  });

  it('a pen landing after the palm takes over and reports the palm stroke to drop', () => {
    const dropped: number[] = [];
    const a = createArbiter({ onPreempt: (id) => dropped.push(id) });
    expect(a.accept(ev('pointerdown', 'touch', 2, 0))).toBe(true); // palm first
    expect(a.accept(ev('pointerdown', 'pen', 7, 30))).toBe(true);
    expect(dropped).toEqual([2]);
    expect(a.accept(ev('pointermove', 'touch', 2, 40))).toBe(false);
  });
});
