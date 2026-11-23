import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from '../i18n/lang';
import { mirroredStorage } from './storage';

export type Avatar = 'pufi' | 'bruno' | 'cenusareasa' | 'marina' | 'tavi';
export type Profile = { id: string; name: string; age: number; avatar: Avatar; lang?: Lang };

type ProfileState = {
  profiles: Profile[];
  activeId: string;
  pin: string;
  pinChanged: boolean;
  sessionLimitMin: number;
  volume: number;
  voiceOn: boolean;
  active(): Profile;
  update(id: string, patch: Partial<Omit<Profile, 'id'>>): void;
  add(): string;
  remove(id: string): void;
  select(id: string): void;
  setPin(pin: string): void;
  setSettings(patch: Partial<Pick<ProfileState, 'sessionLimitMin' | 'volume' | 'voiceOn'>>): void;
};

const defaultProfile: Profile = { id: 'p1', name: '', age: 4, avatar: 'pufi' };

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [defaultProfile],
      activeId: 'p1',
      pin: '0000',
      pinChanged: false,
      sessionLimitMin: 15,
      volume: 0.9,
      voiceOn: true,
      active: () =>
        get().profiles.find((p) => p.id === get().activeId) ?? get().profiles[0] ?? defaultProfile,
      update: (id, patch) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      add: () => {
        const id = `p${Date.now().toString(36)}`;
        set((s) => ({ profiles: [...s.profiles, { id, name: '', age: 4, avatar: 'bruno' }] }));
        return id;
      },
      remove: (id) =>
        set((s) => {
          const profiles = s.profiles.filter((p) => p.id !== id);
          if (!profiles.length) return s;
          return { profiles, activeId: s.activeId === id ? profiles[0].id : s.activeId };
        }),
      select: (id) => set({ activeId: id }),
      setPin: (pin) => set({ pin, pinChanged: true }),
      setSettings: (patch) => set(patch),
    }),
    {
      name: 'insula.profile.v1',
      storage: mirroredStorage,
      partialize: ({ profiles, activeId, pin, pinChanged, sessionLimitMin, volume, voiceOn }) => ({
        profiles,
        activeId,
        pin,
        pinChanged,
        sessionLimitMin,
        volume,
        voiceOn,
      }),
    },
  ),
);
