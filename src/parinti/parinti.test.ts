import { describe, expect, it } from 'vitest';
import * as ai from './ai';
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

describe('parent app: profile, refine, week, story', () => {
  const profile = {
    nickname: 'Rița',
    interests: ['pandași', 'ocean'],
    learning: ['litere' as const],
    avoid: 'zgomot puternic',
  };

  it('the profile travels with every request (nickname, interests, what she learns, what to avoid)', () => {
    const p = ai.buildPrompt({ age: 4 }, '', false, profile);
    for (const bit of ['Rița', 'pandași', 'Litere și sunete', 'zgomot puternic']) expect(p).toContain(bit);
    expect(ai.buildWeekPrompt(4, profile)).toContain('Rița');
    expect(ai.buildStoryPrompt({ age: 4, topic: 'curaj', minutes: 3, profile })).toContain('Rița');
  });

  it('refine asks for exactly one changed activity and keeps the safety rules', () => {
    const a = LIBRARY[0];
    const p = ai.buildRefinePrompt(a, 'fara', 4, profile);
    expect(p).toContain(a.title);
    expect(p).toContain('fără niciun material');
    expect(p).toContain('3 cm');
  });

  it('the week plan asks for 7 activities and the schema allows 7', () => {
    expect(ai.buildWeekPrompt(5)).toContain('exact 7 activități');
    expect(ai.activitySchema(7).properties.activities.maxItems).toBe(7);
    expect(ai.ACTIVITY_SCHEMA.properties.activities.maxItems).toBe(3);
  });

  it('stories: long paragraphs survive, bad answers are rejected, diacritics fixed', () => {
    const long = 'A fost odată un ursuleț panda. '.repeat(20);
    const s = ai.parseStory(
      JSON.stringify({
        title: 'Pufi și luna',
        paragraphs: [long, 'Apoi s-a culcat.', 'Noapte bună!'],
        questions: ['Ce a văzut Pufi?'],
      }),
    );
    expect(s?.paragraphs[0].length).toBeGreaterThan(400);
    expect(s?.questions).toEqual(['Ce a văzut Pufi?']);
    expect(ai.parseStory('{"title":"x","paragraphs":["doar unul"]}')).toBeNull();
    expect(ai.parseStory('nu e json')).toBeNull();
  });

  it('the story prompt has the right length and no scary content', () => {
    const p = ai.buildStoryPrompt({ age: 4, topic: 'somn', minutes: 5, theme: 'pufi' });
    expect(p).toContain('550 de cuvinte');
    expect(p).toContain('fără nimic înfricoșător');
    expect(p).toContain('Pufi');
  });
});
