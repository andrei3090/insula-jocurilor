import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Emoji } from '../../art/Emoji';
import { LiveGuide } from '../../art/LiveGuide';
import type { Mood } from '../../art/parts';
import { sfx } from '../../audio/sfx';
import { useProgress } from '../../core/progress';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { InkCanvas, type InkHandle, type Stroke } from '../../input/InkCanvas';
import { DemoHand } from '../../ui/DemoHand';
import type { LineId } from '../../voice/lines';
import { type Pt, resample } from './geometry';
import { DIGITS, type Glyph, glyphLabel, STROKES, UPPER } from './glyphs';
import {
  checkpoints,
  matchGlyphStroke,
  type NisipSkill,
  pickGlyph,
  progress,
  tolerancesForAge,
} from './logic';

const GROOVE = '#e9c27c';
const boxesOf = (profileId: string) =>
  Object.fromEntries(
    useProgress
      .getState()
      .cardsOf(profileId)
      .map((c) => [c.id, c.box] as [string, number]),
  );
const WET = '#a8743f';

const toD = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(4)} ${p.y.toFixed(4)}`).join(' ');

function Arrow({ pts, at }: { pts: Pt[]; at: number }) {
  const i = Math.min(pts.length - 2, Math.max(0, Math.floor(pts.length * at)));
  const a = pts[i];
  const b = pts[i + 1];
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return (
    <path
      d="M-0.025 -0.022 L0.012 0 L-0.025 0.022"
      transform={`translate(${a.x} ${a.y}) rotate(${ang})`}
      fill="none"
      stroke="#fff"
      strokeWidth={0.014}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

type Kind = 'strokes' | 'upper' | 'digits';
const LISTS: Record<Kind, Glyph[]> = { strokes: STROKES, upper: UPPER, digits: DIGITS };

const KINDS: { kind: Kind; label: string; sample: string; voice: LineId; color: string }[] = [
  { kind: 'strokes', label: 'Linii și valuri', sample: '〰', voice: 'nisip.pick.strokes', color: '#4cc9c0' },
  { kind: 'upper', label: 'Litere', sample: 'A', voice: 'nisip.pick.letters', color: '#7e63b8' },
  { kind: 'digits', label: 'Cifre', sample: '1', voice: 'nisip.pick.digits', color: '#5aa83a' },
];

/** The child chooses what to write: lines, letters or digits. The level only pre-selects the suggestion. */
export default function NisipGame(props: GameProps) {
  const suggested = (props.level.skill.split('.')[1] ?? 'strokes') as Kind;
  const [kind, setKind] = useState<Kind | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once
  useEffect(() => {
    void props.voice.prompt('nisip.choose');
  }, []);
  if (kind) return <Board {...props} kind={kind} onChangeKind={() => setKind(null)} />;
  props.registerTest({ solve: () => setKind(suggested), fail: () => props.hints.next() });
  return (
    <div
      className="flex h-full items-center justify-center gap-6 px-6 pb-6"
      style={{ background: 'radial-gradient(circle at 30% 20%, #fff2cf 0%, #ffe3a8 45%, #f3cf8b 100%)' }}
      data-testid="nisip-picker"
    >
      {KINDS.map((k, i) => (
        <motion.button
          key={k.kind}
          type="button"
          aria-label={k.label}
          data-testid={`pick-${k.kind}`}
          onClick={() => {
            sfx.pop();
            void props.voice.say(k.voice);
            setKind(k.kind);
          }}
          initial={{ scale: 0, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: i * 0.08, type: 'spring' }}
          whileTap={{ scale: 0.9 }}
          className={`flex h-[220px] w-[200px] flex-col items-center justify-center gap-2 rounded-[2.2rem] border-4 border-ink/80 shadow-[0_8px_0_rgba(59,42,74,0.3)] ${k.kind === suggested ? 'ring-8 ring-sun' : ''}`}
          style={{ background: k.color }}
        >
          <span className="font-school text-[96px] leading-none font-bold text-white">{k.sample}</span>
          <span className="text-xl font-semibold text-white">{k.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

function Board({
  level,
  onItem,
  voice,
  hints,
  registerTest,
  profileId,
  kind,
  onChangeKind,
}: GameProps & { kind: Kind; onChangeKind(): void }) {
  const skill = `trace.${kind}` as NisipSkill;
  const list = LISTS[kind];
  const rand = useRef(rng(randomSeed()));
  const [glyph, setGlyph] = useState<Glyph>(() => pickGlyph(list, boxesOf(profileId), rand.current));
  const [done, setDone] = useState<number[]>([]);
  const [mood, setMood] = useState<Mood>('wave');
  const [washing, setWashing] = useState(false);
  const [turtleAt, setTurtleAt] = useState(0);
  const mistakes = useRef(0);
  const started = useRef(Date.now());
  const ink = useRef<InkHandle>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(400);
  const age = level.age;
  const errorless = hints.rung >= 4;
  const tol = useMemo(() => {
    const t = tolerancesForAge(age);
    return errorless ? { r: t.r * 1.6, d: t.d * 1.6 } : t;
  }, [age, errorless]);
  const follow = age < 6 || errorless;

  const pending = glyph.strokes.map((_, i) => i).filter((i) => !done.includes(i));
  const current = pending[0];
  const cps = useMemo(
    () => (current === undefined ? [] : checkpoints(glyph.strokes[current])),
    [glyph, current],
  );

  const promptFor = useCallback(
    (g: Glyph): LineId[] => [g.voice, age < 5 ? 'nisip.follow' : 'nisip.trace'],
    [age],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: prompt per glyph
  useEffect(() => {
    void voice.prompt(promptFor(glyph));
  }, [glyph]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setBox(Math.floor(Math.min(r.width * 0.62, r.height * 0.96)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nextGlyph = useCallback(async () => {
    setWashing(true);
    setMood('happy');
    sfx.wave();
    await new Promise((r) => setTimeout(r, 900));
    await onItem({
      skill,
      correct: mistakes.current === 0,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
      itemId: `T-${glyph.id}`,
    });
    mistakes.current = 0;
    started.current = Date.now();
    hints.reset();
    setDone([]);
    setTurtleAt(0);
    setWashing(false);
    setMood('idle');
    setGlyph((g) => pickGlyph(list, boxesOf(profileId), rand.current, g.id));
  }, [onItem, skill, hints, glyph.id, list, profileId]);

  const onStrokeEnd = (s: Stroke) => {
    const drawn = s.points.map(([x, y]) => ({ x: x / box, y: y / box }));
    const m = matchGlyphStroke(drawn, glyph, done, age, tol);
    if (import.meta.env.DEV)
      console.debug('[nisip]', glyph.id, { n: drawn.length, first: drawn[0], last: drawn.at(-1), box, m });
    setTurtleAt(0);
    if (m.ok && m.index !== undefined) {
      const next = [...done, m.index];
      setDone(next);
      sfx.pop();
      if (next.length === glyph.strokes.length) void nextGlyph();
      return;
    }
    mistakes.current += 1;
    setMood('think');
    sfx.swish();
    if (m.reason === 'start' && hints.rung === 0) void voice.say('nisip.start');
    hints.next();
  };

  const onStrokeMove = (p: [number, number, number]) => {
    if (!follow || current === undefined) return;
    const idx = progress([{ x: p[0] / box, y: p[1] / box }], cps, tol.r * 1.2, turtleAt);
    if (idx > turtleAt) setTurtleAt(idx);
  };

  registerTest({
    solve: () => {
      setDone(glyph.strokes.map((_, i) => i));
      void nextGlyph();
    },
    fail: () => {
      mistakes.current += 1;
      hints.next();
    },
  });

  // the demo hand follows the current stroke (px relative to the game area)
  const demoPath = useMemo(() => {
    if (hints.rung !== 3 || current === undefined || !boxRef.current || !areaRef.current) return null;
    const a = areaRef.current.getBoundingClientRect();
    const b = boxRef.current.getBoundingClientRect();
    return checkpoints(glyph.strokes[current])
      .filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 14)) === 0 || i === arr.length - 1)
      .map((p) => ({ x: b.left - a.left + p.x * box, y: b.top - a.top + p.y * box }));
  }, [hints.rung, current, glyph, box]);

  const turtle =
    follow && current !== undefined && cps.length > 1 ? cps[Math.min(cps.length - 1, turtleAt + 2)] : null;

  return (
    <div
      ref={areaRef}
      className="relative flex h-full items-center justify-center gap-6 overflow-hidden px-6 pb-4"
      style={{ background: 'radial-gradient(circle at 30% 20%, #fff2cf 0%, #ffe3a8 45%, #f3cf8b 100%)' }}
    >
      <div className="absolute bottom-2 left-4 portrait:hidden">
        <LiveGuide who="marina" size={190} mood={mood} />
      </div>
      <button
        type="button"
        aria-label="Alege altceva de scris"
        onClick={onChangeKind}
        className="absolute top-2 right-4 z-10 grid size-[84px] place-items-center rounded-full border-4 border-ink/70 bg-white/90 font-school text-3xl font-bold"
      >
        {kind === 'digits' ? '1' : kind === 'upper' ? 'A' : '〰'}
      </button>
      <div ref={boxRef} className="relative" style={{ width: box, height: box }} data-testid="sand">
        {glyph.kind !== 'stroke' && (
          <span className="pointer-events-none absolute -top-2 right-2 font-school text-6xl font-bold text-ink/25">
            {glyphLabel(glyph)}
          </span>
        )}
        <svg
          viewBox="0 0 1 1"
          width={box}
          height={box}
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          {glyph.strokes.map((s, i) => {
            const isDone = done.includes(i);
            const isCurrent = i === current;
            const glow = isCurrent && hints.rung >= 2;
            if (s.length === 1)
              return (
                <circle
                  key={i}
                  cx={s[0].x}
                  cy={s[0].y}
                  r={0.05}
                  fill={isDone ? WET : glow ? '#ffd166' : GROOVE}
                  stroke={isCurrent ? '#5aa83a' : 'none'}
                  strokeWidth={0.012}
                />
              );
            return (
              <g key={i}>
                <path
                  d={toD(s)}
                  fill="none"
                  stroke={isDone ? WET : glow ? '#ffd166' : GROOVE}
                  strokeWidth={isDone ? 0.07 : 0.11}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {!isDone && (
                  <path
                    d={toD(s)}
                    fill="none"
                    stroke="#fffaf0"
                    strokeWidth={0.012}
                    strokeDasharray="0.02 0.03"
                    strokeLinecap="round"
                    opacity={isCurrent ? 1 : 0.5}
                  />
                )}
                {isCurrent && (
                  <>
                    <Arrow pts={resample(s, 24)} at={0.3} />
                    <Arrow pts={resample(s, 24)} at={0.7} />
                  </>
                )}
              </g>
            );
          })}
          {current !== undefined && (
            <motion.circle
              cx={glyph.strokes[current][0].x}
              cy={glyph.strokes[current][0].y}
              r={0.04}
              fill="#6fd36f"
              stroke="#3b2a4a"
              strokeWidth={0.008}
              animate={{ r: hints.rung >= 2 ? [0.04, 0.06, 0.04] : [0.04, 0.047, 0.04] }}
              transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            />
          )}
        </svg>
        {turtle && (
          <motion.div
            className="pointer-events-none absolute z-10"
            data-testid="turtle"
            initial={false}
            animate={{ left: turtle.x * box - 28, top: turtle.y * box - 28 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <Emoji name="turtle" size={56} />
          </motion.div>
        )}
        <InkCanvas
          ref={ink}
          className="absolute inset-0"
          color="#8a5a2b"
          size={Math.max(14, box * 0.045)}
          persist={false}
          disabled={washing}
          label="Nisip pentru scris"
          onStrokeMove={onStrokeMove}
          onStrokeEnd={onStrokeEnd}
        />
        <AnimatePresence>
          {washing && (
            <motion.div
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-[200%] rounded-[40%] bg-gradient-to-r from-transparent via-lagoon/80 to-transparent"
              initial={{ x: '-60%' }}
              animate={{ x: '60%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>
      </div>
      {demoPath && <DemoHand from={demoPath[0]} path={demoPath} />}
    </div>
  );
}
