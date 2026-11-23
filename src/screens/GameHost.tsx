import { AnimatePresence } from 'motion/react';
import {
  type ComponentType,
  type LazyExoticComponent,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { EmojiName } from '../art/Emoji';
import { ISLANDS } from '../art/guides';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { freshSkill } from '../core/adaptive';
import { firstLevelOf, freshLevels, type RoundOutcome, starsFor } from '../core/levels';
import { useProfile } from '../core/profile';
import { useProgress } from '../core/progress';
import { useSession } from '../core/session';
import type { GameManifest, GameProps, HintLadder, HintRung, ItemResult, TestHooks } from '../core/types';
import { useLang, useT } from '../i18n/ui';
import { Beads } from '../ui/Beads';
import { BigButton } from '../ui/BigButton';
import { RoundEnd, StarBurst } from '../ui/Celebration';
import { HouseIcon, SpeakerIcon } from '../ui/icons';
import { LevelBadge, LevelPath } from '../ui/LevelPath';
import type { LineId } from '../voice/lines';
import { numberLine } from '../voice/numbers';
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
  const lang = useLang();
  const t = useT();
  const startStep = manifest.startStep?.(profile.age) ?? 0;
  const stored = useProgress((s) => s.levels[profile.id]?.[manifest.id]);
  const lvl = stored ?? freshSkill(startStep);
  const step = Math.min(lvl.step, manifest.skills.length - 1);
  const specFn = manifest.levelSpec;
  // A child who played before the levels existed (or an older child) starts where her old step was.
  // Fixed once, when the game opens: the old step keeps moving while she plays (bug B21 → B22).
  const [startLevel] = useState(() => (specFn ? firstLevelOf(specFn, manifest.skills[step]) : 1));
  const levels = useProgress((s) => s.lv[profile.id]?.[manifest.id]) ?? freshLevels(startLevel);
  // save the level state at once, so the start never depends on anything that moves later
  useEffect(() => {
    if (specFn && !useProgress.getState().lv[profile.id]?.[manifest.id])
      useProgress.getState().chooseLevel(profile.id, manifest.id, startLevel, startLevel);
  }, [specFn, profile.id, manifest.id, startLevel]);
  // the level is fixed for the whole round; it changes only between rounds
  const [playN, setPlayN] = useState(levels.current);
  const [showPath, setShowPath] = useState(false);
  const level = useMemo(() => {
    const spec = specFn ? specFn(playN) : { skill: manifest.skills[step] };
    const k = manifest.skills.indexOf(spec.skill);
    return { skill: spec.skill, step: k < 0 ? step : k, age: profile.age, n: specFn ? playN : 1, spec, lang };
  }, [manifest, specFn, playN, step, profile.age, lang]);

  const scored = manifest.scored !== false;
  const roundSize = manifest.roundSize ?? 6;
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(0);
  const [burst, setBurst] = useState(0);
  const [ended, setEnded] = useState<{ sticker: EmojiName | null; outcome: RoundOutcome | null } | null>(
    null,
  );
  const [onBreak, setOnBreak] = useState(false);
  const [rung, setRung] = useState<HintRung>(0);
  const rungRef = useRef<HintRung>(0);
  const doneRef = useRef(0);
  const firstTryRef = useRef(0);
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
        // "try again" + the instruction as ONE sentence, after whatever is being said (never cut)
        if (n === 1) void voice.again('hint.again');
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
    const outcome =
      scored && specFn
        ? useProgress
            .getState()
            .finishLevel(profile.id, manifest.id, playN, starsFor(firstTryRef.current, roundSize), startLevel)
        : null;
    sfx.party();
    const said: LineId[] = [sticker ? 'round.done' : 'round.full'];
    if (outcome?.allDone) said.push('level.all');
    else if (outcome?.opened) said.push('level.up');
    else if (outcome && outcome.next === playN) said.push('level.again');
    void voice.say(said);
    if (useSession.getState().isOver(limitMin)) setOnBreak(true);
    setEnded({ sticker, outcome });
  }, [award, profile.id, scored, limitMin, specFn, manifest.id, playN, roundSize, startLevel]);

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
      if (result.correct && result.hintsUsed === 0) firstTryRef.current += 1;
      doneRef.current += 1;
      setDone(doneRef.current);
      if (doneRef.current >= roundSize) {
        lock.current.ended = true;
        await new Promise((res) => setTimeout(res, 700));
        endRound();
        return;
      }
      // the praise is said in full (queued after her counting); the next item waits for it, at most 3 s
      await Promise.race([
        voice.say(PRAISE[Math.floor(Math.random() * PRAISE.length)]),
        new Promise((res) => setTimeout(res, 3000)),
      ]);
    },
    [record, profile.id, manifest, scored, roundSize, endRound],
  );

  const againRef = useRef<(n: number) => void>(() => {});
  /** a new round, at level n (default: the same level) */
  const again = (n: number = playN) => {
    if (specFn) {
      useProgress.getState().chooseLevel(profile.id, manifest.id, n, startLevel);
      setPlayN(n);
    }
    firstTryRef.current = 0;
    doneRef.current = 0;
    lock.current = { last: 0, ended: false };
    rungRef.current = 0;
    setRung(0);
    setDone(0);
    setEnded(null);
    setRound((n) => n + 1);
  };

  againRef.current = (n) => again(n);
  // test hooks (dev and test builds only)
  useEffect(() => {
    if (import.meta.env.MODE === 'production') return;
    window.__test = {
      solve: () => hooks.current?.solve(),
      fail: () => hooks.current?.fail(),
      // jump to level n with every level open (tests only)
      level: (n: number) => {
        useProgress.getState().openLevels(useProfile.getState().activeId, [manifest.id]);
        againRef.current(n);
      },
    };
    return () => {
      window.__test = undefined;
    };
  }, [manifest.id]);

  // a layout effect runs before the game's own effects, so the title is always queued first
  useLayoutEffect(() => {
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
        <div className="flex items-center gap-4">
          <BigButton label={t('home')} tone="sun" size={88} round onPress={onExit} testId="home">
            <HouseIcon size={50} />
          </BigButton>
          {specFn && scored && (
            <LevelBadge
              n={playN}
              onPress={() => {
                void voice.say(['level.word', ...numberLine(playN, lang)], 'now');
                setShowPath(true);
              }}
            />
          )}
        </div>
        {scored ? <Beads total={roundSize} done={done} /> : <span />}
        <BigButton
          label={t('repeat')}
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
          <RoundEnd
            sticker={ended.sticker}
            guide={C.guide}
            stars={ended.outcome?.stars}
            next={ended.outcome && ended.outcome.next !== playN ? ended.outcome.next : undefined}
            onNext={(n) => again(n)}
            onAgain={() => again(playN)}
            onHome={onExit}
          />
        )}
      </AnimatePresence>
      {showPath && specFn && (
        <LevelPath
          state={useProgress.getState().levelsOf(profile.id, manifest.id, startLevel)}
          playing={playN}
          onClose={() => setShowPath(false)}
          onPick={(n) => {
            setShowPath(false);
            again(n);
          }}
        />
      )}
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
