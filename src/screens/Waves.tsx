import { motion, useReducedMotion } from 'motion/react';

/** Gentle layered sea waves at the bottom of a screen. */
export function Waves({ color = '#4cc9c0' }: { color?: string }) {
  const reduce = useReducedMotion();
  const layers = [
    { y: 0, o: 0.35, d: 9 },
    { y: 18, o: 0.55, d: 7 },
    { y: 36, o: 0.9, d: 5.5 },
  ];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden" aria-hidden="true">
      {layers.map((l, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="absolute bottom-0 h-28 w-[200%]"
          style={{ bottom: -l.y / 2 }}
          animate={reduce ? undefined : { x: ['0%', '-50%'] }}
          transition={{ duration: l.d, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
        >
          <path
            d="M0 60 Q75 30 150 60 T300 60 T450 60 T600 60 T750 60 T900 60 T1050 60 T1200 60 V120 H0 Z"
            fill={color}
            opacity={l.o}
          />
        </motion.svg>
      ))}
    </div>
  );
}
