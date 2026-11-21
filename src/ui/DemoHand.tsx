import { motion, useReducedMotion } from 'motion/react';

type P = { x: number; y: number };

/** An animated hand that shows the gesture: a tap at `from`, or a drag from `from` to `to`. Coordinates in px of the nearest positioned parent. */
export function DemoHand({ from, to, loops = 2 }: { from: P; to?: P; loops?: number }) {
  const reduce = useReducedMotion();
  const path = to
    ? { x: [from.x, from.x, to.x, to.x], y: [from.y, from.y, to.y, to.y], scale: [1, 0.85, 0.85, 1] }
    : { x: from.x, y: from.y, scale: [1, 0.8, 1, 0.8, 1] };
  return (
    <motion.div
      data-testid="demo-hand"
      className="pointer-events-none absolute left-0 top-0 z-40"
      initial={{ x: from.x, y: from.y, opacity: 0 }}
      animate={{ ...path, opacity: 1 }}
      transition={{ duration: reduce ? 0 : 1.6, repeat: loops - 1, repeatDelay: 0.4, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 64 64" width={72} height={72} style={{ translate: '-18px -6px' }} aria-hidden="true">
        <path
          d="M22 30 V10 a5 5 0 0 1 10 0 V28 V24 a5 5 0 0 1 10 0 V30 a5 5 0 0 1 10 0 V44 Q52 58 38 60 H32 Q22 60 16 50 L8 38 a5 5 0 0 1 8 -6 Z"
          fill="#fff6e8"
          stroke="#3b2a4a"
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}
