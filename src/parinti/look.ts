import type { StoryTopic } from './ai';
import type { IconName } from './icons-data';
import type { Activity, Energy, Skill, Theme, Where } from './types';

export type Look = { icon: IconName; from: string; to: string };

/** Colour and picture per skill: the card tile and the detail banner use the first skill of an activity. */
export const SKILL_LOOK: Record<Skill, Look> = {
  numere: { icon: 'abacus', from: '#ffb86b', to: '#ff7a59' },
  litere: { icon: 'input-latin-uppercase', from: '#8f7bff', to: '#5b3fa3' },
  culori: { icon: 'artist-palette', from: '#ff9ac8', to: '#e5568f' },
  forme: { icon: 'large-orange-diamond', from: '#6fd3ff', to: '#2f8fd8' },
  logica: { icon: 'puzzle-piece', from: '#7fdcb4', to: '#25a07a' },
  motricitate: { icon: 'scissors', from: '#ffd166', to: '#f2a23a' },
  miscare: { icon: 'soccer-ball', from: '#8fd16a', to: '#4a9a2e' },
  creativitate: { icon: 'sparkles', from: '#d29bff', to: '#8b4fd8' },
  limbaj: { icon: 'open-book', from: '#7fd8e8', to: '#2c9fb5' },
  emotii: { icon: 'smiling-face-with-hearts', from: '#ffa8a0', to: '#ef6f6f' },
  natura: { icon: 'seedling', from: '#a8e27a', to: '#3f9b4b' },
};

export const WHERE_ICON: Record<Where, IconName> = {
  acasa: 'house',
  afara: 'deciduous-tree',
  parc: 'playground-slide',
  masina: 'automobile',
  cafenea: 'hot-beverage',
  bunici: 'house-with-garden',
};

export const ENERGY_ICON: Record<Energy, IconName> = {
  calm: 'leaf-fluttering-in-wind',
  activ: 'high-voltage',
};

export const THEME_ICON: Record<Theme, IconName> = {
  pufi: 'panda',
  bruno: 'teddy-bear',
  cenusareasa: 'crown',
  marina: 'canoe',
  tavi: 'water-wave',
};

export const TOPIC_ICON: Record<StoryTopic, IconName> = {
  somn: 'crescent-moon',
  curaj: 'shooting-star',
  prietenie: 'red-heart',
  emotii: 'smiling-face-with-hearts',
  numere: 'abacus',
  litere: 'input-latin-uppercase',
  natura: 'seedling',
};

export const lookOf = (a: Pick<Activity, 'skills'>): Look =>
  SKILL_LOOK[a.skills[0]] ?? SKILL_LOOK.creativitate;

export type Sky = 'dimineata' | 'zi' | 'seara' | 'noapte';

/** Greeting and header sky for the hour of the day. */
export function greeting(hour: number): { hello: string; sky: Sky } {
  if (hour >= 5 && hour < 11) return { hello: 'Bună dimineața!', sky: 'dimineata' };
  if (hour >= 11 && hour < 18) return { hello: 'Bună ziua!', sky: 'zi' };
  if (hour >= 18 && hour < 22) return { hello: 'Bună seara!', sky: 'seara' };
  return { hello: 'Noapte bună!', sky: 'noapte' };
}

export const SKY: Record<Sky, { from: string; to: string; dark: boolean }> = {
  dimineata: { from: '#ffd9b8', to: '#bfe8ff', dark: false },
  zi: { from: '#9fdcff', to: '#e3f5ff', dark: false },
  seara: { from: '#ff9f8a', to: '#9b7fd6', dark: true },
  noapte: { from: '#1f1846', to: '#4b3a7a', dark: true },
};

/** Days since 1 Jan 1970 in local time: the "idea of the day" stays the same all day. */
export const dayNumber = (d: Date) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000);

export function ideaOfDay<T>(list: readonly T[], d: Date): T | undefined {
  if (!list.length) return undefined;
  return list[dayNumber(d) % list.length];
}

/** Monday = 0 … Sunday = 6 (the plan's order). */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;
