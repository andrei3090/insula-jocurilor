import { motion } from 'motion/react';
import { Bruno } from '../art/Bruno';
import { Marina } from '../art/Marina';
import { Pufi } from '../art/Pufi';
import { unlockAudio } from '../audio/engine';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { useRouter } from '../core/router';
import { useSession } from '../core/session';
import { askPersistentStorage } from '../core/storage';
import { Waves } from './Waves';

/** First screen. The big tap unlocks sound (autoplay rules), then Pufi says hello. */
export function Splash() {
  const go = useRouter((s) => s.go);
  const start = async () => {
    await unlockAudio();
    sfx.chime();
    void askPersistentStorage();
    useSession.getState().start();
    void voice.say('app.hello');
    go({ name: 'map' });
  };
  return (
    <div className="relative grid h-full place-items-center overflow-hidden bg-gradient-to-b from-sky via-[#d8f2ff] to-lagoon">
      <Waves />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.h1
          className="text-center text-6xl font-bold tracking-wide text-ink drop-shadow-[0_3px_0_#fff]"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          Insula Jocurilor
        </motion.h1>
        <div className="flex items-end gap-2">
          <Bruno size={150} mood="idle" />
          <Pufi size={200} mood="wave" />
          <Marina size={150} mood="idle" />
        </div>
        <motion.button
          type="button"
          data-testid="start"
          aria-label="Atinge ca să începem"
          onClick={start}
          className="flex min-h-[120px] min-w-[320px] items-center justify-center gap-4 rounded-full border-4 border-ink/80 bg-sun px-10 text-4xl font-semibold shadow-[0_8px_0_rgba(59,42,74,0.35)]"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }}
          whileTap={{ scale: 0.9 }}
        >
          <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden="true">
            <path
              d="M20 12 L52 32 L20 52 Z"
              fill="#ff8a80"
              stroke="#3b2a4a"
              strokeWidth={4}
              strokeLinejoin="round"
            />
          </svg>
          Hai să ne jucăm!
        </motion.button>
      </div>
    </div>
  );
}
