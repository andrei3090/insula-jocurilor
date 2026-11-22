import { AnimatePresence } from 'motion/react';
import {
  type ComponentType,
  type LazyExoticComponent,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { EmojiName } from '../art/Emoji';
import { ISLANDS } from '../art/guides';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { freshSkill } from '../core/adaptive';
import { useProfile } from '../core/profile';
import { useProgress } from '../core/progress';
import { useSession } from '../core/session';
import type { GameManifest, GameProps, HintLadder, HintRung, ItemResult, TestHooks } from '../core/types';
import { Beads } from '../ui/Beads';
import { BigButton } from '../ui/BigButton';
import { RoundEnd, StarBurst } from '../ui/Celebration';
import { HouseIcon, SpeakerIcon } from '../ui/icons';
import type { LineId } from '../voice/lines';
import { BreakScreen } from './BreakScreen';

const PRAISE: LineId[] = ['praise.1', 'praise.2', 'praise.3', 'praise.4', 'praise.5', 'praise.6'];
const DEDUPE_MS = 400;

const lazyCache = new Map<string, LazyExoticComponent<ComponentType<GameProps>>>();
const lazyFor = (m: GameManifest) => {
  let C = lazyCache.get(m.id);
  if (!C) {
    C = lazy(m.load);
    lazyCache.set(m.id, C);
  }
  return C;
};

declare global {
  interface Window {
    __test?: TestHooks;
  }
}

export function GameHost({ manifest, onExit }: { manifest: GameManifest; onExit(): void }) {
  const profile = useProfile((s) => s.active());
  const limitMin = useProfile((s) => s.sessionLimitMin);
  const record = useProgress((s) => s.record);
  const award = useProgress((s) => s.award);
  const startStep = manifest.startStep?.(profile.age) ?? 0;
  const stored = useProgress((s) => s.levels[profile.id]?.[manifest.id]);
  const lvl = stored ?? freshSkill(startStep);
  const step = Math.min(lvl.step, manifest.skills.length - 1);
  const level = useMemo(
    () => ({ skill: manifest.skills[step], step, age: profile.age }),
    [manifest, step, profile.age],
  );

  const scored = manifest.scored !== false;
  const roundSize = manifest.roundSize ?? 6;
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(0);
  const [burst, setBurst] = useState(0);
  const [ended, setEnded] = useState<{ sticker: EmojiName | null } | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [rung, setRung] = useState<HintRung>(0);
  const rungRef = useRef<HintRung>(0);
  const doneRef = useRef(0);
  const lock = useRef({ last: 0, ended: false });
  const hooks = useRef<TestHooks | null>(null);

  const Game = lazyFor(manifest);
  const C = ISLANDS[manifest.island];

  const hints: HintLadder = useMemo(
    () => ({
      rung,
      next: () => {
        const n = Math.min(4, rungRef.current + 1) as HintRung;
        rungRef.current = n;
        setRung(n);
        sfx.boop();
        if (n === 1) void voice.say('hint.again').then(() => voice.repeat());
        else if (n === 2) void voice.say('hint.help');
        else if (n === 3) void voice.say('hint.watch');
      },
      reset: () => {
        rungRef.current = 0;
        setRung(0);
      },
    }),
    [rung],
  );

  const endRound = useCallback(() => {
    const sticker = scored ? (award(profile.id) as EmojiName | null) : null;
    sfx.party();
    void voice.say(sticker ? 'round.done' : 'round.full');
    if (useSession.getState().isOver(limitMin)) setOnBreak(true);
    setEnded({ sticker });
  }, [award, profile.id, scored, limitMin]);

  const onItem = useCallback(
    async (r: ItemResult) => {
      const now = Date.now();
      if (lock.current.ended || now - lock.current.last < DEDUPE_MS) return;
      lock.current.last = now;
      const result = { ...r, hintsUsed: Math.max(r.hintsUsed, rungRef.current) };
      record(profile.id, manifest.id, result, manifest.skills.length - 1, manifest.promoteAfter);
      rungRef.current = 0;
      setRung(0);
      sfx.success();
      setBurst((b) => b + 1);
      if (!scored) return;
      doneRef.current += 1;
      setDone(doneRef.current);
      if (doneRef.current >= roundSize) {
        lock.current.ended = true;
        await new Promise((res) => setTimeout(res, 700));
        endRound();
        return;
      }
      await Promise.race([
        voice.say(PRAISE[Math.floor(Math.random() * PRAISE.length)]),
        new Promise((res) => setTimeout(res, 1600)),
      ]);
    },
    [record, profile.id, manifest, scored, roundSize, endRound],
  );

  const again = () => {
    doneRef.current = 0;
    lock.current = { last: 0, ended: false };
    rungRef.current = 0;
    setRung(0);
    setDone(0);
    setEnded(null);
    setRound((n) => n + 1);
  };

  // test hooks (dev and test builds only)
  useEffect(() => {
    if (import.meta.env.MODE === 'production') return;
    window.__test = { solve: () => hooks.current?.solve(), fail: () => hooks.current?.fail() };
    return () => {
      window.__test = undefined;
    };
  }, []);

  useEffect(() => {
    void voice.say(manifest.titleVoice);
    return () => voice.stop();
  }, [manifest.titleVoice]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${C.sky} 0%, #fffaf2 100%)` }}
      data-testid={`game-${manifest.id}`}
    >
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-5">
        <BigButton label="Acasă" tone="sun" size={88} round onPress={onExit} testId="home">
          <HouseIcon size={50} />
        </BigButton>
        {scored ? <Beads total={roundSize} done={done} /> : <span />}
        <BigButton
          label="Ascultă din nou"
          tone="white"
          size={88}
          round
          onPress={() => void voice.repeat()}
          testId="repeat"
        >
          <SpeakerIcon size={50} />
        </BigButton>
      </header>
      <main className="absolute inset-x-0 bottom-0 top-[116px]">
        <Suspense fallback={<div className="grid h-full place-items-center text-3xl">…</div>}>
          <Game
            key={round}
            level={level}
            onItem={onItem}
            onRoundEnd={endRound}
            voice={voice}
            hints={hints}
            registerTest={(h) => {
              hooks.current = h;
            }}
            profileId={profile.id}
          />
        </Suspense>
      </main>
      {burst > 0 && <StarBurst key={burst} />}
      <AnimatePresence>
        {ended && !onBreak && (
          <RoundEnd sticker={ended.sticker} guide={C.guide} onAgain={again} onHome={onExit} />
        )}
      </AnimatePresence>
      {onBreak && (
        <BreakScreen
          onParentDismiss={() => {
            setOnBreak(false);
          }}
        />
      )}
    </div>
  );
}
