import { createStore, del, get, set } from 'idb-keyval';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_MODEL } from './ai';
import type { Activity } from './types';

const idb = createStore('insula-parinti', 'state');
const storage = createJSONStorage(() => ({
  getItem: async (k: string) => (await get<string>(k, idb).catch(() => null)) ?? null,
  setItem: async (k: string, v: string) => {
    await set(k, v, idb).catch(() => {});
  },
  removeItem: async (k: string) => {
    await del(k, idb).catch(() => {});
  },
}));

export const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'] as const;

type Done = { at: number; rating: 1 | 2 | 3 };

type ParentState = {
  /** Gemini API key: stays on this device only */
  apiKey: string;
  model: string;
  age: number;
  saved: Record<string, Activity>;
  plan: Record<number, string[]>;
  done: Record<string, Done>;
  setKey(k: string): void;
  setModel(m: string): void;
  setAge(a: number): void;
  toggleSave(a: Activity): void;
  addToPlan(day: number, a: Activity): void;
  removeFromPlan(day: number, id: string): void;
  markDone(id: string, rating: Done['rating']): void;
};

export const useParent = create<ParentState>()(
  persist(
    (setState, getState) => ({
      apiKey: '',
      model: DEFAULT_MODEL,
      age: 4,
      saved: {},
      plan: {},
      done: {},
      setKey: (apiKey) => setState({ apiKey: apiKey.trim() }),
      setModel: (model) => setState({ model: model.trim() || DEFAULT_MODEL }),
      setAge: (age) => setState({ age }),
      toggleSave: (a) =>
        setState((s) => {
          const saved = { ...s.saved };
          if (saved[a.id]) delete saved[a.id];
          else saved[a.id] = a;
          return { saved };
        }),
      addToPlan: (day, a) =>
        setState((s) => ({
          saved: { ...s.saved, [a.id]: a },
          plan: { ...s.plan, [day]: [...new Set([...(s.plan[day] ?? []), a.id])] },
        })),
      removeFromPlan: (day, id) =>
        setState((s) => ({ plan: { ...s.plan, [day]: (s.plan[day] ?? []).filter((x) => x !== id) } })),
      markDone: (id, rating) => setState({ done: { ...getState().done, [id]: { at: Date.now(), rating } } }),
    }),
    { name: 'insula.parinti.v1', storage },
  ),
);
