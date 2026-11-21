import { createStore, del, get, set } from 'idb-keyval';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type ChildProfile, DEFAULT_MODEL, type Story } from './ai';
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
  profile: ChildProfile;
  /** the latest AI ideas (newest first, max 30) */
  history: Activity[];
  stories: Story[];
  setProfile(p: Partial<ChildProfile>): void;
  remember(list: Activity[]): void;
  replace(oldId: string, a: Activity): void;
  setWeek(list: Activity[]): void;
  addStory(s: Story): void;
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
      profile: { nickname: '', interests: ['pandași', 'urși', 'prințese', 'ocean'], learning: [], avoid: '' },
      history: [],
      stories: [],
      setProfile: (p) => setState((s) => ({ profile: { ...s.profile, ...p } })),
      remember: (list) =>
        setState((s) => ({
          history: [...list, ...s.history.filter((h) => !list.some((x) => x.id === h.id))].slice(0, 30),
        })),
      replace: (oldId, a) =>
        setState((s) => ({
          history: [a, ...s.history.filter((h) => h.id !== oldId && h.id !== a.id)].slice(0, 30),
          saved: s.saved[oldId]
            ? { ...Object.fromEntries(Object.entries(s.saved).filter(([k]) => k !== oldId)), [a.id]: a }
            : s.saved,
        })),
      setWeek: (list) =>
        setState((s) => {
          const saved = { ...s.saved };
          const plan: Record<number, string[]> = {};
          list.slice(0, 7).forEach((a, i) => {
            saved[a.id] = a;
            plan[i] = [a.id];
          });
          return { saved, plan };
        }),
      addStory: (st) => setState((s) => ({ stories: [st, ...s.stories].slice(0, 10) })),
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
    {
      name: 'insula.parinti.v1',
      storage,
      version: 2,
      // v1 defaulted to the slow model: move to the fast default
      migrate: (state, version) => {
        const st = state as { model?: string };
        if (version < 2 && st.model === 'gemini-3.8-flash') st.model = DEFAULT_MODEL;
        return st as never;
      },
    },
  ),
);
