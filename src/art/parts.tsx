import { motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useMemo } from 'react';

export const INK = '#3b2a4a';
export const line = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
export const thin = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;

export type Mood = 'idle' | 'happy' | 'think' | 'wave';

export type CharacterProps = { size?: number; mood?: Mood; className?: string; title?: string };

/** Eyes that blink every few seconds (off with reduced motion). */
export function Blink({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const delay = useMemo(() => 1 + Math.random() * 3, []);
  return (
    <motion.g
      data-part="eyes"
      style={{ originX: 0.5, originY: 0.5 }}
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
      style={{ originX: 0.5, originY: 1 }}
      animate={anim}
      transition={mood === 'happy' ? { duration: 0.9, ease: 'easeOut' } : { type: 'spring', stiffness: 120 }}
    >
      {children}
    </motion.g>
  );
}

/**
 * An arm that waves from its shoulder when mood = wave.
 * `origin` is the shoulder as a fraction of the arm's own box (motion pivots SVG on fill-box).
 */
export function Arm({
  mood,
  origin = [0.25, 0.08],
  children,
}: {
  mood: Mood;
  origin?: [number, number];
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.g
      data-part="arm"
      data-origin={origin.join(',')}
      style={{ originX: origin[0], originY: origin[1] }}
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
