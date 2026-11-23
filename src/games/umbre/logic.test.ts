import { describe, expect, it } from 'vitest';
import { EMOJI } from '../../art/emoji-data';
import { MAX_LEVEL } from '../../core/levels';
import { rng } from '../../core/rng';
import { textOf } from '../../voice/lines';
import { ANIMAL_IDS, ANIMALS, levelSpec, makeItem } from './logic';

describe('Umbrele animalelor', () => {
  it('every animal has a picture and both lines in both languages', () => {
    for (const a of ANIMAL_IDS) {
      expect(EMOJI[ANIMALS[a].emoji], a).toBeTruthy();
      for (const l of ['ro', 'en'] as const) {
        expect(textOf(`umbre.find.${a}` as never, l), `${a} ${l}`).toBeTruthy();
        expect(textOf(`anim.${a}` as never, l), `${a} ${l}`).toBeTruthy();
      }
    }
  });

  it('every level: the right shadow is there once, all shadows differ, the count grows 2 → 5', () => {
    for (let n = 1; n <= MAX_LEVEL; n++)
      for (let seed = 1; seed <= 30; seed++) {
        const spec = levelSpec(n);
        const it = makeItem(spec, rng(seed * 31 + n));
        expect(it.shadows.length).toBe(spec.shadows);
        expect(new Set(it.shadows).size).toBe(it.shadows.length);
        expect(it.shadows.filter((a) => a === it.target).length).toBe(1);
      }
    expect(levelSpec(1).shadows).toBe(2);
    expect(levelSpec(50).shadows).toBe(5);
  });

  it('easy levels never show a look-alike; hard ones do', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const easy = makeItem(levelSpec(3), rng(seed));
      const fam = ANIMALS[easy.target].family;
      expect(easy.shadows.filter((a) => a !== easy.target && ANIMALS[a].family === fam)).toEqual([]);
      const hard = makeItem(levelSpec(30), rng(seed));
      const f2 = ANIMALS[hard.target].family;
      expect(
        hard.shadows.filter((a) => a !== hard.target && ANIMALS[a].family === f2).length,
      ).toBeGreaterThan(0);
    }
  });
});
