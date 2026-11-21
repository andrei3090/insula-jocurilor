import { LayoutGroup, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bamboo, Basket } from '../../art/Bamboo';
import { Pufi } from '../../art/Pufi';
import type { Mood } from '../../art/parts';
import { sfx } from '../../audio/sfx';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { BigButton } from '../../ui/BigButton';
import { DemoHand } from '../../ui/DemoHand';
import { CheckIcon } from '../../ui/icons';
import type { LineId } from '../../voice/lines';
import { numberLine } from '../../voice/numbers';
import { check, makeItem, need, type PandaItem, type PandaSkill } from './logic';

type Phase = 'place' | 'ask' | 'busy';

function promptFor(it: PandaItem): LineId[] {
  if (it.mode === 'count') return [`panda.give.${it.target}` as LineId];
  if (it.mode === 'digit') return ['panda.digit'];
  return [`panda.has.${it.a}` as LineId, `panda.more.${it.b}` as LineId];
}

export default function PandaGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const rand = useRef(rng(randomSeed()));
  const [item, setItem] = useState<PandaItem>(() => makeItem(level.skill as PandaSkill, rand.current));
  const [placed, setPlaced] = useState<number[]>([]); // ids of loose sticks in the basket
  const [phase, setPhase] = useState<Phase>('place');
  const [mood, setMood] = useState<Mood>('wave');
  const [wrongChoice, setWrongChoice] = useState<number[]>([]);
  const mistakes = useRef(0);
  const started = useRef(Date.now());
  const area = useRef<HTMLDivElement>(null);
  const basketRef = useRef<HTMLDivElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(
    null,
  );

  const n = need(item);
  const errorless = hints.rung >= 4;
  const ghost = hints.rung >= 2 ? n : 0;

  const start = useCallback(
    (it: PandaItem) => {
      setItem(it);
      setPlaced([]);
      setPhase('place');
      setWrongChoice([]);
      setDemo(null);
      setMood('idle');
      mistakes.current = 0;
      started.current = Date.now();
      hints.reset();
      void voice.prompt(promptFor(it));
    },
    [hints, voice],
  );

  // first item
  // biome-ignore lint/correctness/useExhaustiveDependencies: once
  useEffect(() => {
    void voice.prompt(promptFor(item));
  }, []);

  // errorless rung: give back extra sticks
  useEffect(() => {
    if (errorless && placed.length > n) setPlaced((p) => p.slice(0, n));
  }, [errorless, placed.length, n]);

  // demo rung: show the hand moving a stick to the basket
  useEffect(() => {
    if (hints.rung !== 3 || !area.current || !basketRef.current || !pileRef.current) return;
    const a = area.current.getBoundingClientRect();
    const firstFree = pileRef.current.querySelector('[data-free="1"]') as HTMLElement | null;
    const src = (firstFree ?? pileRef.current).getBoundingClientRect();
    const dst = basketRef.current.getBoundingClientRect();
    setDemo({
      from: { x: src.left - a.left + src.width / 2, y: src.top - a.top + src.height / 2 },
      to: { x: dst.left - a.left + dst.width / 2, y: dst.top - a.top + dst.height / 3 },
    });
  }, [hints.rung]);

  const put = (id: number) => {
    if (phase !== 'place' || placed.includes(id)) return;
    if (errorless && placed.length >= n) return;
    const next = [...placed, id];
    setPlaced(next);
    sfx.pop();
    void voice.say(numberLine(item.a + next.length));
  };

  const takeBack = (id: number) => {
    if (phase !== 'place') return;
    setPlaced((p) => p.filter((x) => x !== id));
    sfx.swish();
  };

  const finish = useCallback(async () => {
    setPhase('busy');
    setMood('happy');
    await voice.say('panda.yum');
    await onItem({
      skill: level.skill,
      correct: mistakes.current === 0,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
      itemId: `${item.mode}-${item.target}`,
    });
    start(makeItem(level.skill as PandaSkill, rand.current, item.target));
  }, [voice, onItem, level.skill, hints.rung, item, start]);

  const done = (count = placed.length) => {
    if (phase !== 'place') return;
    const res = check(item, count);
    if (res === 'ok') {
      if (item.mode === 'add') {
        setPhase('ask');
        setMood('think');
        void voice.prompt('panda.howmany');
      } else void finish();
      return;
    }
    mistakes.current += 1;
    setMood('think');
    hints.next();
  };

  const choose = (c: number) => {
    if (phase !== 'ask') return;
    if (c === item.target) {
      void finish();
      return;
    }
    mistakes.current += 1;
    setWrongChoice((w) => [...w, c]);
    hints.next();
  };

  registerTest({
    solve: () => void finish(),
    fail: () => (phase === 'ask' ? choose(item.choices!.find((c) => c !== item.target)!) : done(n + 1)),
  });

  const pile = Array.from({ length: item.offered }, (_, i) => i);
  const free = pile.filter((i) => !placed.includes(i));

  return (
    <div
      ref={area}
      className="relative flex h-full items-center justify-center gap-10 px-8 pb-6 portrait:flex-col portrait:gap-4"
    >
      <LayoutGroup>
        {/* Pufi, the number and the basket */}
        <div className="flex flex-col items-center">
          <motion.div
            key={`${item.mode}-${item.target}-${item.a}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative mb-1 flex min-h-[84px] items-center gap-3 rounded-[2rem] border-4 border-ink/80 bg-white px-6 py-2"
            data-testid="panda-target"
          >
            <span className="font-school text-6xl font-bold">
              {item.mode === 'add' ? `${item.a} + ${item.b}` : item.target}
            </span>
            {item.mode === 'count' && (
              <span className="grid grid-cols-5 gap-1">
                {Array.from({ length: item.target }, (_, i) => (
                  <span key={i} className="size-4 rounded-full bg-bamboo-deep" />
                ))}
              </span>
            )}
            <span className="absolute -bottom-4 left-10 size-6 rotate-45 border-r-4 border-b-4 border-ink/80 bg-white" />
          </motion.div>
          <Pufi size={190} mood={mood} />
          <div ref={basketRef} className="relative -mt-6 flex flex-col items-center" data-testid="basket">
            <div className="flex min-h-[96px] items-end justify-center -space-x-3">
              {Array.from({ length: item.a }, (_, i) => (
                <div key={`a${i}`} className="opacity-60">
                  <Bamboo height={92} />
                </div>
              ))}
              {placed.map((id) => (
                <motion.button
                  key={id}
                  layoutId={`stick-${id}`}
                  type="button"
                  aria-label="Scoate bățul din coș"
                  onClick={() => takeBack(id)}
                  className="relative"
                >
                  <Bamboo height={92} />
                </motion.button>
              ))}
              {Array.from({ length: Math.max(0, ghost - placed.length) }, (_, i) => (
                <div
                  key={`g${i}`}
                  className="h-[92px] w-[30px] rounded-xl border-4 border-dashed border-bamboo-deep/70"
                />
              ))}
            </div>
            <Basket width={250} />
          </div>
        </div>

        {/* the loose sticks, or the "how many?" choices */}
        <div className="flex flex-col items-center gap-6">
          {phase === 'ask' ? (
            <div className="flex gap-6" data-testid="choices">
              {item
                .choices!.filter((c) => !(errorless && c !== item.target))
                .map((c) => (
                  <BigButton
                    key={c}
                    label={`${c}`}
                    size={120}
                    tone={hints.rung >= 2 && c === item.target ? 'sun' : 'white'}
                    disabled={wrongChoice.includes(c)}
                    onPress={() => choose(c)}
                  >
                    <span className="font-school text-6xl font-bold">{c}</span>
                  </BigButton>
                ))}
            </div>
          ) : (
            <div ref={pileRef} className="grid grid-cols-5 gap-2 portrait:grid-cols-6" data-testid="pile">
              {pile.map((id) => {
                const isFree = free.includes(id);
                const blocked = errorless && placed.length >= n;
                return (
                  <div
                    key={id}
                    className="grid h-[136px] w-[104px] place-items-center"
                    data-free={isFree ? 1 : 0}
                  >
                    {isFree && (
                      <motion.button
                        layoutId={`stick-${id}`}
                        type="button"
                        aria-label="Băț de bambus"
                        data-testid="stick"
                        disabled={blocked || phase !== 'place'}
                        onClick={() => put(id)}
                        drag
                        dragSnapToOrigin
                        dragElastic={0.4}
                        whileDrag={{ scale: 1.15, zIndex: 50 }}
                        onDragEnd={(_, info) => {
                          const b = basketRef.current?.getBoundingClientRect();
                          if (
                            b &&
                            info.point.x > b.left - 40 &&
                            info.point.x < b.right + 40 &&
                            info.point.y > b.top - 60 &&
                            info.point.y < b.bottom + 20
                          )
                            put(id);
                        }}
                        className={`grid h-full w-full place-items-center ${blocked ? 'opacity-30' : ''}`}
                      >
                        <Bamboo height={120} />
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {phase === 'place' && (
            <BigButton label="Gata" tone="bamboo" size={120} round onPress={() => done()} testId="done">
              <CheckIcon size={70} color="#3b2a4a" />
            </BigButton>
          )}
        </div>
      </LayoutGroup>
      {demo && hints.rung === 3 && <DemoHand from={demo.from} to={demo.to} />}
    </div>
  );
}
