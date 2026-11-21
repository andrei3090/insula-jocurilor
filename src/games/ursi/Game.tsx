import { LayoutGroup, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Bruno } from '../../art/Bruno';
import type { Mood } from '../../art/parts';
import { THINGS } from '../../art/things';
import { sfx } from '../../audio/sfx';
import { randomSeed, rng } from '../../core/rng';
import type { GameProps } from '../../core/types';
import { DemoHand } from '../../ui/DemoHand';
import type { LineId } from '../../voice/lines';
import { isNextInOrder, makeItem, matchOk, type UrsiItem, type UrsiSkill } from './logic';

const BEARS = [
  { size: 2, px: 200, line: 'ursi.big' as LineId, label: 'Ursul cel mare' },
  { size: 1, px: 160, line: 'ursi.mid' as LineId, label: 'Ursul mijlociu' },
  { size: 0, px: 118, line: 'ursi.small' as LineId, label: 'Ursul cel mic' },
];
const scaleFor = (size: number, n: number) => 0.5 + (0.5 * size) / Math.max(1, n - 1);
const promptFor = (it: UrsiItem): LineId =>
  it.mode === 'order' ? 'ursi.order' : (`ursi.match.${it.thing}` as LineId);

export default function UrsiGame({ level, onItem, voice, hints, registerTest }: GameProps) {
  const skill = level.skill as UrsiSkill;
  const rand = useRef(rng(randomSeed()));
  const [item, setItem] = useState<UrsiItem>(() => makeItem(skill, rand.current));
  const [placed, setPlaced] = useState<number[]>([]); // sizes already placed
  const [selected, setSelected] = useState<number | null>(null);
  const [shake, setShake] = useState<number | null>(null);
  const [moods, setMoods] = useState<Record<number, Mood>>({});
  const mistakes = useRef(0);
  const started = useRef(Date.now());
  const area = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState<{ from: { x: number; y: number }; to?: { x: number; y: number } } | null>(
    null,
  );
  const Thing = THINGS[item.thing];
  const n = item.sizes.length;
  const remaining = item.sizes.filter((s) => !placed.includes(s));
  const target = item.mode === 'order' ? Math.min(...remaining) : (selected ?? Math.min(...remaining));

  // biome-ignore lint/correctness/useExhaustiveDependencies: prompt per item
  useEffect(() => {
    void voice.prompt(promptFor(item));
  }, [item]);

  useEffect(() => {
    if (hints.rung !== 3 || !area.current) return;
    const a = area.current.getBoundingClientRect();
    const obj = area.current.querySelector(`[data-size="${target}"]`)?.getBoundingClientRect();
    const dst = area.current
      .querySelector(item.mode === 'match' ? `[data-bear="${target}"]` : '[data-slot="next"]')
      ?.getBoundingClientRect();
    if (obj && dst)
      setDemo({
        from: { x: obj.left - a.left + obj.width / 2, y: obj.top - a.top + obj.height / 2 },
        to: { x: dst.left - a.left + dst.width / 2, y: dst.top - a.top + dst.height / 2 },
      });
  }, [hints.rung, target, item.mode]);

  const miss = (size: number) => {
    mistakes.current += 1;
    setShake(size);
    setTimeout(() => setShake(null), 450);
    hints.next();
  };

  const place = async (size: number) => {
    const next = [...placed, size];
    setPlaced(next);
    setSelected(null);
    setDemo(null);
    sfx.pop();
    if (item.mode === 'match') {
      setMoods((m) => ({ ...m, [size]: 'happy' }));
      void voice.say(BEARS.find((b) => b.size === size)!.line);
    }
    if (next.length === n) {
      await new Promise((r) => setTimeout(r, 700));
      await onItem({
        skill,
        correct: mistakes.current === 0,
        hintsUsed: hints.rung,
        ms: Date.now() - started.current,
      });
      mistakes.current = 0;
      started.current = Date.now();
      hints.reset();
      setPlaced([]);
      setMoods({});
      setItem(makeItem(skill, rand.current, item.thing));
    }
  };

  const tapObject = (size: number) => {
    if (placed.includes(size)) return;
    if (item.mode === 'order') {
      if (isNextInOrder(item.sizes, placed, size)) void place(size);
      else miss(size);
      return;
    }
    sfx.tap();
    setSelected(size);
  };

  const tapBear = (bearSize: number) => {
    if (item.mode !== 'match' || selected === null || placed.includes(bearSize)) return;
    if (matchOk(selected, bearSize)) void place(selected);
    else miss(selected);
  };

  const dropOn = (size: number, x: number, y: number) => {
    const el = document
      .elementsFromPoint(x, y)
      .find(
        (e) =>
          (e as HTMLElement).dataset?.bear !== undefined || (e as HTMLElement).dataset?.slot !== undefined,
      ) as HTMLElement | undefined;
    if (!el) return;
    if (item.mode === 'match') {
      const b = Number(el.dataset.bear);
      if (Number.isNaN(b)) return;
      if (matchOk(size, b)) void place(size);
      else miss(size);
    } else tapObject(size);
  };

  registerTest({
    solve: () => {
      void (async () => {
        for (const s of [...remaining].sort((a, b) => a - b)) await place(s);
      })();
    },
    fail: () => {
      const wrong = item.mode === 'order' ? Math.max(...remaining) : remaining[0];
      if (item.mode === 'order') miss(wrong);
      else {
        setSelected(wrong);
        miss(wrong);
      }
    },
  });

  const errorless = hints.rung >= 4;

  return (
    <div ref={area} className="relative flex h-full flex-col items-center justify-around px-6 pb-4">
      <LayoutGroup>
        {/* the objects */}
        <div className="flex min-h-[170px] items-end justify-center gap-6">
          {item.sizes.map((size) => {
            if (placed.includes(size) && item.mode === 'order')
              return <div key={size} style={{ width: 150 * scaleFor(size, n) }} />;
            if (placed.includes(size)) return <div key={size} className="w-[150px]" />;
            const glow = (hints.rung >= 2 && size === target) || selected === size;
            const dim = errorless && size !== target;
            return (
              <motion.button
                key={size}
                layoutId={`thing-${size}`}
                type="button"
                data-size={size}
                data-testid="thing"
                aria-label="obiect"
                disabled={dim}
                onClick={() => tapObject(size)}
                drag
                dragSnapToOrigin
                whileDrag={{ scale: 1.1, zIndex: 50 }}
                onDragEnd={(_, info) =>
                  dropOn(size, info.point.x - window.scrollX, info.point.y - window.scrollY)
                }
                animate={
                  shake === size ? { x: [0, -12, 12, -8, 8, 0] } : { x: 0, y: selected === size ? -10 : 0 }
                }
                className={`grid min-h-[120px] min-w-[120px] place-items-end justify-center rounded-3xl p-2 ${glow ? 'bg-sun/60 ring-4 ring-sun' : ''} ${dim ? 'opacity-30' : ''}`}
              >
                <Thing size={150 * scaleFor(size, n)} />
              </motion.button>
            );
          })}
        </div>

        {item.mode === 'match' ? (
          <div className="flex items-end justify-center gap-10">
            {BEARS.map((b) => (
              <button
                key={b.size}
                type="button"
                data-bear={b.size}
                aria-label={b.label}
                onClick={() => tapBear(b.size)}
                className={`relative flex flex-col items-center rounded-3xl p-2 ${hints.rung >= 2 && selected !== null && b.size === selected ? 'bg-sun/50' : ''}`}
              >
                <Bruno size={b.px} mood={moods[b.size] ?? 'idle'} title={b.label} />
                <div className="flex h-[90px] items-end">
                  {placed.includes(b.size) && (
                    <motion.div layoutId={`thing-${b.size}`}>
                      <Thing size={150 * scaleFor(b.size, 3) * 0.7} />
                    </motion.div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-end gap-4 rounded-[2rem] bg-white/60 px-6 py-4" data-testid="slots">
              {Array.from({ length: n }, (_, i) => {
                const size = [...item.sizes].sort((a, b) => a - b)[i];
                const isPlaced = placed.includes(size);
                return (
                  <div
                    key={i}
                    data-slot={i === placed.length ? 'next' : i}
                    className={`grid min-h-[120px] min-w-[110px] place-items-end justify-center rounded-2xl border-4 border-dashed ${i === placed.length ? 'border-cave-deep' : 'border-ink/15'}`}
                  >
                    {isPlaced && (
                      <motion.div layoutId={`thing-${size}`}>
                        <Thing size={130 * scaleFor(size, n)} />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
            <svg viewBox="0 0 300 30" width={300} height={30} aria-hidden="true">
              <path
                d="M10 20 Q150 0 280 20"
                fill="none"
                stroke="#7e63b8"
                strokeWidth={5}
                strokeLinecap="round"
              />
              <path
                d="M268 10 L284 21 L266 28"
                fill="none"
                stroke="#7e63b8"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </LayoutGroup>
      {demo && hints.rung === 3 && <DemoHand from={demo.from} to={demo.to} />}
    </div>
  );
}
