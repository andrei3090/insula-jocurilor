import { motion } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Emoji } from '../../art/Emoji';
import { sfx } from '../../audio/sfx';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { useT } from '../../i18n/ui';
import { BigButton } from '../../ui/BigButton';
import type { LineId } from '../../voice/lines';
import {
  type Board,
  type Cell,
  DIRS,
  type Dir,
  MAX_PROGRAM,
  makeBoard,
  type NavSkill,
  type NavSpec,
  run,
  shortest,
  suggestion,
} from './logic';

const ARROW_ROT: Record<Dir, number> = { U: -90, R: 0, D: 90, L: 180 };
const LINE: Record<Dir, LineId> = { U: 'nav.up', D: 'nav.down', L: 'nav.left', R: 'nav.right' };
const STEP_MS = 420;

const Arrow = ({ d, size }: { d: Dir; size: number }) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    aria-hidden="true"
    style={{ transform: `rotate(${ARROW_ROT[d]}deg)` }}
  >
    <path
      d="M10 26 H36 V12 L56 32 L36 52 V38 H10 Z"
      fill="#fff"
      stroke="#3b2a4a"
      strokeWidth="4.5"
      strokeLinejoin="round"
    />
  </svg>
);

const Rock = ({ size }: { size: number }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
    <path
      d="M14 78 L24 42 L44 24 L66 30 L84 50 L88 78 Z"
      fill="#9a8fa8"
      stroke="#3b2a4a"
      strokeWidth="5"
      strokeLinejoin="round"
    />
    <path d="M30 46 L44 34 L58 38" fill="none" stroke="#c9c0d4" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

export default function NavigatorGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const t = useT();
  const spec = level.spec as NavSpec;
  const skill = level.skill as NavSkill;
  const rand = useRef(rng(randomSeed()));
  const [board, setBoard] = useState<Board>(() => makeBoard(spec, rand.current));
  const [program, setProgram] = useState<Dir[]>([]);
  const [pos, setPos] = useState<Cell>(board.start);
  const [active, setActive] = useState<number | null>(null);
  const [bump, setBump] = useState(0);
  const [running, setRunning] = useState(false);
  const [area, setArea] = useState({ w: 700, h: 600 });
  const boardArea = useRef<HTMLDivElement>(null);
  const mistakes = useRef(0);
  const started = useRef(Date.now());
  const fast = useRef(false);

  useLayoutEffect(() => {
    const el = boardArea.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setArea({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: one instruction per board
  useEffect(() => {
    void voice.prompt('nav.intro');
  }, [board]);

  const way = useMemo(() => shortest(board) ?? [], [board]);
  const hint = useMemo(() => suggestion(board, program), [board, program]);

  const add = (d: Dir) => {
    if (running || program.length >= MAX_PROGRAM) return;
    sfx.tap();
    void voice.say(LINE[d], 'now');
    setProgram((p) => [...p, d]);
  };
  const remove = (i: number) => {
    if (running) return;
    sfx.swish();
    setProgram((p) => p.filter((_, k) => k !== i));
  };

  const fail = (line: LineId) => {
    mistakes.current += 1;
    void voice.say(line);
    hints.next();
  };

  const go = async (prog: readonly Dir[] = program) => {
    if (running || !prog.length) return;
    setRunning(true);
    void voice.say('nav.go', 'now');
    const o = run(board, prog);
    const ms = fast.current ? 60 : STEP_MS;
    for (let i = 1; i < o.steps.length; i++) {
      setActive(i - 1);
      await new Promise((r) => setTimeout(r, ms));
      setPos(o.steps[i]);
      sfx.pop();
    }
    await new Promise((r) => setTimeout(r, ms));
    setActive(null);
    if (o.kind === 'arrived') {
      sfx.chime();
      void voice.say('nav.arrived');
      await new Promise((r) => setTimeout(r, fast.current ? 300 : 1300));
      await onItem({
        skill,
        correct: mistakes.current === 0,
        hintsUsed: hints.rung,
        ms: Date.now() - started.current,
        itemId: `N-${way.length}`,
      });
      mistakes.current = 0;
      started.current = Date.now();
      hints.reset();
      const nb = makeBoard(spec, rand.current);
      setBoard(nb);
      setPos(nb.start);
      setProgram([]);
      setRunning(false);
      return;
    }
    if (o.kind !== 'short') setBump((n) => n + 1);
    fail(o.kind === 'rock' ? 'nav.rock' : o.kind === 'edge' ? 'nav.edge' : 'nav.short');
    // back to the start after a moment; her arrows stay, to fix
    await new Promise((r) => setTimeout(r, fast.current ? 100 : 1000));
    setPos(board.start);
    setRunning(false);
  };

  registerTest({
    solve: () => {
      fast.current = true;
      setProgram(way);
      void go(way);
    },
    // a wrong try without the animation: the same counting and hint as a real one
    fail: () => fail('nav.edge'),
  });

  const errorless = hints.rung >= 4;
  const cell = Math.floor(
    Math.max(56, Math.min(112, (area.w - 16) / board.cols, (area.h - 16) / board.rows)),
  );
  const at = (c: Cell) => ({ x: c[0] * cell, y: c[1] * cell });
  // the dots follow the same way as the suggested arrow (from where her arrows lead)
  const pathCells = useMemo(() => {
    const cells: Cell[] = [];
    let c = hint.from;
    for (const d of hint.way.slice(0, -1)) {
      c = [c[0] + DIRS[d][0], c[1] + DIRS[d][1]];
      cells.push(c);
    }
    return cells;
  }, [hint]);

  return (
    <div className="flex h-full items-center justify-center gap-6 px-6 pb-5 portrait:flex-col">
      <div
        ref={boardArea}
        className="grid h-full max-h-[620px] min-h-[300px] flex-1 place-items-center portrait:w-full"
      >
        <div
          className="relative overflow-hidden rounded-[1.6rem] border-4 border-ink/70"
          style={{
            width: cell * board.cols,
            height: cell * board.rows,
            backgroundColor: '#5ec8e6',
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.25) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.25) 2px, transparent 2px)',
            backgroundSize: `${cell}px ${cell}px`,
          }}
          data-testid="sea"
          role="img"
          aria-label={t('nav.board')}
        >
          {hints.rung >= 3 &&
            pathCells.map((c) => (
              <span
                key={`p-${c[0]}-${c[1]}`}
                className="absolute rounded-full bg-sun ring-2 ring-ink/40"
                style={{ left: at(c).x + cell / 2 - 9, top: at(c).y + cell / 2 - 9, width: 18, height: 18 }}
                data-testid="path-dot"
              />
            ))}
          {board.rocks.map((c) => (
            <span
              key={`r-${c[0]}-${c[1]}`}
              className="absolute grid place-items-center"
              style={{ left: at(c).x, top: at(c).y, width: cell, height: cell }}
            >
              <Rock size={cell * 0.86} />
            </span>
          ))}
          <span
            className="absolute grid place-items-center"
            style={{ left: at(board.goal).x, top: at(board.goal).y, width: cell, height: cell }}
            data-testid="island-goal"
          >
            <Emoji name="desert-island" size={cell * 0.9} />
          </span>
          <motion.span
            key={`${board.start[0]}-${board.start[1]}-${bump}`}
            className="absolute grid place-items-center"
            style={{ width: cell, height: cell }}
            initial={false}
            animate={{ ...at(pos), rotate: bump ? [0, -10, 10, -6, 0] : 0 }}
            transition={{ duration: fast.current ? 0.05 : 0.32 }}
            data-testid="canoe"
          >
            <Emoji name="canoe" size={cell * 0.88} />
          </motion.span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div
          className="grid grid-cols-5 gap-2 rounded-[1.6rem] border-4 border-ink/30 bg-white/70 p-2"
          data-testid="program"
        >
          {Array.from({ length: MAX_PROGRAM }, (_, i) => {
            const d = program[i];
            const bad = hints.rung >= 2 && hint.badAt === i;
            return d ? (
              <button
                key={`s-${i}-${d}`}
                type="button"
                onClick={() => remove(i)}
                aria-label={t('nav.remove', { x: i + 1 })}
                data-testid="step"
                className={`grid size-[64px] place-items-center rounded-2xl border-4 touch-manipulation ${
                  active === i
                    ? 'border-sun bg-sun'
                    : bad
                      ? 'border-coral bg-coral/80'
                      : 'border-ink/60 bg-lagoon'
                }`}
              >
                <Arrow d={d} size={44} />
              </button>
            ) : (
              <span key={`e-${i}`} className="size-[64px] rounded-2xl border-4 border-dashed border-ink/20" />
            );
          })}
        </div>

        <div className="grid grid-cols-3 grid-rows-3 gap-2" data-testid="pad">
          {(['U', 'L', 'R', 'D'] as Dir[]).map((d) => {
            const place = {
              U: 'col-start-2 row-start-1',
              L: 'col-start-1 row-start-2',
              R: 'col-start-3 row-start-2',
              D: 'col-start-2 row-start-3',
            }[d];
            const right = hint.next === d;
            return (
              <div key={d} className={place}>
                <BigButton
                  label={t(`nav.${d}` as 'nav.U')}
                  tone={hints.rung >= 2 && right ? 'sun' : 'lagoon'}
                  size={104}
                  onPress={() => add(d)}
                  disabled={running || program.length >= MAX_PROGRAM || (errorless && !right)}
                  testId={`arrow-${d}`}
                >
                  <Arrow d={d} size={64} />
                </BigButton>
              </div>
            );
          })}
          <div className="col-start-2 row-start-2 grid place-items-center">
            <BigButton
              label={t('nav.go')}
              tone="bamboo"
              size={104}
              round
              onPress={() => void go()}
              disabled={running || !program.length}
              testId="go"
            >
              <svg viewBox="0 0 64 64" width={56} height={56} aria-hidden="true">
                <path
                  d="M20 12 L52 32 L20 52 Z"
                  fill="#fff"
                  stroke="#3b2a4a"
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
              </svg>
            </BigButton>
          </div>
        </div>
      </div>
    </div>
  );
}
