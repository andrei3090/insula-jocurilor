import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { GUIDES, ISLAND_ORDER, ISLANDS } from '../art/guides';
import { IslandArt } from '../art/islands';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { useRouter } from '../core/router';
import { BigButton } from '../ui/BigButton';
import { BookIcon } from '../ui/icons';
import { LockButton } from '../ui/ParentGate';
import { Waves } from './Waves';

let greeted = false;

export function WorldMap() {
  const go = useRouter((s) => s.go);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (greeted) void voice.say('map.choose');
    greeted = true;
  }, []);
  return (
    <div
      className="relative h-full overflow-hidden bg-gradient-to-b from-[#bfe8ff] via-[#9fdcf0] to-[#62cfd0]"
      data-testid="map"
    >
      <Waves color="#2fb5ad" />
      <div className="relative z-10 mx-auto flex h-full max-w-[1200px] flex-wrap content-center justify-center gap-x-4 gap-y-2 px-6 pb-10">
        {ISLAND_ORDER.map((id, i) => {
          const info = ISLANDS[id];
          const Guide = GUIDES[info.guide];
          return (
            <motion.button
              key={id}
              type="button"
              data-testid={`island-${id}`}
              aria-label={info.name}
              onClick={() => {
                sfx.pop();
                go({ name: 'island', island: id });
              }}
              className="relative flex basis-[31%] flex-col items-center portrait:basis-[46%]"
              initial={reduce ? false : { y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 220, damping: 18 }}
              whileTap={{ scale: 0.92 }}
            >
              <div className="relative">
                <IslandArt id={id} width={250} />
                <div className="absolute -bottom-1 right-0">
                  <Guide size={104} mood="idle" />
                </div>
              </div>
              <span className="-mt-2 rounded-full border-[3px] border-ink/70 bg-white/90 px-4 py-1 text-xl font-semibold">
                {info.name}
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className="absolute bottom-5 left-6 z-20">
        <BigButton
          label="Albumul meu"
          tone="castle"
          size={96}
          round
          onPress={() => go({ name: 'album' })}
          testId="album"
        >
          <BookIcon size={56} />
        </BigButton>
      </div>
      <div className="absolute right-6 bottom-6 z-20">
        <LockButton onUnlock={() => go({ name: 'parent' })} />
      </div>
    </div>
  );
}
