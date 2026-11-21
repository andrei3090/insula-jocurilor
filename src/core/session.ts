import { create } from 'zustand';

type SessionState = {
  startedAt: number | null;
  /** parent dismissed the break screen: no reminder until this time */
  snoozeUntil: number;
  start(now?: number): void;
  snooze(minutes: number, now?: number): void;
  isOver(limitMin: number, now?: number): boolean;
};

export const useSession = create<SessionState>()((set, get) => ({
  startedAt: null,
  snoozeUntil: 0,
  start: (now = Date.now()) => set({ startedAt: get().startedAt ?? now }),
  snooze: (minutes, now = Date.now()) => set({ snoozeUntil: now + minutes * 60_000 }),
  isOver: (limitMin, now = Date.now()) => {
    const { startedAt, snoozeUntil } = get();
    if (startedAt === null || now < snoozeUntil) return false;
    return now - startedAt >= limitMin * 60_000;
  },
}));
