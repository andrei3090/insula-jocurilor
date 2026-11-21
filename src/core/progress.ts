import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { freshSkill, nextStep, type SkillState } from './adaptive';
import { type Card, newCard, review } from './leitner';
import { pick, type Rand } from './rng';
import { STICKERS } from './stickers';
import { idbStorage } from './storage';
import type { ItemResult } from './types';

type Stat = { ok: number; total: number; last: number };

type ProgressState = {
  /** profileId → gameId → staircase */
  levels: Record<string, Record<string, SkillState>>;
  /** profileId → skillId → counters (for the parent view) */
  stats: Record<string, Record<string, Stat>>;
  /** profileId → cardId → Leitner card */
  cards: Record<string, Record<string, Card>>;
  /** profileId → sticker ids, in the order earned */
  stickers: Record<string, string[]>;
  levelOf(profileId: string, gameId: string, startStep?: number): SkillState;
  setLevel(profileId: string, gameId: string, step: number): void;
  record(profileId: string, gameId: string, r: ItemResult, maxStep: number, promoteAfter?: number): void;
  cardsOf(profileId: string): Card[];
  stickersOf(profileId: string): string[];
  award(profileId: string, rand?: Rand): string | null;
  resetProfile(profileId: string): void;
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      levels: {},
      stats: {},
      cards: {},
      stickers: {},
      levelOf: (p, g, startStep = 0) => get().levels[p]?.[g] ?? freshSkill(startStep),
      setLevel: (p, g, step) =>
        set((s) => ({ levels: { ...s.levels, [p]: { ...s.levels[p], [g]: freshSkill(step) } } })),
      record: (p, g, r, maxStep, promoteAfter) =>
        set((s) => {
          const now = Date.now();
          const lvl = nextStep(s.levels[p]?.[g] ?? freshSkill(0), r, maxStep, promoteAfter);
          const st = s.stats[p]?.[r.skill] ?? { ok: 0, total: 0, last: 0 };
          const stat = { ok: st.ok + (r.correct ? 1 : 0), total: st.total + 1, last: now };
          let cards = s.cards;
          if (r.itemId) {
            const c = s.cards[p]?.[r.itemId] ?? newCard(r.itemId, now);
            cards = {
              ...s.cards,
              [p]: { ...s.cards[p], [r.itemId]: review(c, r.correct && r.hintsUsed < 2, now) },
            };
          }
          return {
            levels: { ...s.levels, [p]: { ...s.levels[p], [g]: lvl } },
            stats: { ...s.stats, [p]: { ...s.stats[p], [r.skill]: stat } },
            cards,
          };
        }),
      cardsOf: (p) => Object.values(get().cards[p] ?? {}),
      stickersOf: (p) => get().stickers[p] ?? [],
      award: (p, rand = Math.random) => {
        const owned = new Set(get().stickers[p] ?? []);
        const free = STICKERS.filter((x) => !owned.has(x));
        if (!free.length) return null;
        const s = pick(rand, free);
        set((st) => ({ stickers: { ...st.stickers, [p]: [...(st.stickers[p] ?? []), s] } }));
        return s;
      },
      resetProfile: (p) =>
        set((s) => {
          const drop = <T>(o: Record<string, T>) =>
            Object.fromEntries(Object.entries(o).filter(([k]) => k !== p));
          return {
            levels: drop(s.levels),
            stats: drop(s.stats),
            cards: drop(s.cards),
            stickers: drop(s.stickers),
          };
        }),
    }),
    {
      name: 'insula.progress.v1',
      storage: idbStorage,
      partialize: (s) => ({ levels: s.levels, stats: s.stats, cards: s.cards, stickers: s.stickers }),
    },
  ),
);
