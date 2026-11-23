import { describe, expect, it } from 'vitest';
import { lettersFor } from '../games/abc/data';
import { levelSpec as cifre } from '../games/cifre/logic';
import { makeDeck, levelSpec as memorie } from '../games/memorie/logic';
import { levelSpec as nisip } from '../games/nisip/logic';
import { makeItem, levelSpec as panda } from '../games/panda/logic';
import { levelSpec as xilofon } from '../games/xilofon/logic';
import { MAX_LEVEL } from './levels';
import { games } from './registry';
import { rng } from './rng';

const ALL = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

describe('every learning game has 50 levels that get harder, never easier', () => {
  const leveled = games().filter((g) => g.levelSpec);
  it('the thirteen learning games have levels; free drawing and colouring do not', () => {
    expect(leveled.map((g) => g.id).sort()).toEqual(
      [
        'abc',
        'bule',
        'cifre',
        'ghidat',
        'memorie',
        'modele',
        'navigator',
        'nisip',
        'panda',
        'puncte',
        'umbre',
        'ursi',
        'xilofon',
      ].sort(),
    );
  });

  it.each(leveled.map((g) => [g.id, g] as const))('%s: each level trains a known skill, in order', (_, g) => {
    let prev = -1;
    for (const n of ALL) {
      const spec = g.levelSpec!(n);
      const k = g.skills.indexOf(spec.skill);
      expect(k, `${g.id} level ${n}`).toBeGreaterThanOrEqual(0);
      // the song levels of the xylophone are a rest between harder sequences
      if (!(g.id === 'xilofon' && spec.song)) {
        expect(k, `${g.id} level ${n} went back`).toBeGreaterThanOrEqual(prev === -1 ? 0 : Math.min(prev, k));
        if (spec.skill !== 'xilo.song') prev = Math.max(prev, k);
      }
    }
  });

  it('panda: number ranges are valid and grow', () => {
    let hi = 0;
    for (const n of ALL) {
      const { range, skill } = panda(n);
      expect(range[0]).toBeGreaterThanOrEqual(1);
      expect(range[0]).toBeLessThanOrEqual(range[1]);
      expect(range[1]).toBeLessThanOrEqual(10);
      if (!skill.startsWith('add')) hi = Math.max(hi, range[1]);
      const it = makeItem(skill, rng(n), undefined, range);
      expect(it.target).toBeGreaterThanOrEqual(range[0]);
      expect(it.target).toBeLessThanOrEqual(range[1]);
    }
    expect(hi).toBe(10);
  });

  it('cifre: digits up to 3, then 5, then 10; four balloons from level 41', () => {
    expect(cifre(1).max).toBe(3);
    expect(cifre(12).max).toBe(5);
    expect(cifre(50).max).toBe(10);
    expect(cifre(40).choices).toBe(3);
    expect(cifre(41).choices).toBe(4);
  });

  it('memorie: a valid deck at every level, number pairs grow to 6', () => {
    for (const n of ALL) {
      const { skill, numbers } = memorie(n);
      const deck = makeDeck(skill, rng(n), numbers);
      expect(deck.length % 2).toBe(0);
      expect(new Set(deck.map((c) => c.pair)).size).toBe(deck.length / 2);
    }
    expect(memorie(50).numbers).toBe(6);
  });

  it('xilofon: sequences of 2 → 7 notes, a song every 10th level', () => {
    expect(xilofon(1).length).toBe(2);
    expect(xilofon(49).length).toBe(7);
    expect(ALL.filter((n) => xilofon(n).song)).toEqual([10, 20, 30, 40, 50]);
  });

  it('nisip: at least 3 shapes of each kind, more as she climbs, the path narrows', () => {
    expect(nisip(1).letters).toBeGreaterThanOrEqual(3);
    expect(nisip(40).letters).toBeGreaterThan(nisip(11).letters);
    expect(nisip(50).tight).toBeLessThan(nisip(1).tight);
  });

  it('abc: both alphabets have their letters and pictures', () => {
    expect(lettersFor('ro').length).toBeGreaterThanOrEqual(31);
    expect(
      lettersFor('en')
        .map((l) => l.id)
        .join(''),
    ).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    for (const l of lettersFor('en')) if (l.word) expect(l.word[0].toUpperCase()).toBe(l.id);
  });
});
