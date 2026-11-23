import { motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { useT } from '../../i18n/ui';
import {
  isRight,
  type ModeleItem,
  type ModeleSkill,
  type ModeleSpec,
  makeItem,
  same,
  type Token,
} from './logic';
import { ShapeArt } from './Shape';

/** A row of shapes that follow a pattern, one place is "?": she taps the piece that belongs there. */
export default function ModeleGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const t = useT();
  const spec = level.spec as ModeleSpec;
  const skill = level.skill as ModeleSkill;
  const rand = useRef(rng(randomSeed()));
  const [item, setItem] = useState<ModeleItem>(() => makeItem(spec, rand.current));
  const [filled, setFilled] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const [width, setWidth] = useState(1000);
  const rowRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const mistakes = useRef(0);
  const started = useRef(Date.now());

  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: one instruction per item
  useEffect(() => {
    void voice.prompt(item.gap === item.row.length - 1 ? 'modele.next' : 'modele.missing');
  }, [item]);

  const choose = async (o: Token, i: number) => {
    if (busy.current) return;
    if (!isRight(item, o)) {
      mistakes.current += 1;
      setWrong(i);
      setTimeout(() => setWrong(null), 450);
      hints.next();
      return;
    }
    busy.current = true;
    setFilled(true);
    sfx.chime();
    await new Promise((r) => setTimeout(r, 900));
    await onItem({
      skill,
      correct: mistakes.current === 0,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
      itemId: `P-${item.unit}`,
    });
    mistakes.current = 0;
    started.current = Date.now();
    hints.reset();
    setFilled(false);
    setItem(makeItem(spec, rand.current));
    busy.current = false;
  };

  registerTest({
    solve: () => {
      const i = item.options.findIndex((o) => same(o, item.answer));
      void choose(item.options[i], i);
    },
    fail: () => {
      const i = item.options.findIndex((o) => !same(o, item.answer));
      if (i >= 0) void choose(item.options[i], i);
    },
  });

  const n = item.row.length;
  const tile = Math.max(58, Math.min(108, Math.floor((width - 8 * (n - 1)) / n)));
  const errorless = hints.rung >= 4;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 px-6 pb-8">
      <div
        ref={rowRef}
        className="flex w-full max-w-[1180px] items-center justify-center gap-2 rounded-[2.4rem] border-4 border-ink/40 bg-[#e9e1f7] px-3 py-5"
        data-testid="pattern-row"
      >
        {item.row.map((tok, i) => {
          const isGap = i === item.gap;
          return (
            <div
              key={`${item.unit}-${item.row.length}-${i}`}
              className={`grid place-items-center rounded-2xl ${isGap && !filled ? 'border-4 border-dashed border-ink/60 bg-white' : ''}`}
              style={{ width: tile, height: tile }}
              data-testid={isGap ? 'gap' : undefined}
            >
              {isGap && !filled ? (
                <motion.span
                  className="text-5xl font-bold text-ink/60"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY }}
                >
                  ?
                </motion.span>
              ) : (
                <motion.span
                  initial={isGap ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                >
                  <ShapeArt token={tok} size={tile - 10} />
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-6" data-testid="pattern-options">
        {item.options.map((o, i) => {
          const right = same(o, item.answer);
          const glow = hints.rung >= 2 && right;
          const faded = errorless && !right;
          return (
            <motion.button
              key={`${item.unit}-${i}-${o.shape}-${o.color}`}
              type="button"
              data-testid={right ? 'option-right' : 'option'}
              aria-label={t('mod.option', { x: i + 1 })}
              disabled={faded || filled}
              onClick={() => void choose(o, i)}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={
                wrong === i
                  ? { scale: 1, opacity: 1, x: [0, -12, 12, -8, 8, 0] }
                  : { scale: glow && hints.rung >= 3 ? [1, 1.1, 1] : 1, opacity: faded ? 0.2 : 1, x: 0 }
              }
              transition={
                wrong === i
                  ? { duration: 0.4 }
                  : { scale: { duration: 1, repeat: glow && hints.rung >= 3 ? Number.POSITIVE_INFINITY : 0 } }
              }
              whileTap={{ scale: 0.92 }}
              className={`grid size-[136px] place-items-center rounded-[2rem] border-4 bg-white shadow-[0_6px_0_rgba(59,42,74,0.25)] touch-manipulation ${
                glow ? 'border-sun ring-8 ring-sun/70' : 'border-ink/70'
              }`}
            >
              <ShapeArt token={o} size={104} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
