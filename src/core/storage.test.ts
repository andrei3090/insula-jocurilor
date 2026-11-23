import { describe, expect, it, vi } from 'vitest';

describe('saving on the device', () => {
  it('every save is also copied to localStorage, and comes back from there if IndexedDB is empty', async () => {
    vi.resetModules();
    const store = new Map<string, string>();
    vi.doMock('idb-keyval', () => ({
      get: async (k: string) => store.get(k),
      set: async (k: string, v: string) => void store.set(k, v),
      del: async (k: string) => void store.delete(k),
    }));
    const { mirrored } = await import('./storage');
    await mirrored.setItem('insula.progress.v1', '{"state":{"lv":{"p1":{"panda":{"current":7}}}}}');
    expect(localStorage.getItem('insula.mirror.insula.progress.v1')).toContain('"current":7');
    store.clear(); // the browser evicted IndexedDB
    expect(await mirrored.getItem('insula.progress.v1')).toContain('"current":7');
    vi.doUnmock('idb-keyval');
  });
});
