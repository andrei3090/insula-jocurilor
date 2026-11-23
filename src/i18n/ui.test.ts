import { describe, expect, it } from 'vitest';
import { lines, linesEn } from '../voice/lines';
import { tr, UI } from './ui';

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Romanian and English', () => {
  it('every screen text exists in both languages, with the same placeholders', () => {
    for (const k of Object.keys(UI.ro) as (keyof typeof UI.ro)[]) {
      expect(UI.en[k], k).toBeTruthy();
      expect(vars(UI.en[k]), k).toEqual(vars(UI.ro[k]));
    }
  });

  it('every spoken line exists in both languages', () => {
    expect(Object.keys(linesEn).sort()).toEqual(Object.keys(lines).sort());
    for (const [k, v] of Object.entries(linesEn)) expect(v.trim(), k).not.toBe('');
  });

  it('placeholders are filled', () => {
    expect(tr('level', 'ro', { n: 7 })).toBe('Nivelul 7');
    expect(tr('level', 'en', { n: 7 })).toBe('Level 7');
  });

  it('the English texts have no Romanian diacritics, except the Romanian letter names and language names', () => {
    const ro = /[ăâîșțĂÂÎȘȚ]/;
    const bad = Object.entries(UI.en).filter(([, v]) => ro.test(v));
    expect(bad).toEqual([]);
    const badLines = Object.entries(linesEn).filter(
      ([k, v]) => ro.test(v) && !/^(letter|abc\.word)\./.test(k),
    );
    expect(badLines).toEqual([]);
  });
});
