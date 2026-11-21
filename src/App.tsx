import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect } from 'react';
import { setVolume } from './audio/engine';
import { setVoiceEnabled } from './audio/voice';
import { useProfile } from './core/profile';
import { gameById } from './core/registry';
import { type Route, useRouter } from './core/router';
import { maybeApplyUpdate } from './core/update';
import { Album } from './screens/Album';
import { ArtSheet } from './screens/dev/ArtSheet';
import { GameHost } from './screens/GameHost';
import { Island } from './screens/Island';
import { ParentHome } from './screens/parent/ParentHome';
import { Splash } from './screens/Splash';
import { WorldMap } from './screens/WorldMap';

function Screen({ route }: { route: Route }) {
  const go = useRouter((s) => s.go);
  switch (route.name) {
    case 'splash':
      return <Splash />;
    case 'map':
      return <WorldMap />;
    case 'island':
      return <Island island={route.island} />;
    case 'game': {
      const m = gameById(route.id);
      if (!m) return <WorldMap />;
      return <GameHost manifest={m} onExit={() => go({ name: 'island', island: route.island })} />;
    }
    case 'album':
      return <Album />;
    case 'parent':
      return <ParentHome />;
    case 'art':
      return <ArtSheet />;
  }
}

const keyOf = (r: Route) =>
  r.name === 'game' ? `game-${r.id}` : r.name === 'island' ? `island-${r.island}` : r.name;

export function App() {
  const route = useRouter((s) => s.route);
  const volume = useProfile((s) => s.volume);
  const voiceOn = useProfile((s) => s.voiceOn);

  useEffect(() => setVolume(volume), [volume]);
  useEffect(() => setVoiceEnabled(voiceOn), [voiceOn]);
  useEffect(() => maybeApplyUpdate(route.name), [route.name]);

  return (
    <MotionConfig reducedMotion="user">
      {/* no initial={false} here: it propagates to every child and silently disables their mount animations (bug B9) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={keyOf(route)}
          className="h-full w-full"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Screen route={route} />
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
