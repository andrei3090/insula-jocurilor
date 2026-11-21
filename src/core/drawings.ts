import { createStore, del, entries, set } from 'idb-keyval';

const store = () => createStore('insula-drawings', 'drawings');

export type Drawing = { id: string; profileId: string; at: number; blob: Blob };

export async function saveDrawing(profileId: string, blob: Blob): Promise<string> {
  const at = Date.now();
  const id = `d${at.toString(36)}`;
  await set(id, { id, profileId, at, blob } satisfies Drawing, store());
  return id;
}

export async function listDrawings(profileId: string): Promise<Drawing[]> {
  try {
    const all = await entries<string, Drawing>(store());
    return all
      .map(([, d]) => d)
      .filter((d) => d.profileId === profileId)
      .sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

export const deleteDrawing = (id: string) => del(id, store());
