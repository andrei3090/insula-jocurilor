import type { GameManifest, IslandId } from './types';

const modules = import.meta.glob<{ manifest: GameManifest }>('../games/*/manifest.ts', { eager: true });

export const games = (): GameManifest[] =>
  Object.values(modules)
    .map((m) => m.manifest)
    .sort((a, b) => a.ages[0] - b.ages[0] || a.title.localeCompare(b.title, 'ro'));

export const gameById = (id: string) => games().find((g) => g.id === id);

/** Games on an island suitable for the age (a game may be shown one year early). */
export const gamesFor = (island: IslandId, age: number, list: GameManifest[] = games()) =>
  list.filter((g) => g.island === island && age >= g.ages[0] - 1 && age <= g.ages[1]);
