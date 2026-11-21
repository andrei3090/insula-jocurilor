import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

const COLORS = ['#ff8a80', '#7cc7f2', '#ffd166', '#8fd16a', '#cfaef0', '#ffb4c8'];

/** A big balloon choice (≥ 130 px). It pops when right, wobbles when wrong; it never moves around. */
export function Balloon({
  label,
  children,
  color = 0,
  onPress,
  state = 'idle',
  glow,
  faded,
  testId,
}: {
  label: string;
  children: ReactNode;
  color?: number;
  onPress(): void;
  state?: 'idle' | 'wrong' | 'popped';
  glow?: boolean;
  faded?: boolean;
  testId?: string;
}) {
  const c = COLORS[color % COLORS.length];
  return (
    <div className="relative grid h-[190px] w-[140px] place-items-start justify-center">
      <AnimatePresence>
        {state !== 'popped' ? (
          <motion.button
            type="button"
            aria-label={label}
            data-testid={testId}
            disabled={faded}
            onClick={onPress}
            initial={{ scale: 0, y: 30 }}
            animate={
              state === 'wrong'
                ? { rotate: [0, -12, 10, -6, 0], scale: 1, y: 0 }
                : { scale: 1, y: 0, rotate: 0 }
            }
            exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.25 } }}
            whileTap={{ scale: 0.9 }}
            className={`relative ${faded ? 'opacity-25' : ''}`}
          >
            <svg viewBox="0 0 140 190" width={140} height={190} aria-hidden="true">
              {glow && <ellipse cx={70} cy={66} rx={70} ry={74} fill="#ffd166" opacity={0.55} />}
              <path
                d="M70 128 q-6 24 6 40 q8 12 -4 20"
                fill="none"
                stroke="#3b2a4a"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <ellipse cx={70} cy={66} rx={58} ry={64} fill={c} stroke="#3b2a4a" strokeWidth={4} />
              <path
                d="M62 128 l8 -8 l8 8z"
                fill={c}
                stroke="#3b2a4a"
                strokeWidth={3}
                strokeLinejoin="round"
              />
              <ellipse
                cx={48}
                cy={38}
                rx={10}
                ry={16}
                fill="#fff"
                opacity={0.55}
                transform="rotate(-25 48 38)"
              />
            </svg>
            <span className="absolute inset-x-0 top-[14px] grid h-[104px] place-items-center font-school text-[72px] leading-none font-bold text-ink">
              {children}
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="pop"
            className="pointer-events-none absolute top-12 left-1/2"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <motion.span
                key={i}
                className="absolute block size-3 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
                initial={{ x: 0, y: 0 }}
                animate={{ x: Math.cos((i / 8) * Math.PI * 2) * 70, y: Math.sin((i / 8) * Math.PI * 2) * 70 }}
                transition={{ duration: 0.6 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
