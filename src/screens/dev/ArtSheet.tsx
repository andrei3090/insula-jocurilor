import { GUIDES, ISLAND_ORDER, ISLANDS } from '../../art/guides';
import { IslandArt } from '../../art/islands';
import type { Mood } from '../../art/parts';

const MOODS: Mood[] = ['idle', 'happy', 'wave', 'think'];

/** Dev-only sheet to review the characters (route #art). */
export function ArtSheet() {
  return (
    <div className="h-full overflow-auto bg-paper p-6">
      <h1 className="mb-4 text-3xl font-semibold">Personajele insulei</h1>
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(GUIDES).map(([id, G]) => (
          <div key={id} className="rounded-3xl bg-white p-3 text-center shadow">
            <G size={170} mood="idle" />
            <div className="mt-1 text-lg font-medium">{id}</div>
            <div className="mt-2 flex justify-center gap-1">
              {MOODS.slice(1).map((m) => (
                <G key={m} size={52} mood={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-5 gap-4">
        {ISLAND_ORDER.map((id) => (
          <div key={id} className="rounded-3xl p-2 text-center" style={{ background: ISLANDS[id].sky }}>
            <IslandArt id={id} width={180} />
            <div className="text-base">{ISLANDS[id].name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
