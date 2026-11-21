import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Emoji } from '../../art/Emoji';
import { GUIDES } from '../../art/guides';
import { sfx } from '../../audio/sfx';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import {
  close,
  type Face,
  flip,
  GRID,
  initial,
  type MemCard,
  type MemSkill,
  makeDeck,
  solved,
} from './logic';

function FaceView({ face, size }: { face: Face; size: number }) {
  if (face.kind === 'guide') {
    const G = GUIDES[face.id];
    return <G size={size * 0.9} />;
  }
  if (face.kind === 'emoji') return <Emoji name={face.name} size={size * 0.7} />;
  if (face.kind === 'digit')
    return (
      <span className="font-school font-bold leading-none" style={{ fontSize: size * 0.6 }}>
        {face.n}
      </span>
    );
  return (
    <div className="grid grid-cols-3 place-items-center gap-0.5">
      {Array.from({ length: face.n }, (_, i) => (
        <Emoji key={i} name={face.name} size={size * 0.24} />
      ))}
    </div>
  );
}

function Back({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size * 0.6} height={size * 0.6} aria-hidden="true">
      <path
        d="M14 70 Q12 52 30 50 Q46 48 56 36 Q64 26 74 30 Q86 34 84 50 L82 72 Q60 80 14 70 Z"
        fill="#d8f3ff"
        stroke="#3b2a4a"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path d="M74 72 L78 88" stroke="#3b2a4a" strokeWidth={5} strokeLinecap="round" />
      <path d="M30 58 Q44 56 54 46" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      <circle cx={70} cy={40} r={3} fill="#fff" />
    </svg>
  );
}

const PEEK_MS = 1600;

export default function MemorieGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const skill = level.skill as MemSkill;
  const rand = useRef(rng(randomSeed()));
  const [deck, setDeck] = useState<MemCard[]>(() => makeDeck(skill, rand.current));
  const [st, setSt] = useState(initial);
  const [peek, setPeek] = useState(false);
  const started = useRef(Date.now());
  const boardRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(120);
  const [cols, rows] = GRID[skill];
  const pairs = deck.length / 2;
  const isNumbers = deck.some((d) => d.face.kind === 'digit');

  // biome-ignore lint/correctness/useExhaustiveDependencies: prompt once per board
  useEffect(() => {
    void voice.prompt(isNumbers ? 'memorie.count' : 'memorie.intro');
  }, [deck]);

  // size cards to fit the board (never smaller than 104 px)
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      setCell(
        Math.max(
          104,
          Math.min(
            170,
            Math.floor(Math.min((width - (cols - 1) * 14) / cols, (height - (rows - 1) * 14) / rows)),
          ),
        ),
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols, rows]);

  // hint: after many misses, peek at all cards for a moment
  useEffect(() => {
    if (hints.rung === 2 || hints.rung >= 4) {
      setPeek(true);
      const t = setTimeout(() => setPeek(false), PEEK_MS);
      return () => clearTimeout(t);
    }
  }, [hints.rung]);

  const boardDone = async (s: typeof st) => {
    await new Promise((r) => setTimeout(r, 500));
    await onItem({
      skill,
      correct: s.mismatches <= pairs,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
    });
    setDeck(makeDeck(skill, rand.current));
    setSt(initial());
    hints.reset();
    started.current = Date.now();
  };

  const tap = (uid: number) => {
    const [next, ev] = flip(st, uid, deck);
    if (ev === 'ignored') return;
    setSt(next);
    if (ev === 'open1') sfx.tap();
    if (ev === 'match') {
      sfx.chime();
      if (solved(next, deck)) void boardDone(next);
      else void voice.say('memorie.pair');
    }
    if (ev === 'mismatch') {
      sfx.swish();
      setTimeout(() => setSt((s) => close(s)), 900);
      if (next.mismatches > pairs + 1 && (next.mismatches - pairs - 1) % 2 === 0) hints.next();
    }
  };

  registerTest({
    solve: () => {
      const s = { ...initial(), matched: [...new Set(deck.map((d) => d.pair))] };
      setSt(s);
      void boardDone(s);
    },
    fail: () => {
      hints.next();
    },
  });

  return (
    <div className="flex h-full items-center justify-center px-6 pb-6">
      <div ref={boardRef} className="grid h-full w-full max-w-[900px] place-content-center">
        <div
          className="grid gap-[14px]"
          style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)` }}
          data-testid="board"
        >
          {deck.map((c) => {
            const up = peek || st.open.includes(c.uid) || st.matched.includes(c.pair);
            const matched = st.matched.includes(c.pair);
            return (
              <motion.button
                key={c.uid}
                type="button"
                aria-label={up ? 'carte întoarsă' : 'carte'}
                data-testid="card"
                onClick={() => tap(c.uid)}
                style={{ width: cell, height: cell, transformStyle: 'preserve-3d' }}
                animate={{ rotateY: up ? 180 : 0, scale: matched ? 0.94 : 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                whileTap={{ scale: 0.92 }}
                className="relative"
              >
                <span
                  className="absolute inset-0 grid place-items-center rounded-[1.6rem] border-4 border-ink/80 bg-castle shadow-[0_6px_0_rgba(59,42,74,0.3)]"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <Back size={cell} />
                </span>
                <span
                  className={`absolute inset-0 grid place-items-center rounded-[1.6rem] border-4 border-ink/80 shadow-[0_6px_0_rgba(59,42,74,0.3)] ${matched ? 'bg-sun/60' : 'bg-white'}`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <FaceView face={c.face} size={cell} />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
