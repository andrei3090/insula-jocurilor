import { motion } from 'motion/react';
import { useEffect } from 'react';
import { ISLANDS } from '../art/guides';
import { IslandArt } from '../art/islands';
import { LiveGuide } from '../art/LiveGuide';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { useProfile } from '../core/profile';
import { gamesFor } from '../core/registry';
import { useRouter } from '../core/router';
import type { IslandId } from '../core/types';
import { BigButton } from '../ui/BigButton';
import { HouseIcon } from '../ui/icons';
import type { LineId } from '../voice/lines';

const SCENE = 470;

export function Island({ island }: { island: IslandId }) {
  const go = useRouter((s) => s.go);
  const age = useProfile((s) => s.active().age);
  const info = ISLANDS[island];
  const list = gamesFor(island, age);

  useEffect(() => {
    void voice.say(list.length ? (`island.${island}` as LineId) : 'island.soon');
  }, [island, list.length]);

  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${info.sky} 0%, #fffaf2 70%)` }}
      data-testid={`island-screen-${island}`}
    >
      <header className="absolute left-6 top-5 z-10 flex items-center gap-4">
        <BigButton label="Harta" tone="sun" size={88} round onPress={() => go({ name: 'map' })} testId="home">
          <HouseIcon size={50} />
        </BigButton>
        <h1 className="text-4xl font-semibold">{info.name}</h1>
      </header>
      <div className="flex h-full items-center gap-6 px-8 pt-24 portrait:flex-col portrait:justify-center">
        {/* the guides stand on their own island; a tap makes them hop, wave or dance and say hello */}
        <div
          className="relative shrink-0 portrait:order-2"
          style={{ width: SCENE }}
          data-testid="island-scene"
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <IslandArt id={island} width={SCENE} />
          </div>
          <div className="relative flex items-end justify-center" style={{ paddingBottom: SCENE * 0.15 }}>
            <LiveGuide who={info.guide} size={230} mood="wave" speak />
            {info.friend && <LiveGuide who={info.friend} size={170} speak />}
          </div>
        </div>
        <div className="flex flex-1 flex-wrap content-center justify-center gap-6">
          {list.map((g, i) => (
            <motion.button
              key={g.id}
              type="button"
              data-testid={`card-${g.id}`}
              aria-label={g.title}
              onClick={() => {
                sfx.pop();
                go({ name: 'game', id: g.id, island });
              }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
              whileTap={{ scale: 0.92 }}
              className="flex h-[210px] w-[200px] flex-col items-center justify-center gap-2 rounded-[2.2rem] border-4 border-ink/80 bg-white shadow-[0_8px_0_rgba(59,42,74,0.3)]"
            >
              <g.icon size={130} />
              <span className="px-2 text-center text-lg font-semibold leading-tight">{g.title}</span>
            </motion.button>
          ))}
          {!list.length && <p className="text-2xl text-ink/60">Aici vin jocuri noi în curând!</p>}
        </div>
      </div>
    </div>
  );
}
