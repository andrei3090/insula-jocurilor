import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pufi } from '../../art/Pufi';
import type { Mood } from '../../art/parts';
import { sfx } from '../../audio/sfx';
import { saveDrawing } from '../../core/drawings';
import type { GameProps } from '../../core/types';
import { InkCanvas, type InkHandle, type Stroke } from '../../input/InkCanvas';
import { BigButton } from '../../ui/BigButton';
import { StarBurst } from '../../ui/Celebration';
import { DemoHand } from '../../ui/DemoHand';
import { CheckIcon } from '../../ui/icons';
import { POTS } from '../desen/logic';
import type { Pt } from '../nisip/geometry';
import { DRAWINGS, type Drawing, regionsOf } from './drawings';
import { allowedMask, inkBarrier, paintMask } from './fill';
import {
  applyStroke,
  checkpointsOf,
  coverageNeed,
  emptyProgress,
  floodFill,
  growInto,
  pathDone,
  pickRegion,
  type StepProgress,
  tolFor,
} from './logic';
import { DrawingModel, INK, toD } from './Model';

const PALETTE = [...POTS, { id: 'white', color: '#ffffff', voice: 'color.white' as const }];
/** how far a fill may reach past the ideal shape towards her line (unit box) */
const PAD = 0.06;
const SIDE = 220;
/** colour pots: 2 × 5 beside the paper, 5 × 2 under it */
const POT = 70;

type Fill = { x: number; y: number; color: string };

/** Pick a drawing, trace it step by step with Pufi, then colour it inside her own lines. */
export default function GhidatGame(props: GameProps) {
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [autoSolve, setAutoSolve] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once
  useEffect(() => {
    void props.voice.prompt('ghidat.choose');
  }, []);
  if (drawing) return <Board {...props} drawing={drawing} autoSolve={autoSolve} />;
  props.registerTest({
    solve: () => {
      setAutoSolve(true);
      setDrawing(DRAWINGS[0]);
    },
    fail: () => props.hints.next(),
  });
  return (
    <div
      className="flex h-full flex-wrap content-center items-center justify-center gap-5 px-6 pb-6"
      data-testid="drawings"
    >
      {DRAWINGS.map((d, i) => (
        <motion.button
          key={d.id}
          type="button"
          aria-label={d.label}
          data-testid={`drawing-${d.id}`}
          onClick={() => {
            sfx.pop();
            setDrawing(d);
          }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, type: 'spring' }}
          whileTap={{ scale: 0.9 }}
          className="grid size-[176px] place-items-center rounded-[2.2rem] border-4 border-ink/70 bg-white shadow-[0_6px_0_rgba(59,42,74,0.3)]"
        >
          <DrawingModel drawing={d} size={150} />
        </motion.button>
      ))}
    </div>
  );
}

function Guide({
  paths,
  prog,
  need,
  glow,
}: {
  paths: Pt[][];
  prog: StepProgress;
  need: number;
  glow: boolean;
}) {
  const firstOpen = paths.findIndex((_, i) => !pathDone(prog[i], need));
  return (
    <>
      {paths.map((p, i) => {
        if (pathDone(prog[i], need)) return null;
        if (p.length === 1)
          return (
            <motion.circle
              key={i}
              cx={p[0].x}
              cy={p[0].y}
              fill={glow ? '#ffd166' : '#ffe9b8'}
              stroke={INK}
              strokeOpacity={0.6}
              strokeWidth={0.006}
              strokeDasharray="0.012 0.012"
              animate={{ r: [0.03, 0.04, 0.03] }}
              transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            />
          );
        const cps = checkpointsOf(p);
        const a = p[0];
        const b = p[Math.min(p.length - 1, 3)];
        const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        return (
          <g key={i}>
            <motion.path
              d={toD(p)}
              fill="none"
              stroke={glow ? '#ffd166' : '#ffe9b8'}
              strokeWidth={0.05}
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={glow ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
              transition={glow ? { duration: 1, repeat: Number.POSITIVE_INFINITY } : undefined}
            />
            <path
              d={toD(p)}
              fill="none"
              stroke={INK}
              strokeOpacity={0.55}
              strokeWidth={0.007}
              strokeDasharray="0.016 0.02"
              strokeLinecap="round"
            />
            {cps.map((c, j) =>
              prog[i][j] ? <circle key={j} cx={c.x} cy={c.y} r={0.01} fill="#5aa83a" /> : null,
            )}
            {i === firstOpen && (
              <>
                <motion.circle
                  cx={a.x}
                  cy={a.y}
                  fill="#6fd36f"
                  stroke={INK}
                  strokeWidth={0.006}
                  animate={{ r: [0.022, 0.03, 0.022] }}
                  transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
                />
                <path
                  d="M-0.02 -0.018 L0.012 0 L-0.02 0.018"
                  transform={`translate(${a.x} ${a.y}) rotate(${ang}) translate(0.055 0)`}
                  fill="none"
                  stroke="#5aa83a"
                  strokeWidth={0.012}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
          </g>
        );
      })}
    </>
  );
}

type Phase = 'draw' | 'color' | 'busy';

function Board({
  level,
  onItem,
  voice,
  hints,
  registerTest,
  profileId,
  drawing,
  autoSolve,
}: GameProps & { drawing: Drawing; autoSolve: boolean }) {
  const steps = drawing.steps;
  const regions = useMemo(() => regionsOf(drawing), [drawing]);
  const [stepIdx, setStepIdx] = useState(0);
  const [prog, setProg] = useState<StepProgress>(() => emptyProgress(steps[0].paths));
  const [phase, setPhase] = useState<Phase>('draw');
  const [mood, setMood] = useState<Mood>('wave');
  const [color, setColor] = useState(PALETTE[2].color);
  const [fillCount, setFillCount] = useState(0);
  const [burst, setBurst] = useState(0);
  const [box, setBox] = useState(0);
  const [portrait, setPortrait] = useState(false);
  const progRef = useRef(prog);
  const ink = useRef<InkHandle>(null);
  const fillCanvas = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const hasInk = useRef(false);
  const fills = useRef<Fill[]>([]);
  const cache = useRef<{ barrier: Uint8Array | null; masks: Map<number, Uint8Array> }>({
    barrier: null,
    masks: new Map(),
  });
  const mistakes = useRef(0);
  const maxRung = useRef(0);
  const offguideSaid = useRef(false);
  const started = useRef(Date.now());

  const age = level.age;
  const errorless = hints.rung >= 4;
  const tol = useMemo(() => tolFor(age, errorless), [age, errorless]);
  const need = coverageNeed(age);
  const step = steps[stepIdx];

  // the paper keeps its size once she has drawn (her strokes are in pixels)
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const port = r.height > r.width;
      setPortrait(port);
      if (hasInk.current) return;
      const b = port
        ? Math.min(r.width - 32, r.height - 150 - 196 - 32)
        : Math.min(r.height - 20, r.width - 2 * SIDE - 64);
      setBox(Math.max(240, Math.floor(b)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: speak once per step
  useEffect(() => {
    if (phase === 'draw') void voice.prompt(step.voice);
  }, [stepIdx]);

  const toColour = useCallback(() => {
    maxRung.current = Math.max(maxRung.current, hints.rung);
    hints.reset();
    setPhase('color');
    setMood('happy');
    setBurst((b) => b + 1);
    sfx.success();
    void voice.prompt(['ghidat.done', 'coloreaza.intro']);
  }, [hints, voice]);

  const nextStep = useCallback(() => {
    maxRung.current = Math.max(maxRung.current, hints.rung);
    hints.reset();
    sfx.chime();
    setMood('happy');
    if (stepIdx + 1 >= steps.length) {
      toColour();
      return;
    }
    const fresh = emptyProgress(steps[stepIdx + 1].paths);
    progRef.current = fresh;
    setProg(fresh);
    setStepIdx(stepIdx + 1);
  }, [hints, stepIdx, steps, toColour]);

  const onStrokeEnd = (s: Stroke) => {
    if (phase !== 'draw' || !box) return;
    const samples = s.points.map(([x, y]) => ({ x: x / box, y: y / box }));
    const r = applyStroke(progRef.current, samples, step.paths, tol, need);
    if (!r.accepted) {
      ink.current?.undo();
      mistakes.current += 1;
      setMood('think');
      sfx.swish();
      if (!offguideSaid.current) {
        offguideSaid.current = true;
        void voice.say('ghidat.offguide');
      }
      hints.next();
      return;
    }
    hasInk.current = true;
    progRef.current = r.prog;
    setProg(r.prog);
    sfx.pop();
    if (r.done) nextStep();
  };

  // colouring: a flood fill inside her own lines, limited to the shape she tapped
  const size = box;
  const applyFill = useCallback(
    (f: Fill) => {
      const base = ink.current?.canvas();
      const target = fillCanvas.current;
      if (!base || !target || !size) return;
      if (target.width !== size) {
        target.width = size;
        target.height = size;
      }
      const c = cache.current;
      c.barrier ??= inkBarrier(base, size);
      const idx = pickRegion({ x: f.x, y: f.y }, regions, PAD);
      let mask = c.masks.get(idx);
      if (!mask) {
        mask = allowedMask(size, regions, idx, PAD);
        c.masks.set(idx, mask);
      }
      const filled = floodFill(size, size, c.barrier, mask, f.x * size, f.y * size, 14);
      paintMask(target, growInto(filled, c.barrier, size), f.color);
    },
    [regions, size],
  );

  const paint = (e: React.PointerEvent) => {
    if (phase !== 'color' || !paper.current) return;
    const r = paper.current.getBoundingClientRect();
    const f = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, color };
    fills.current.push(f);
    applyFill(f);
    setFillCount(fills.current.length);
    sfx.pop();
  };

  const undo = () => {
    const target = fillCanvas.current;
    if (!fills.current.length || !target) return;
    fills.current.pop();
    target.getContext('2d')?.clearRect(0, 0, target.width, target.height);
    for (const f of fills.current) applyFill(f);
    setFillCount(fills.current.length);
    sfx.swish();
  };

  const finish = async () => {
    if (phase === 'busy') return;
    setPhase('busy');
    setMood('happy');
    const blob = await ink.current?.toBlob({
      under: (ctx, w, h) => {
        if (fillCanvas.current?.width) ctx.drawImage(fillCanvas.current, 0, 0, w, h);
      },
    });
    if (blob) await saveDrawing(profileId, blob).catch(() => {});
    await onItem({
      skill: 'draw.shapes',
      correct: mistakes.current === 0,
      hintsUsed: Math.max(maxRung.current, hints.rung),
      ms: Date.now() - started.current,
      itemId: `D-${drawing.id}`,
    });
  };

  const solveAll = () => {
    const last = steps.length - 1;
    const full = steps[last].paths.map((p) => checkpointsOf(p).map(() => true));
    progRef.current = full;
    setProg(full);
    setStepIdx(last);
    setPhase('color');
    setTimeout(() => void finish(), 50);
  };

  registerTest({
    solve: solveAll,
    fail: () => {
      mistakes.current += 1;
      hints.next();
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: test hook, once
  useEffect(() => {
    if (autoSolve) setTimeout(solveAll, 300);
  }, []);

  // the demo hand traces the first part still to draw (px relative to the game area)
  const demoPath = useMemo(() => {
    if (hints.rung !== 3 || phase !== 'draw' || !paper.current || !area.current) return null;
    const i = step.paths.findIndex((_, k) => !pathDone(prog[k], need));
    if (i < 0) return null;
    const a = area.current.getBoundingClientRect();
    const b = paper.current.getBoundingClientRect();
    const cps = checkpointsOf(step.paths[i]);
    return cps
      .filter((_, k) => k % Math.max(1, Math.floor(cps.length / 14)) === 0 || k === cps.length - 1)
      .map((p) => ({ x: b.left - a.left + p.x * box, y: b.top - a.top + p.y * box }));
  }, [hints.rung, phase, step, prog, need, box]);

  const colouring = phase !== 'draw';

  return (
    <div
      ref={area}
      className="relative flex h-full items-center justify-center gap-8 px-4 pb-3 portrait:flex-col portrait:gap-3"
    >
      <div
        className="flex flex-col items-center gap-2 portrait:flex-row portrait:gap-6"
        style={{ width: portrait ? undefined : SIDE }}
      >
        <div
          className="grid place-items-center rounded-[2rem] border-4 border-ink/60 bg-white shadow-[0_6px_0_rgba(59,42,74,0.25)]"
          data-testid="model"
        >
          <DrawingModel
            drawing={drawing}
            size={portrait ? 130 : 180}
            current={colouring ? undefined : stepIdx}
          />
        </div>
        <Pufi size={portrait ? 120 : 170} mood={mood} />
      </div>

      <motion.div
        ref={paper}
        className="relative shrink-0 rounded-[1.6rem] bg-paper shadow-[0_0_0_5px_rgba(59,42,74,0.7),0_10px_0_5px_rgba(59,42,74,0.18)]"
        style={{ width: box, height: box }}
        animate={phase === 'color' && burst ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={{ duration: 0.6 }}
        data-testid="paper"
        data-step={stepIdx}
        data-phase={phase}
      >
        <canvas
          ref={fillCanvas}
          className="pointer-events-none absolute inset-0 h-full w-full rounded-[1.6rem]"
          data-testid="fill"
        />
        {!colouring && (
          <svg
            viewBox="0 0 1 1"
            width={box}
            height={box}
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <Guide paths={step.paths} prog={prog} need={need} glow={hints.rung >= 2} />
          </svg>
        )}
        {box > 0 && (
          <InkCanvas
            ref={ink}
            className="absolute inset-0"
            color={INK}
            size={Math.max(7, box * 0.016)}
            disabled={phase !== 'draw'}
            label="Foaie pentru desenat cu Pufi"
            onStrokeEnd={onStrokeEnd}
          />
        )}
        {colouring && (
          <div
            className="absolute inset-0 z-10 cursor-pointer rounded-[1.6rem]"
            style={{ touchAction: 'none' }}
            onPointerDown={paint}
            data-testid="color-layer"
          />
        )}
        {burst > 0 && <StarBurst key={burst} />}
      </motion.div>

      <div
        className={`flex flex-col items-center gap-3 portrait:flex-row portrait:gap-6 ${colouring ? '' : 'invisible'}`}
        style={{ width: portrait ? undefined : SIDE }}
        aria-hidden={!colouring}
      >
        <div
          className="grid grid-cols-2 gap-[10px] portrait:grid-cols-5 portrait:gap-3"
          data-testid="palette"
        >
          {PALETTE.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              aria-label={p.id}
              onClick={() => {
                setColor(p.color);
                void voice.say(p.voice);
              }}
              whileTap={{ scale: 0.85 }}
              animate={{ scale: color === p.color ? 1.12 : 1 }}
              className={`shrink-0 rounded-full border-4 shadow-[0_4px_0_rgba(59,42,74,0.3)] ${color === p.color ? 'border-ink' : 'border-ink/40'}`}
              style={{ background: p.color, width: POT, height: POT }}
            />
          ))}
        </div>
        <div className="flex gap-4 portrait:flex-col">
          <BigButton label="Înapoi un pas" size={88} round onPress={undo} disabled={!fillCount} testId="undo">
            <svg viewBox="0 0 64 64" width={44} height={44} aria-hidden="true">
              <path
                d="M24 18 L12 30 L24 42"
                fill="none"
                stroke="#3b2a4a"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 30 H38 A14 14 0 0 1 38 58 H30"
                fill="none"
                stroke="#3b2a4a"
                strokeWidth={6}
                strokeLinecap="round"
              />
            </svg>
          </BigButton>
          <BigButton
            label="Gata, pune în album"
            size={88}
            round
            tone="lagoon"
            onPress={() => void finish()}
            testId="save"
          >
            <CheckIcon size={50} />
          </BigButton>
        </div>
      </div>
      {demoPath && <DemoHand from={demoPath[0]} path={demoPath} />}
    </div>
  );
}
