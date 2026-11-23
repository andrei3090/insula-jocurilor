/** The languages the child app speaks. Romanian is the default; English is chosen per child. */
export type Lang = 'ro' | 'en';
export const LANGS: readonly Lang[] = ['ro', 'en'];
export const isLang = (x: unknown): x is Lang => x === 'ro' || x === 'en';
