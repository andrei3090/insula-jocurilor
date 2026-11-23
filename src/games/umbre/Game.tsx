import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Emoji } from '../../art/Emoji';
import { sfx } from '../../audio/sfx';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { useT } from '../../i18n/ui';
import { type LineId, textOf } from '../../voice/lines';
import {
  ANIMALS,
  type AnimalId,
  isRight,
  makeItem,
  type UmbreItem,
  type UmbreSkill,
  type UmbreSpec,
} from './logic';

/**
 * A big colour animal and 2–5 shadows. She taps the right shadow, or drags the animal onto it.
 * Right: the shadow fills with colour and the animal's name is said. Wrong: the shadow wiggles, a hint.
 */
export default function UmbreGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const t = useT();
  const spec = level.spec as UmbreSpec;
  const skill = level.skill as UmbreSkill;
  const rand = useRef(rng(randomSeed()));
  const [item, setItem] = useState<UmbreItem>(() => makeItem(spec, rand.current));
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState<AnimalId | null>(null);
  const busy = useRef(false);
  const mistakes = useRef(0);
  const started = useRef(Date.now());

  // biome-ignore lint/correctness/useExhaustiveDependencies: one instruction per item
  useEffect(() => {
    void voice.prompt(`umbre.find.${item.target}` as LineId);
  }, [item]);

  const choose = async (a: AnimalId) => {
    if (busy.current) return;
    if (!isRight(item, a)) {
      mistakes.current += 1;
      setWrong(a);
      setTimeout(() => setWrong(null), 450);
      hints.next();
      return;
    }
    busy.current = true;
    setFound(true);
    sfx.chime();
    void voice.say(`anim.${a}` as LineId, 'now');
    await new Promise((r) => setTimeout(r, 1100));
    await onItem({
      skill,
      correct: mistakes.current === 0,
      hintsUsed: hints.rung,
      ms: Date.now() - started.current,
      itemId: `U-${a}`,
    });
    mistakes.current = 0;
    started.current = Date.now();
    hints.reset();
    setFound(false);
    setItem(makeItem(spec, rand.current, item.target));
    busy.current = false;
  };

  registerTest({
    solve: () => void choose(item.target),
    fail: () => {
      const other = item.shadows.find((a) => a !== item.target);
      if (other) void choose(other);
    },
  });

  /** the animal was dropped at page point (x, y): the shadow under it, if any */
  const dropAt = (x: number, y: number) => {
    const hit = document
      .elementsFromPoint(x, y)
      .map((el) => (el as HTMLElement).closest?.('[data-shadow]') as HTMLElement | null)
      .find(Boolean);
    const id = hit?.dataset.shadow as AnimalId | undefined;
    if (id) void choose(id);
  };

  const errorless = hints.rung >= 4;
  const many = item.shadows.length;
  const shadowSize = many <= 3 ? 170 : many === 4 ? 150 : 130;
  const name = (a: AnimalId) =>
    textOf(`anim.${a}` as LineId, level.lang)
      .replace(/^(Un|O|A|An) /, '')
      .replace('!', '');

  return (
    <div className="flex h-full items-center justify-center gap-10 px-6 pb-6 portrait:flex-col portrait:gap-8">
      <div className="grid size-[300px] place-items-center rounded-[3rem] border-4 border-ink/70 bg-white/80 shadow-[0_8px_0_rgba(59,42,74,0.25)]">
        {!found && (
          <motion.div
            key={item.target}
            data-testid="animal"
            drag
            dragSnapToOrigin
            dragElastic={0.6}
            whileDrag={{ scale: 1.08 }}
            onDragEnd={(_, info) => dropAt(info.point.x - window.scrollX, info.point.y - window.scrollY)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="cursor-grab touch-none"
          >
            <Emoji name={ANIMALS[item.target].emoji} size={230} label={name(item.target)} />
          </motion.div>
        )}
      </div>
      <div className="flex max-w-[760px] flex-wrap items-center justify-center gap-5" data-testid="shadows">
        {item.shadows.map((a) => {
          const right = a === item.target;
          const lit = found && right;
          const glow = hints.rung >= 2 && right;
          const faded = errorless && !right;
          return (
            <motion.button
              key={`${item.target}-${a}`}
              type="button"
              data-shadow={a}
              data-testid={right ? 'shadow-right' : 'shadow'}
              aria-label={lit ? name(a) : t('umbre.shadow')}
              disabled={faded}
              onClick={() => void choose(a)}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={
                wrong === a
                  ? { scale: 1, opacity: 1, x: [0, -12, 12, -8, 8, 0] }
                  : { scale: glow && hints.rung >= 3 ? [1, 1.1, 1] : 1, opacity: faded ? 0.2 : 1, x: 0 }
              }
              transition={
                wrong === a
                  ? { duration: 0.4 }
                  : { scale: { duration: 1, repeat: glow && hints.rung >= 3 ? Number.POSITIVE_INFINITY : 0 } }
              }
              whileTap={{ scale: 0.93 }}
              className={`grid place-items-center rounded-[2.2rem] border-4 bg-[#efe9f6] touch-manipulation ${
                glow ? 'border-sun ring-8 ring-sun/70' : 'border-ink/30'
              }`}
              style={{ width: shadowSize + 30, height: shadowSize + 30 }}
            >
              <span
                className="block transition-[filter,opacity] duration-500"
                style={{ filter: lit ? 'none' : 'brightness(0)', opacity: lit ? 1 : 0.78 }}
              >
                <Emoji name={ANIMALS[a].emoji} size={shadowSize} />
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
