import { describe, expect, it } from 'vitest';
import type { Avatar } from '../core/profile';
import { lines } from '../voice/lines';
import { speakerFor } from '../voice/speakers';
import { GIGGLE_HZ, GUIDE_NAMES, REACTION_MS, reactionAt, tapLine } from './live';

const ALL: Avatar[] = ['pufi', 'bruno', 'cenusareasa', 'marina', 'tavi'];

describe('guides come alive when tapped', () => {
  it('they hop, wave and dance in turn', () => {
    expect([0, 1, 2, 3].map(reactionAt)).toEqual(['happy', 'wave', 'dance', 'happy']);
  });

  it('each reaction is short (under 2.5 s)', () => {
    for (const ms of Object.values(REACTION_MS)) expect(ms).toBeLessThan(2500);
  });

  it('every guide has a line for each reaction, spoken in its own voice', () => {
    for (const who of ALL)
      for (let k = 0; k < 3; k++) {
        const id = tapLine(who, k);
        expect(id in lines, id).toBe(true);
        expect(speakerFor(id)).toBe(who);
      }
  });

  it('every guide has a name and a giggle; Tavi giggles deepest, Pufi highest', () => {
    for (const who of ALL) {
      expect(GUIDE_NAMES[who]).toBeTruthy();
      expect(GIGGLE_HZ[who]).toBeGreaterThan(0);
    }
    expect(Math.min(...Object.values(GIGGLE_HZ))).toBe(GIGGLE_HZ.tavi);
    expect(Math.max(...Object.values(GIGGLE_HZ))).toBe(GIGGLE_HZ.pufi);
  });
});
