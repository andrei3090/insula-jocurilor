import { createStore, del, entries, set } from 'idb-keyval';

const store = () => createStore('insula-drawings', 'drawings');

export type Drawing = { id: string; profileId: string; at: number; blob: Blob };
/** Stored as bytes, not as a Blob: WebKit (iPad) is unreliable with Blobs in IndexedDB. */
type Stored = { id: string; profileId: string; at: number; bytes: ArrayBuffer; type: string };

export async function saveDrawing(profileId: string, blob: Blob): Promise<string> {
  const at = Date.now();
  const id = `d${at.toString(36)}`;
  const bytes = await blob.arrayBuffer();
  await set(id, { id, profileId, at, bytes, type: blob.type || 'image/png' } satisfies Stored, store());
  return id;
}

export async function listDrawings(profileId: string): Promise<Drawing[]> {
  try {
    const all = await entries<string, Stored>(store());
    return all
      .map(([, d]) => d)
      .filter((d) => d.profileId === profileId && d.bytes)
      .sort((a, b) => b.at - a.at)
      .map((d) => ({
        id: d.id,
        profileId: d.profileId,
        at: d.at,
        blob: new Blob([d.bytes], { type: d.type }),
      }));
  } catch {
    return [];
  }
}

export const deleteDrawing = (id: string) => del(id, store());
