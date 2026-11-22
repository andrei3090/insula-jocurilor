import { describe, expect, it } from 'vitest';
import { ICONS } from './icons-data';
import { LIBRARY } from './library';
import {
  dayNumber,
  ENERGY_ICON,
  greeting,
  ideaOfDay,
  lookOf,
  SKILL_LOOK,
  THEME_ICON,
  TOPIC_ICON,
  WHERE_ICON,
  weekdayIndex,
} from './look';

describe('parent app look', () => {
  it('greets by the hour, with a sky to match', () => {
    expect(greeting(7)).toEqual({ hello: 'Bună dimineața!', sky: 'dimineata' });
    expect(greeting(11).sky).toBe('zi');
    expect(greeting(17).sky).toBe('zi');
    expect(greeting(18).hello).toBe('Bună seara!');
    expect(greeting(22).sky).toBe('noapte');
    expect(greeting(3).sky).toBe('noapte');
    expect(greeting(5).sky).toBe('dimineata');
  });

  it('every icon the app maps to is in the bundled icon set', () => {
    const used = [
      ...Object.values(SKILL_LOOK).map((l) => l.icon),
      ...Object.values(WHERE_ICON),
      ...Object.values(ENERGY_ICON),
      ...Object.values(THEME_ICON),
      ...Object.values(TOPIC_ICON),
    ];
    for (const n of used) expect(ICONS[n], n).toBeTruthy();
  });

  it('every library activity gets a look from its first skill', () => {
    for (const a of LIBRARY) expect(lookOf(a)).toBe(SKILL_LOOK[a.skills[0]]);
  });

  it('the idea of the day stays the same all day and changes the next day', () => {
    const morning = new Date(2026, 10, 22, 6, 0);
    const night = new Date(2026, 10, 22, 23, 30);
    const tomorrow = new Date(2026, 10, 23, 6, 0);
    expect(dayNumber(morning)).toBe(dayNumber(night));
    expect(ideaOfDay(LIBRARY, morning)).toBe(ideaOfDay(LIBRARY, night));
    expect(ideaOfDay(LIBRARY, tomorrow)).not.toBe(ideaOfDay(LIBRARY, morning));
    expect(ideaOfDay([], morning)).toBeUndefined();
  });

  it('weeks start on Monday', () => {
    expect(weekdayIndex(new Date(2026, 10, 23))).toBe(0); // Monday 23.11.2026
    expect(weekdayIndex(new Date(2026, 10, 22))).toBe(6); // Sunday
  });
});
