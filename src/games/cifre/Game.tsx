import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Emoji, type EmojiName } from '../../art/Emoji';
import { sfx } from '../../audio/sfx';
import { pick, randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { useT } from '../../i18n/ui';
import { Balloon } from '../../ui/Balloon';
import { GlyphCard } from '../../ui/GlyphCard';
import { numberLine } from '../../voice/numbers';
import { type CifreSkill, digitOptions, maxOf, modeOf, pickDigit } from './logic';

const ANIMALS: EmojiName[] = [
  'panda',
  'bear',
  'turtle',
  'dolphin',
  'tropical-fish',
  'butterfly',
  'rabbit-face',
  'duck',
  'koala',
  'penguin',
];

type Phase = 'meet' | 'counting' | 'choose' | 'busy';

export default function CifreGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const t = useT();
  const skill = level.skill as CifreSkill;
  const mode = modeOf(skill);
  const max = (level.spec.max as number | undefined) ?? maxOf(skill);
  const choices = (level.spec.choices as number | undefined) ?? 3;
  const rand = useRef(rng(randomSeed()));
  const [digit, setDigit] = useState(() => pickDigit(skill, rand.current, undefined, max));
  const [animal, setAnimal] = useState<EmojiName>(() => pick(rand.current, ANIMALS));
  const [shown, setShown] = useState(mode === 'count' ? digit : 0);
  const [phase, setPhase] = useState<Phase>(mode === 'count' ? 'choose' : 'meet');
  const [options, setOptions] = useState(() => digitOptions(digit, max, rand.current, choices));
  const [wrong, setWrong] = useState<number | null>(null);
  const [popped, setPopped] = useState<number | null>(null);
  const mistakes = useRef(0);
  const started = useRef(Date.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: speak once per digit
  useEffect(() => {
    if (mode === 'count') void voice.prompt('cifre.howmany');
    else void voice.prompt(['cifre.intro']);
    return () => {
      for (const t of timers.current) clearTimeout(t);
    };
  }, [digit]);

  const tapDigit = () => {
    if (phase !== 'meet') {
      void voice.say(numberLine(digit, level.lang), 'now');
      return;
    }
    setPhase('counting');
    sfx.chime();
    if (digit === 0) {
      void voice.say('num.0', 'now');
      timers.current.push(
        setTimeout(() => {
          setPhase('choose');
          void voice.prompt('cifre.catch');
        }, 1400),
      );
      return;
    }
    for (let k = 1; k <= digit; k++) {
      timers.current.push(
        setTimeout(() => {
          setShown(k);
          sfx.pop();
          void voice.say(numberLine(k, level.lang), 'now');
        }, k * 750),
      );
    }
    timers.current.push(
      setTimeout(
        () => {
          setPhase('choose');
          void voice.prompt('cifre.catch');
        },
        digit * 750 + 1200,
      ),
    );
  };

  const next = async () => {
    setPhase('busy');
    await new Promise((r) => setTimeout(r, 500));
    await onItem({
      skill,
      correct: mistakes.current === 0,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
      itemId: `N-${digit}`,
    });
    mistakes.current = 0;
    started.current = Date.now();
    hints.reset();
    const d = pickDigit(skill, rand.current, digit, max);
    setDigit(d);
    setAnimal(pick(rand.current, ANIMALS));
    setShown(mode === 'count' ? d : 0);
    setOptions(digitOptions(d, max, rand.current, choices));
    setPopped(null);
    setPhase(mode === 'count' ? 'choose' : 'meet');
  };

  const choose = (d: number) => {
    if (phase !== 'choose') return;
    if (d === digit) {
      sfx.pop();
      setPopped(d);
      void voice.say(numberLine(d, level.lang), 'now');
      void next();
      return;
    }
    mistakes.current += 1;
    setWrong(d);
    setTimeout(() => setWrong(null), 500);
    hints.next();
  };

  registerTest({
    solve: () => {
      setPhase('choose');
      setTimeout(() => choose(digit), 0);
    },
    fail: () => {
      if (phase === 'meet') setPhase('choose');
      hints.next();
    },
  });

  const errorless = hints.rung >= 4;

  return (
    <div className="relative flex h-full items-center justify-center gap-8 px-6 pb-4 portrait:flex-col">
      <div className="flex flex-col items-center gap-3">
        {mode === 'meet' && (
          <GlyphCard glyph={String(digit)} onPress={tapDigit} testId="glyph" color="#5aa83a" />
        )}
        <div
          className="grid min-h-[130px] max-w-[440px] grid-cols-5 place-items-center gap-1"
          data-testid="animals"
        >
          <AnimatePresence>
            {Array.from({ length: shown }, (_, i) => (
              <motion.div
                key={`${digit}-${i}`}
                initial={{ scale: 0, y: -30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              >
                <Emoji name={animal} size={mode === 'count' ? 78 : 62} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      {phase === 'choose' && (
        <div className="flex gap-4" data-testid="choices">
          {options.map((d, i) => (
            <Balloon
              key={d}
              label={t('cifre.digit', { x: d })}
              color={i + digit}
              onPress={() => choose(d)}
              state={popped === d ? 'popped' : wrong === d ? 'wrong' : 'idle'}
              glow={hints.rung >= 2 && d === digit}
              faded={errorless && d !== digit}
              testId={d === digit ? 'choice-right' : 'choice'}
            >
              {d}
            </Balloon>
          ))}
        </div>
      )}
    </div>
  );
}
