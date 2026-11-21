import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STICKERS } from './stickers';

describe('progress store', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('hydrates defaults when storage is empty', async () => {
    const { useProgress } = await import('./progress');
    await useProgress.persist.rehydrate();
    expect(useProgress.getState().levelOf('p1', 'panda').step).toBe(0);
    expect(useProgress.getState().stickersOf('p1')).toEqual([]);
  });

  it('hydrates defaults when storage throws', async () => {
    vi.doMock('idb-keyval', () => ({
      get: () => Promise.reject(new Error('evicted')),
      set: () => Promise.reject(new Error('evicted')),
      del: () => Promise.reject(new Error('evicted')),
    }));
    const { useProgress } = await import('./progress');
    await useProgress.persist.rehydrate();
    expect(useProgress.getState().levelOf('p1', 'panda').step).toBe(0);
    vi.doUnmock('idb-keyval');
  });

  it('record moves the level and the per-skill stats', async () => {
    const { useProgress } = await import('./progress');
    const s = useProgress.getState();
    s.record('p1', 'panda', { skill: 'count.5', correct: true, hintsUsed: 0, ms: 900 }, 4);
    s.record('p1', 'panda', { skill: 'count.5', correct: true, hintsUsed: 0, ms: 900 }, 4);
    const st = useProgress.getState();
    expect(st.levelOf('p1', 'panda').step).toBe(1);
    expect(st.stats.p1['count.5']).toMatchObject({ ok: 2, total: 2 });
  });

  it('award gives a new sticker each time and null when the album is full', async () => {
    const { useProgress } = await import('./progress');
    const got = new Set<string>();
    for (let i = 0; i < STICKERS.length; i++) {
      const s = useProgress.getState().award('p1');
      expect(s).not.toBeNull();
      got.add(s!);
    }
    expect(got.size).toBe(24);
    expect(useProgress.getState().award('p1')).toBeNull();
  });
});
