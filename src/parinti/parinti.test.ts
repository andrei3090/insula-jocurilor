import { describe, expect, it } from 'vitest';
import { ACTIVITY_SCHEMA, buildPrompt, fixDiacritics, parseActivities } from './ai';
import { filterActivities } from './filter';
import { LIBRARY } from './library';
import { SKILLS, WHERE } from './types';

describe('parent app: library', () => {
  it('has 30 complete activities with valid tags', () => {
    expect(LIBRARY).toHaveLength(30);
    expect(new Set(LIBRARY.map((a) => a.id)).size).toBe(30);
    for (const a of LIBRARY) {
      expect(a.play.length).toBeGreaterThan(0);
      expect(a.goal).toBeTruthy();
      expect(a.where.every((w) => w in WHERE)).toBe(true);
      expect(a.skills.every((s) => s in SKILLS)).toBe(true);
      expect(a.ages[0]).toBeLessThanOrEqual(a.ages[1]);
    }
  });

  it('covers every place with at least two ideas for a 4-year-old', () => {
    for (const w of Object.keys(WHERE) as (keyof typeof WHERE)[]) {
      expect(filterActivities(LIBRARY, { age: 4, where: w }).length, w).toBeGreaterThanOrEqual(2);
    }
  });

  it('filters combine (place + energy + time + skill + age)', () => {
    const r = filterActivities(LIBRARY, {
      age: 4,
      where: 'afara',
      energy: 'activ',
      maxMinutes: 15,
      skill: 'numere',
    });
    expect(r.length).toBeGreaterThan(0);
    for (const a of r) {
      expect(a.where).toContain('afara');
      expect(a.energy).toBe('activ');
      expect(a.minutes).toBeLessThanOrEqual(15);
      expect(a.skills).toContain('numere');
    }
    expect(filterActivities(LIBRARY, { age: 10, skill: 'litere', maxMinutes: 5 })).toEqual([]);
  });
});

describe('parent app: AI prompt and parsing', () => {
  it('the prompt carries the context, the safety rules and the no-Disney rule', () => {
    const p = buildPrompt(
      { age: 4, where: 'parc', maxMinutes: 15, skill: 'numere', theme: 'marina' },
      'avem o minge',
    );
    expect(p).toContain('4 ani');
    expect(p).toContain('În parc');
    expect(p).toContain('15 minute');
    expect(p).toContain('Marina');
    expect(p).toContain('avem o minge');
    expect(p).toContain('3 cm');
    expect(p).toContain('Disney');
  });

  it('the photo prompt asks to ignore people', () => {
    expect(buildPrompt({ age: 5 }, '', true)).toContain('Ignoră persoanele');
  });

  it('the schema requires activities with a safety note', () => {
    expect(ACTIVITY_SCHEMA.properties.activities.items.required).toContain('safety');
  });

  it('parses a good answer, fixes cedilla diacritics and drops malformed items', () => {
    const json = JSON.stringify({
      objects: ['minge', 'pahare'],
      activities: [
        {
          title: 'Bowling cu pahare',
          minutes: 15,
          energy: 'activ',
          skills: ['numere', 'nonsens'],
          materials: ['pahare'],
          play: ['Aşezaţi paharele'],
          goal: 'numărat',
          safety: 'atenţie',
        },
        { title: '', play: [] },
        { title: 'Fără pași' },
      ],
    });
    const r = parseActivities(json, { age: 4, where: 'acasa', source: 'poza' });
    expect(r.objects).toEqual(['minge', 'pahare']);
    expect(r.activities).toHaveLength(1);
    expect(r.activities[0].skills).toEqual(['numere']);
    expect(r.activities[0].play[0]).toBe('Așezați paharele');
    expect(r.activities[0].safety).toBe('atenție');
    expect(r.activities[0].source).toBe('poza');
  });

  it('survives invalid JSON', () => {
    expect(parseActivities('not json', { age: 4, source: 'ai' })).toEqual({ objects: [], activities: [] });
  });

  it('fixDiacritics maps cedilla to comma-below', () => {
    expect(fixDiacritics('şţŞŢ')).toBe('șțȘȚ');
  });
});
