import { motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useMemo } from 'react';

export const INK = '#3b2a4a';
export const line = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
export const thin = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;

export type Mood = 'idle' | 'happy' | 'think' | 'wave';

export type CharacterProps = { size?: number; mood?: Mood; className?: string; title?: string };

/** Eyes that blink every few seconds (off with reduced motion). */
export function Blink({ children, cx, cy }: { children: ReactNode; cx: number; cy: number }) {
  const reduce = useReducedMotion();
  const delay = useMemo(() => 1 + Math.random() * 3, []);
  return (
    <motion.g
      style={{ originX: `${cx}px`, originY: `${cy}px` }}
      animate={reduce ? undefined : { scaleY: [1, 1, 0.08, 1] }}
      transition={{ duration: 4.5, times: [0, 0.9, 0.95, 1], repeat: Number.POSITIVE_INFINITY, delay }}
    >
      {children}
    </motion.g>
  );
}

export function Eye({ x, y, r = 8, iris = INK }: { x: number; y: number; r?: number; iris?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={iris} />
      <circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.32} fill="#fff" />
      <circle cx={x - r * 0.3} cy={y + r * 0.35} r={r * 0.15} fill="#fff" />
    </g>
  );
}

export function Blush({ x, y, rx = 9, ry = 5.5 }: { x: number; y: number; rx?: number; ry?: number }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#ff9fb0" opacity={0.65} />;
}

/** Whole-body motion for moods: a happy hop, a thinking tilt. */
export function Body({ mood, children }: { mood: Mood; children: ReactNode }) {
  const reduce = useReducedMotion();
  const anim =
    reduce || mood === 'idle' || mood === 'wave'
      ? { y: 0, rotate: 0 }
      : mood === 'happy'
        ? { y: [0, -14, 0, -8, 0], rotate: 0 }
        : { rotate: 6, y: 0 };
  return (
    <motion.g
      style={{ originX: '100px', originY: '190px' }}
      animate={anim}
      transition={mood === 'happy' ? { duration: 0.9, ease: 'easeOut' } : { type: 'spring', stiffness: 120 }}
    >
      {children}
    </motion.g>
  );
}

/** An arm that waves from its shoulder when mood = wave. */
export function Arm({ mood, ox, oy, children }: { mood: Mood; ox: number; oy: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.g
      style={{ originX: `${ox}px`, originY: `${oy}px` }}
      animate={mood === 'wave' && !reduce ? { rotate: [0, -35, -10, -35, 0] } : { rotate: 0 }}
      transition={{ duration: 1.4, ease: 'easeInOut' }}
    >
      {children}
    </motion.g>
  );
}

export function Svg({
  size = 160,
  className,
  title,
  children,
}: {
  size?: number;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      overflow="visible"
    >
      {children}
    </svg>
  );
}
