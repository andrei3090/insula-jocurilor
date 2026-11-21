import { describe, expect, it } from 'vitest';
import { deleteDrawing, listDrawings, saveDrawing } from './drawings';

describe('drawings store', () => {
  it('saves, lists per profile (newest first) and deletes', async () => {
    const a = await saveDrawing('p1', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
    await new Promise((r) => setTimeout(r, 5));
    await saveDrawing('p2', new Blob([new Uint8Array([9])], { type: 'image/png' }));
    const mine = await listDrawings('p1');
    expect(mine.map((d) => d.id)).toEqual([a]);
    expect(mine[0].blob.size).toBe(3);
    expect(mine[0].blob.type).toBe('image/png');
    await deleteDrawing(a);
    expect(await listDrawings('p1')).toEqual([]);
  });
});
