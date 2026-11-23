import { deleteDrawing, listDrawings } from './drawings';
import { useProgress } from './progress';

/**
 * Total reset for one child: levels, stars, stickers, statistics, letter boxes and saved drawings.
 * The profile itself (name, age, character, language) stays.
 */
export async function resetChild(profileId: string): Promise<void> {
  useProgress.getState().resetProfile(profileId);
  try {
    for (const d of await listDrawings(profileId)) await deleteDrawing(d.id);
  } catch {
    /* no drawing store: nothing to delete */
  }
}
