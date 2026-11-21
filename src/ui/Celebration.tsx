import confetti from 'canvas-confetti';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { Emoji, type EmojiName } from '../art/Emoji';
import { Pufi } from '../art/Pufi';
import { BigButton } from './BigButton';
import { AgainIcon, HouseIcon } from './icons';

const COLORS = ['#ffd166', '#ff8a80', '#4cc9c0', '#8fd16a', '#b39ddb', '#f8bbd0'];

/** A short burst of stars (1 s) after a good answer. Re-mount with a new key to replay. */
export function StarBurst({ x = '50%', y = '45%' }: { x?: string; y?: string }) {
  const reduce = useReducedMotion();
  const stars = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        a: (i / 10) * Math.PI * 2,
        d: 90 + Math.random() * 70,
        c: COLORS[i % COLORS.length],
      })),
    [],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute z-30" style={{ left: x, top: y }} aria-hidden="true">
      {stars.map((s, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          width={34}
          height={34}
          className="absolute -left-[17px] -top-[17px]"
          initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
          animate={{ x: Math.cos(s.a) * s.d, y: Math.sin(s.a) * s.d, scale: 1, opacity: 0, rotate: 180 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <path
            d="M12 2 l3 7 7 .6 -5.4 4.6 1.7 7 -6.3 -3.9 -6.3 3.9 1.7 -7 L2 9.6 9 9z"
            fill={s.c}
            stroke="#3b2a4a"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </motion.svg>
      ))}
    </div>
  );
}

/** End of a round: confetti, the new sticker, "again" or "home". */
export function RoundEnd({
  sticker,
  onAgain,
  onHome,
}: {
  sticker: EmojiName | null;
  onAgain(): void;
  onHome(): void;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const end = Date.now() + 900;
    const shoot = () => {
      confetti({
        particleCount: 40,
        spread: 80,
        origin: { x: 0.2, y: 0.7 },
        colors: COLORS,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 40,
        spread: 80,
        origin: { x: 0.8, y: 0.7 },
        colors: COLORS,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) setTimeout(shoot, 300);
    };
    shoot();
  }, [reduce]);
  return (
    <motion.div
      data-testid="round-end"
      className="absolute inset-0 z-50 grid place-items-center bg-ink/35 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="flex flex-col items-center gap-4 rounded-[3rem] border-4 border-ink/80 bg-paper px-10 py-8 shadow-2xl"
        initial={{ scale: 0.6, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      >
        <div className="flex items-end gap-6">
          <Pufi size={150} mood="happy" />
          {sticker && (
            <motion.div
              className="relative grid size-40 place-items-center rounded-full border-4 border-ink/80 bg-sun"
              initial={{ rotate: -30, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 220, damping: 12 }}
            >
              <Emoji name={sticker} size={110} label="Abțibild nou" />
            </motion.div>
          )}
        </div>
        <div className="flex gap-6">
          <BigButton label="Încă o dată" tone="lagoon" onPress={onAgain} testId="again">
            <AgainIcon size={60} />
          </BigButton>
          <BigButton label="Înapoi pe insulă" tone="sun" onPress={onHome} testId="round-home">
            <HouseIcon size={60} />
          </BigButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
