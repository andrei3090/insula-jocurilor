import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { LiveGuide } from '../../art/LiveGuide';
import type { Mood } from '../../art/parts';
import { playNote } from '../../audio/notes';
import { sfx } from '../../audio/sfx';
import { pick, randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { DemoHand } from '../../ui/DemoHand';
import type { LineId } from '../../voice/lines';
import { BAR_COLORS, check, lengthOf, makeSequence, SONGS, type SongId, type XiloSkill } from './logic';

type Phase = 'listen' | 'play' | 'busy';
const STEP_MS = 650;

export default function XilofonGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const skill = level.skill as XiloSkill;
  const song = skill === 'xilo.song';
  const rand = useRef(rng(randomSeed()));
  const [songId, setSongId] = useState<SongId>(() => pick(rand.current, Object.keys(SONGS) as SongId[]));
  const [seq, setSeq] = useState<number[]>(() =>
    song ? [...SONGS[songId]] : makeSequence(lengthOf(skill), rand.current),
  );
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>(song ? 'play' : 'listen');
  const [lit, setLit] = useState<number | null>(null);
  const [mood, setMood] = useState<Mood>('wave');
  const mistakes = useRef(0);
  const started = useRef(Date.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const barsRef = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  posRef.current = pos;

  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  };

  const playSequence = (s: number[]) => {
    clearTimers();
    setPhase('listen');
    s.forEach((b, k) => {
      timers.current.push(
        setTimeout(
          () => {
            setLit(b);
            playNote(b);
          },
          900 + k * STEP_MS,
        ),
      );
      timers.current.push(setTimeout(() => setLit(null), 900 + k * STEP_MS + STEP_MS * 0.7));
    });
    timers.current.push(
      setTimeout(
        () => {
          setPhase('play');
          void voice.say('xilo.your.turn');
        },
        900 + s.length * STEP_MS + 200,
      ),
    );
  };

  // start: speak the instruction, then play (repeat mode) or wait for the first glowing bar (song mode)
  // biome-ignore lint/correctness/useExhaustiveDependencies: per sequence
  useEffect(() => {
    if (song) void voice.prompt([`xilo.song.${songId}` as LineId, 'xilo.follow']);
    else {
      void voice.prompt('xilo.listen');
      playSequence(seq);
    }
    return clearTimers;
  }, [seq]);

  const nextItem = async () => {
    setPhase('busy');
    setMood('happy');
    sfx.success();
    await new Promise((r) => setTimeout(r, 600));
    await onItem({
      skill,
      correct: mistakes.current === 0,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
      itemId: song ? `S-${songId}` : undefined,
    });
    mistakes.current = 0;
    started.current = Date.now();
    hints.reset();
    setPos(0);
    setMood('idle');
    if (song) {
      const id = (Object.keys(SONGS) as SongId[]).find((k) => k !== songId) ?? songId;
      setSongId(id);
      setSeq([...SONGS[id]]);
    } else setSeq(makeSequence(lengthOf(skill), rand.current));
  };

  const tap = (bar: number) => {
    playNote(bar);
    setLit(bar);
    setTimeout(() => setLit((l) => (l === bar ? null : l)), 220);
    if (phase !== 'play') return;
    const p = posRef.current;
    if (song) {
      if (seq[p] !== bar) return; // in song mode other bars just make music
      if (p + 1 >= seq.length) void nextItem();
      else setPos(p + 1);
      return;
    }
    const r = check(seq, p, bar);
    if (r === 'wrong') {
      mistakes.current += 1;
      setPos(0);
      hints.next();
      timers.current.push(setTimeout(() => playSequence(seq), 1200));
      return;
    }
    if (r === 'done') void nextItem();
    else setPos(p + 1);
  };

  registerTest({
    solve: () => {
      setPhase('play');
      void nextItem();
    },
    fail: () => {
      mistakes.current += 1;
      hints.next();
    },
  });

  // which bar to glow: song mode always; repeat mode from hint rung 2
  const guide = phase === 'play' && (song || hints.rung >= 2) ? seq[pos] : null;
  const demo =
    hints.rung === 3 && guide !== null && barsRef.current && area.current
      ? (() => {
          const a = area.current.getBoundingClientRect();
          const b = barsRef.current.children[guide]?.getBoundingClientRect();
          return b ? { x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height / 2 } : null;
        })()
      : null;

  return (
    <div ref={area} className="relative flex h-full flex-col items-center justify-center gap-4 px-6 pb-4">
      <div className="absolute bottom-2 left-3 portrait:hidden">
        <LiveGuide who="bruno" size={150} mood={mood} />
      </div>
      <div className="flex min-h-[40px] items-center gap-2" aria-hidden="true">
        {!song &&
          seq.map((_, k) => (
            <span
              key={k}
              className={`size-5 rounded-full border-2 border-ink/60 ${k < pos ? 'bg-bamboo' : 'bg-white/70'}`}
            />
          ))}
        {song && (
          <span className="text-lg text-ink/60">
            {pos + 1} / {seq.length}
          </span>
        )}
      </div>
      <div ref={barsRef} className="flex items-end gap-2.5 landscape:ml-24" data-testid="bars">
        {BAR_COLORS.map((c, i) => (
          <motion.button
            key={c}
            type="button"
            aria-label={`Bara ${i + 1}`}
            data-testid={`bar-${i}`}
            onPointerDown={(e) => {
              e.preventDefault();
              tap(i);
            }}
            animate={{ y: lit === i ? 10 : 0, scale: guide === i ? [1, 1.06, 1] : 1 }}
            transition={
              guide === i
                ? { duration: 0.9, repeat: Number.POSITIVE_INFINITY }
                : { type: 'spring', stiffness: 600, damping: 20 }
            }
            className="relative rounded-[1.2rem] border-4 border-ink/80 shadow-[0_6px_0_rgba(59,42,74,0.35)]"
            style={{
              background: c,
              width: 78,
              height: 300 - i * 22,
              boxShadow:
                lit === i || guide === i ? `0 0 0 8px ${c}66, 0 6px 0 rgba(59,42,74,0.35)` : undefined,
            }}
          >
            <span className="absolute top-4 left-1/2 size-4 -translate-x-1/2 rounded-full bg-white/80" />
            <span className="absolute bottom-4 left-1/2 size-4 -translate-x-1/2 rounded-full bg-white/80" />
          </motion.button>
        ))}
      </div>
      {demo && <DemoHand from={demo} />}
    </div>
  );
}
