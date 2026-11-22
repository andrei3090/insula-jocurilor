import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Emoji } from '../../art/Emoji';
import { LiveGuide } from '../../art/LiveGuide';
import type { Mood } from '../../art/parts';
import { sfx } from '../../audio/sfx';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { createArbiter } from '../../input/arbiter';
import { DemoHand } from '../../ui/DemoHand';
import type { LineId } from '../../voice/lines';
import { numberLine } from '../../voice/numbers';
import { type DotsSkill, type DotsState, dotAt, type Picture, pickPicture, reach } from './logic';

const HIT = 0.085; // reach radius, fraction of the board

export default function PuncteGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const skill = level.skill as DotsSkill;
  const rand = useRef(rng(randomSeed()));
  const [pic, setPic] = useState<Picture>(() => pickPicture(skill, rand.current));
  const [st, setSt] = useState<DotsState>({ next: 0, done: false });
  const stRef = useRef(st);
  stRef.current = st;
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [mood, setMood] = useState<Mood>('wave');
  const [shake, setShake] = useState(-1);
  const mistakes = useRef(0);
  const started = useRef(Date.now());
  const board = useRef<SVGSVGElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(480);
  const drawing = useRef(false);
  const arbiter = useMemo(() => createArbiter(), []);
  const n = pic.dots.length;

  // biome-ignore lint/correctness/useExhaustiveDependencies: prompt per picture
  useEffect(() => {
    void voice.prompt('dots.intro');
  }, [pic]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize(Math.floor(Math.min(r.width * 0.7, r.height * 0.97)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const unit = (e: { clientX: number; clientY: number }) => {
    const r = board.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const finish = async () => {
    setMood('happy');
    sfx.fanfare();
    await voice.say(`dots.pic.${pic.id}` as LineId);
    await new Promise((r) => setTimeout(r, 900));
    await onItem({
      skill,
      correct: mistakes.current === 0,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
      itemId: `D-${pic.id}`,
    });
    mistakes.current = 0;
    started.current = Date.now();
    hints.reset();
    setSt({ next: 0, done: false });
    setMood('idle');
    setPic((p) => pickPicture(skill, rand.current, p.id));
  };

  const touchDot = (i: number) => {
    const s = stRef.current;
    if (s.done) return;
    const r = reach(s, i, n);
    if (r.event === 'connect') {
      stRef.current = r.state;
      setSt(r.state);
      sfx.pop();
      void voice.say(numberLine(i + 1));
      if (r.state.done) void finish();
    } else if (r.event === 'wrong') {
      mistakes.current += 1;
      setShake(i);
      setTimeout(() => setShake(-1), 400);
      drawing.current = false;
      setPointer(null);
      hints.next();
    }
  };

  const onDown = (e: React.PointerEvent) => {
    if (!arbiter.accept(e.nativeEvent)) return;
    e.preventDefault();
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic */
    }
    const p = unit(e);
    const i = dotAt(p, pic.dots, HIT * (hints.rung >= 4 ? 1.6 : 1));
    const s = stRef.current;
    if (i >= 0) touchDot(i);
    // start a line from the last connected dot (or from dot 1)
    drawing.current = i >= 0 ? i === s.next || i === s.next - 1 : false;
    setPointer(drawing.current ? p : null);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !arbiter.accept(e.nativeEvent)) return;
    const evs = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ce of evs.length ? evs : [e.nativeEvent]) {
      const p = unit(ce);
      const i = dotAt(p, pic.dots, HIT);
      if (i >= 0 && i === stRef.current.next) touchDot(i);
    }
    setPointer(unit(e));
  };

  const onUp = (e: React.PointerEvent) => {
    arbiter.accept(e.nativeEvent);
    drawing.current = false;
    setPointer(null);
  };

  registerTest({
    solve: () => {
      for (let i = stRef.current.next; i < n; i++) touchDot(i);
    },
    fail: () => touchDot(Math.min(n - 1, stRef.current.next + 2)),
  });

  const pts = pic.dots.map(([x, y]) => [x * size, y * size] as const);
  const connected = pts.slice(0, st.next);
  const last = st.next > 0 ? pts[st.next - 1] : null;
  const nextPt = pts[st.next];
  const r = Math.max(16, size * 0.042);
  const demo =
    hints.rung === 3 && last && nextPt && board.current && area.current
      ? (() => {
          const a = area.current.getBoundingClientRect();
          const b = board.current.getBoundingClientRect();
          return {
            from: { x: b.left - a.left + last[0], y: b.top - a.top + last[1] },
            to: { x: b.left - a.left + nextPt[0], y: b.top - a.top + nextPt[1] },
          };
        })()
      : null;

  return (
    <div ref={area} className="relative flex h-full items-center justify-center gap-4 px-4 pb-4">
      <div className="absolute bottom-2 left-3 portrait:hidden">
        <LiveGuide who="pufi" size={170} mood={mood} />
      </div>
      <div
        className="relative rounded-[2rem] border-4 border-ink/60 bg-white shadow-inner"
        style={{ width: size, height: size }}
      >
        <svg
          ref={board}
          width={size}
          height={size}
          className="ink-surface absolute inset-0"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          data-testid="dots-board"
          role="img"
          aria-label="Unește punctele"
        >
          {/* the picture comes alive */}
          <AnimatePresence>
            {st.done && pic.closed && (
              <motion.polygon
                points={pts.map((p) => p.join(',')).join(' ')}
                fill={pic.color}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </AnimatePresence>
          {connected.length > 1 && (
            <polyline
              points={connected.map((p) => p.join(',')).join(' ')}
              fill="none"
              stroke="#3b2a4a"
              strokeWidth={Math.max(6, size * 0.014)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {st.done && pic.closed && (
            <line
              x1={pts[n - 1][0]}
              y1={pts[n - 1][1]}
              x2={pts[0][0]}
              y2={pts[0][1]}
              stroke="#3b2a4a"
              strokeWidth={Math.max(6, size * 0.014)}
              strokeLinecap="round"
            />
          )}
          {pointer && last && !st.done && (
            <line
              x1={last[0]}
              y1={last[1]}
              x2={pointer.x * size}
              y2={pointer.y * size}
              stroke="#7e63b8"
              strokeWidth={5}
              strokeDasharray="8 8"
              strokeLinecap="round"
            />
          )}
          {!st.done &&
            pts.map(([x, y], i) => {
              const isDone = i < st.next;
              const isNext = i === st.next;
              const hide = hints.rung >= 4 && !isNext && !isDone;
              return (
                <motion.g
                  key={`${pic.id}-${i}`}
                  initial={{ scale: 0 }}
                  animate={{
                    scale: isNext && hints.rung >= 1 ? [1, 1.25, 1] : 1,
                    x: shake === i ? [0, -6, 6, 0] : 0,
                    opacity: hide ? 0.15 : 1,
                  }}
                  transition={
                    isNext && hints.rung >= 1
                      ? { duration: 1, repeat: Number.POSITIVE_INFINITY }
                      : { type: 'spring', delay: i * 0.03 }
                  }
                  style={{ originX: `${x}px`, originY: `${y}px` }}
                  data-testid={isNext ? 'dot-next' : 'dot'}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={isDone ? '#8fd16a' : isNext ? '#ffd166' : '#fff'}
                    stroke="#3b2a4a"
                    strokeWidth={3}
                  />
                  <text
                    x={x}
                    y={y + r * 0.36}
                    textAnchor="middle"
                    fontSize={r * 1.05}
                    fontWeight={700}
                    fontFamily="Andika, Fredoka Variable, sans-serif"
                    fill="#3b2a4a"
                    pointerEvents="none"
                  >
                    {i + 1}
                  </text>
                </motion.g>
              );
            })}
        </svg>
        <AnimatePresence>
          {st.done && (
            <motion.div
              className="pointer-events-none absolute inset-0 grid place-items-center"
              initial={{ scale: 0.2, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 12 }}
            >
              <Emoji name={pic.emoji} size={size * 0.42} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {demo && <DemoHand from={demo.from} to={demo.to} />}
    </div>
  );
}
