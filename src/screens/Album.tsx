import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Emoji, type EmojiName } from '../art/Emoji';
import { voice } from '../audio/voice';
import { type Drawing, deleteDrawing, listDrawings } from '../core/drawings';
import { useProfile } from '../core/profile';
import { useProgress } from '../core/progress';
import { useRouter } from '../core/router';
import { STICKERS } from '../core/stickers';
import { BigButton } from '../ui/BigButton';
import { CheckIcon, HouseIcon, TrashIcon } from '../ui/icons';

/** Stable empty list: a selector must not return a new [] each render (React would loop). */
const NONE: string[] = [];

function DrawingCard({ d, onDeleted }: { d: Drawing; onDeleted(): void }) {
  const [url] = useState(() => URL.createObjectURL(d.blob));
  const [confirm, setConfirm] = useState(false);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="relative shrink-0">
      <img
        src={url}
        alt="Desenul meu"
        className="h-44 rounded-2xl border-4 border-ink/70 bg-white object-contain"
      />
      <div className="absolute -right-3 -top-3">
        {confirm ? (
          <BigButton
            label="Da, șterge desenul"
            tone="coral"
            size={72}
            round
            onPress={async () => {
              await deleteDrawing(d.id);
              onDeleted();
            }}
          >
            <CheckIcon size={40} />
          </BigButton>
        ) : (
          <BigButton label="Șterge desenul" tone="white" size={72} round onPress={() => setConfirm(true)}>
            <TrashIcon size={40} />
          </BigButton>
        )}
      </div>
    </div>
  );
}

export function Album() {
  const go = useRouter((s) => s.go);
  const profileId = useProfile((s) => s.activeId);
  const owned = useProgress((s) => s.stickers[profileId] ?? NONE);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const refresh = () => void listDrawings(profileId).then(setDrawings);
  // biome-ignore lint/correctness/useExhaustiveDependencies: load once per profile
  useEffect(() => {
    refresh();
    void voice.say(owned.length ? 'album.title' : 'album.empty');
  }, [profileId]);

  return (
    <div
      className="relative h-full overflow-auto bg-gradient-to-b from-castle/60 to-paper"
      data-testid="album-screen"
    >
      <header className="sticky top-0 z-10 flex items-center gap-4 px-6 pt-5 pb-2">
        <BigButton label="Harta" tone="sun" size={88} round onPress={() => go({ name: 'map' })} testId="home">
          <HouseIcon size={50} />
        </BigButton>
        <h1 className="text-4xl font-semibold">Albumul meu</h1>
        <span className="ml-auto rounded-full bg-white/80 px-4 py-1 text-2xl font-semibold">
          {owned.length} / {STICKERS.length}
        </span>
      </header>
      {drawings.length > 0 && (
        <div className="flex gap-6 overflow-x-auto px-8 pt-2 pb-4">
          {drawings.map((d) => (
            <DrawingCard key={d.id} d={d} onDeleted={refresh} />
          ))}
        </div>
      )}
      <div className="mx-auto grid max-w-5xl grid-cols-6 gap-4 px-6 py-4 portrait:grid-cols-4">
        {STICKERS.map((s, i) => {
          const have = owned.includes(s);
          return (
            <motion.div
              key={s}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`grid aspect-square place-items-center rounded-3xl border-4 ${
                have ? 'border-ink/70 bg-white shadow-md' : 'border-dashed border-ink/25 bg-white/40'
              }`}
            >
              {have ? (
                <Emoji name={s as EmojiName} size={84} label="abțibild" />
              ) : (
                <span className="text-4xl text-ink/20">?</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
