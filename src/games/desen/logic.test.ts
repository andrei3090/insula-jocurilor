import { describe, expect, it } from 'vitest';
import { lines } from '../../voice/lines';
import { POTS, stampAt } from './logic';

describe('desen', () => {
  it('keeps a stamp inside the canvas', () => {
    expect(stampAt(5, 5, 100, 800, 500)).toEqual({ x: 50, y: 50 });
    expect(stampAt(790, 495, 100, 800, 500)).toEqual({ x: 750, y: 450 });
    expect(stampAt(300, 200, 100, 800, 500)).toEqual({ x: 300, y: 200 });
  });

  it('every colour pot says its colour in Romanian', () => {
    for (const p of POTS) expect(lines[p.voice]).toBeTruthy();
  });
});
