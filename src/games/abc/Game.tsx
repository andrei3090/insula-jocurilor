import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Emoji } from '../../art/Emoji';
import { Marina } from '../../art/Marina';
import type { Mood } from '../../art/parts';
import { sfx } from '../../audio/sfx';
import { useProgress } from '../../core/progress';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { Balloon } from '../../ui/Balloon';
import { GlyphCard } from '../../ui/GlyphCard';
import type { LineId } from '../../voice/lines';
import { LETTERS, type LetterItem, sayLetter } from './data';
import { type AbcSkill, catchOptions, pickLetter, soundable, soundOptions } from './logic';

const boxesOf = (profileId: string) =>
  Object.fromEntries(
    useProgress
      .getState()
      .cardsOf(profileId)
      .map((c) => [c.id, c.box] as [string, number]),
  );

type Phase = 'meet' | 'choose' | 'busy';

export default function AbcGame({ level, onItem, voice, hints, registerTest, profileId }: GameProps) {
  const skill = level.skill as AbcSkill;
  const pool = skill === 'abc.sound' ? LETTERS.filter(soundable) : LETTERS;
  const rand = useRef(rng(randomSeed()));
  const [letter, setLetter] = useState<LetterItem>(() =>
    pickLetter(boxesOf(profileId), rand.current, undefined, pool),
  );
  const [phase, setPhase] = useState<Phase>(skill === 'abc.sound' ? 'choose' : 'meet');
  const [options, setOptions] = useState<LetterItem[]>(() =>
    skill === 'abc.sound' ? soundOptions(letter, rand.current) : catchOptions(letter, rand.current),
  );
  const [wrong, setWrong] = useState<string | null>(null);
  const [popped, setPopped] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>('wave');
  const mistakes = useRef(0);
  const started = useRef(Date.now());

  // biome-ignore lint/correctness/useExhaustiveDependencies: speak once per letter
  useEffect(() => {
    if (skill === 'abc.sound') void voice.prompt([`letter.${letter.id}` as LineId, 'abc.which']);
    else void voice.prompt(sayLetter(letter));
  }, [letter]);

  const next = async () => {
    setPhase('busy');
    setMood('happy');
    await new Promise((r) => setTimeout(r, 500));
    await onItem({
      skill,
      correct: mistakes.current === 0,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
      itemId: `L-${letter.id}`,
    });
    mistakes.current = 0;
    started.current = Date.now();
    hints.reset();
    const l = pickLetter(boxesOf(profileId), rand.current, letter.id, pool);
    setLetter(l);
    setOptions(skill === 'abc.sound' ? soundOptions(l, rand.current) : catchOptions(l, rand.current));
    setPopped(null);
    setMood('idle');
    setPhase(skill === 'abc.sound' ? 'choose' : 'meet');
  };

  const tapCard = () => {
    sfx.chime();
    void voice.prompt(sayLetter(letter));
    if (phase === 'meet') {
      setTimeout(() => {
        setPhase('choose');
        void voice.prompt('abc.catch');
      }, 1600);
    }
  };

  const choose = (o: LetterItem) => {
    if (phase !== 'choose') return;
    if (o.id === letter.id) {
      sfx.pop();
      setPopped(o.id);
      if (skill === 'abc.sound') void voice.say(sayLetter(letter));
      void next();
      return;
    }
    mistakes.current += 1;
    setWrong(o.id);
    setTimeout(() => setWrong(null), 500);
    hints.next();
  };

  registerTest({
    solve: () => {
      setPhase('choose');
      setTimeout(() => choose(letter), 0);
    },
    fail: () => {
      if (phase === 'meet') setPhase('choose');
      hints.next();
    },
  });

  const errorless = hints.rung >= 4;

  return (
    <div className="relative flex h-full items-center justify-center gap-10 px-6 pb-4 portrait:flex-col portrait:gap-6">
      <div className="absolute bottom-2 left-3 portrait:hidden">
        <Marina size={160} mood={mood} />
      </div>

      {skill === 'abc.sound' ? (
        <GlyphCard
          glyph={letter.glyph}
          onPress={() => void voice.prompt([`letter.${letter.id}` as LineId, 'abc.which'])}
          testId="glyph"
          color="#7e63b8"
        />
      ) : (
        <GlyphCard glyph={letter.glyph} onPress={tapCard} testId="glyph" color="#4cc9c0">
          {letter.emoji && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="mt-1 flex items-center gap-2"
            >
              <Emoji name={letter.emoji} size={64} />
              {letter.word && (
                <span className="font-school text-3xl font-bold text-white drop-shadow">{letter.word}</span>
              )}
            </motion.span>
          )}
        </GlyphCard>
      )}

      {phase !== 'meet' && (
        <div className="flex gap-4" data-testid="choices">
          {options.map((o, i) =>
            skill === 'abc.sound' ? (
              <motion.button
                key={o.id}
                type="button"
                aria-label={o.word}
                data-testid={o.id === letter.id ? 'choice-right' : 'choice'}
                onClick={() => choose(o)}
                initial={{ scale: 0 }}
                animate={
                  wrong === o.id ? { rotate: [0, -8, 8, 0], scale: 1 } : { scale: popped === o.id ? 1.15 : 1 }
                }
                disabled={errorless && o.id !== letter.id}
                className={`grid size-[150px] place-items-center rounded-[2rem] border-4 border-ink/70 bg-white shadow-[0_6px_0_rgba(59,42,74,0.3)] ${
                  hints.rung >= 2 && o.id === letter.id ? 'ring-8 ring-sun' : ''
                } ${errorless && o.id !== letter.id ? 'opacity-25' : ''}`}
              >
                <Emoji name={o.emoji!} size={110} />
              </motion.button>
            ) : (
              <Balloon
                key={o.id}
                label={`Litera ${o.glyph}`}
                color={i + LETTERS.indexOf(letter)}
                onPress={() => choose(o)}
                state={popped === o.id ? 'popped' : wrong === o.id ? 'wrong' : 'idle'}
                glow={hints.rung >= 2 && o.id === letter.id}
                faded={errorless && o.id !== letter.id}
                testId={o.id === letter.id ? 'choice-right' : 'choice'}
              >
                {o.glyph}
              </Balloon>
            ),
          )}
        </div>
      )}
    </div>
  );
}
