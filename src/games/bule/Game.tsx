import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { useT } from '../../i18n/ui';
import type { LineId } from '../../voice/lines';
import { numberLine } from '../../voice/numbers';
import {
  type Bubble,
  type BuleItem,
  type BuleSkill,
  type BuleSpec,
  COLORS,
  isTarget,
  makeItem,
  tap,
} from './logic';

const COLS = 4;
const ROWS = 3;

const promptFor = (it: BuleItem): LineId =>
  it.mode === 'count'
    ? (`bule.count.${it.n}` as LineId)
    : it.mode === 'digit'
      ? (`bule.digit.${it.n}` as LineId)
      : (`bule.color.${it.color}` as LineId);

/** One soap bubble: a see-through ball of colour with a shine; it bobs in place (never drifts away). */
function BubbleArt({ b, size }: { b: Bubble; size: number }) {
  const c = COLORS[b.color];
  const gid = `bub-${b.id}-${b.color}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="35%" stopColor={c} stopOpacity="0.55" />
          <stop offset="100%" stopColor={c} stopOpacity="0.95" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill={`url(#${gid})`} stroke="#3b2a4a" strokeWidth="3" />
      <ellipse cx="34" cy="30" rx="12" ry="7" fill="#fff" opacity="0.85" transform="rotate(-30 34 30)" />
      {b.digit !== undefined && (
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontSize="46"
          fontWeight="700"
          fill="#3b2a4a"
          className="font-school"
          stroke="#fff"
          strokeWidth="2"
          paintOrder="stroke"
        >
          {b.digit}
        </text>
      )}
    </svg>
  );
}

export default function BuleGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const t = useT();
  const spec = level.spec as BuleSpec;
  const skill = level.skill as BuleSkill;
  const rand = useRef(rng(randomSeed()));
  const [item, setItem] = useState<BuleItem>(() => makeItem(spec, rand.current));
  const [popped, setPopped] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState({ w: 900, h: 560 });
  const area = useRef<HTMLDivElement>(null);
  const poppedRef = useRef<number[]>([]);
  const mistakes = useRef(0);
  const started = useRef(Date.now());

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: one instruction per item
  useEffect(() => {
    void voice.prompt(promptFor(item));
  }, [item]);

  const finish = async (it: BuleItem) => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 450));
    await onItem({
      skill,
      correct: mistakes.current === 0,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
      itemId: `${it.mode}-${it.color ?? it.n}`,
    });
    mistakes.current = 0;
    started.current = Date.now();
    hints.reset();
    poppedRef.current = [];
    setPopped([]);
    setItem(makeItem(spec, rand.current, it));
    setBusy(false);
  };

  const press = (id: number) => {
    if (busy) return;
    const res = tap(item, poppedRef.current, id);
    if (res === 'gone') return;
    if (res === 'wrong') {
      mistakes.current += 1;
      setWrong(id);
      setTimeout(() => setWrong(null), 450);
      hints.next();
      return;
    }
    sfx.pop();
    poppedRef.current = [...poppedRef.current, id];
    setPopped(poppedRef.current);
    // she counts with her taps: say the number of the bubble she just popped
    if (item.mode === 'count') void voice.say(numberLine(poppedRef.current.length, level.lang), 'now');
    if (res === 'done') void finish(item);
  };

  registerTest({
    solve: () => {
      const todo = item.bubbles.filter((b) => isTarget(item, b) && !poppedRef.current.includes(b.id));
      const need = item.mode === 'count' ? (item.n ?? 1) - poppedRef.current.length : todo.length;
      todo.slice(0, need).forEach((b, i) => {
        setTimeout(() => press(b.id), i * 60);
      });
    },
    fail: () => {
      const other = item.bubbles.find((b) => !isTarget(item, b) && !poppedRef.current.includes(b.id));
      if (other) press(other.id);
      else hints.next();
    },
  });

  const errorless = hints.rung >= 4;
  const cellW = box.w / COLS;
  const cellH = box.h / ROWS;
  const size = Math.max(110, Math.min(175, Math.min(cellW, cellH) * 0.82));

  return (
    <div ref={area} className="relative h-full w-full touch-manipulation" data-testid="bubbles">
      <AnimatePresence>
        {item.bubbles
          .filter((b) => !popped.includes(b.id))
          .map((b) => {
            const col = b.slot % COLS;
            const row = Math.floor(b.slot / COLS);
            // a small fixed offset per bubble so the grid does not look like a grid
            const jx = (((b.id * 37 + b.slot * 11) % 21) - 10) * (cellW / 120);
            const jy = (((b.id * 53 + b.slot * 7) % 21) - 10) * (cellH / 120);
            const target = isTarget(item, b);
            const glow = hints.rung >= 2 && target && item.mode !== 'count';
            const faded = errorless && !target;
            return (
              <motion.button
                key={`${item.bubbles.map((x) => x.slot).join('.')}-${b.id}`}
                type="button"
                data-testid={target ? 'bubble-right' : 'bubble'}
                aria-label={
                  b.digit !== undefined
                    ? t('bule.digit', { x: b.digit })
                    : t(`bule.c.${b.color}` as 'bule.c.red')
                }
                disabled={faded}
                onClick={() => press(b.id)}
                className={`absolute rounded-full touch-manipulation ${glow ? 'drop-shadow-[0_0_18px_rgba(255,209,102,1)]' : ''}`}
                style={{
                  width: size,
                  height: size,
                  left: col * cellW + (cellW - size) / 2 + jx,
                  top: row * cellH + (cellH - size) / 2 + jy,
                  opacity: faded ? 0.18 : 1,
                }}
                initial={{ scale: 0 }}
                animate={
                  wrong === b.id
                    ? { scale: 1, x: [0, -12, 12, -8, 8, 0], y: 0 }
                    : { scale: glow && hints.rung >= 3 ? [1, 1.12, 1] : 1, y: [0, -8, 0], x: 0 }
                }
                exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.22 } }}
                transition={
                  wrong === b.id
                    ? { duration: 0.4 }
                    : {
                        scale: {
                          duration: 1.1,
                          repeat: glow && hints.rung >= 3 ? Number.POSITIVE_INFINITY : 0,
                        },
                        y: {
                          duration: 2.2 + (b.id % 4) * 0.35,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'easeInOut',
                        },
                      }
                }
                whileTap={{ scale: 0.92 }}
              >
                <BubbleArt b={b} size={size} />
              </motion.button>
            );
          })}
      </AnimatePresence>
    </div>
  );
}
