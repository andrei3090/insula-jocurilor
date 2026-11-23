import { del, get, set } from 'idb-keyval';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/** IndexedDB storage that never throws: an evicted or blocked store reads as empty. */
const safeIdb: StateStorage = {
  getItem: async (name) => {
    try {
      return (await get<string>(name)) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await set(name, value);
    } catch {
      /* storage unavailable: keep playing in memory */
    }
  },
  removeItem: async (name) => {
    try {
      await del(name);
    } catch {
      /* ignore */
    }
  },
};

export const idbStorage = createJSONStorage(() => safeIdb);

/**
 * IndexedDB first, with a copy of every save in localStorage. If the browser evicts or blocks IndexedDB, the
 * copy brings the child's progress back; the next save writes both again.
 */
const MIRROR = 'insula.mirror.';
export const mirrored: StateStorage = {
  getItem: async (name) => {
    const fromIdb = await safeIdb.getItem(name);
    if (fromIdb) return fromIdb;
    try {
      return localStorage.getItem(MIRROR + name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      localStorage.setItem(MIRROR + name, value);
    } catch {
      /* quota or private mode: IndexedDB still has it */
    }
    await safeIdb.setItem(name, value);
  },
  removeItem: async (name) => {
    try {
      localStorage.removeItem(MIRROR + name);
    } catch {
      /* ignore */
    }
    await safeIdb.removeItem(name);
  },
};
export const mirroredStorage = createJSONStorage(() => mirrored);

export async function askPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted()))
      await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}
