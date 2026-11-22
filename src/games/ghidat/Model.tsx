import { motion } from 'motion/react';
import type { Pt } from '../nisip/geometry';
import { type Drawing, regionsOf } from './drawings';

export const INK = '#3b2a4a';

export const toD = (pts: readonly Pt[], close = false) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(4)} ${p.y.toFixed(4)}`).join(' ') + (close ? ' Z' : '');

function Parts({ paths, color, width }: { paths: Pt[][]; color: string; width: number }) {
  return (
    <>
      {paths.map((p, i) =>
        p.length === 1 ? (
          <circle key={i} cx={p[0].x} cy={p[0].y} r={width * 0.9} fill={color} />
        ) : (
          <path
            key={i}
            d={toD(p)}
            fill="none"
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}
    </>
  );
}

/** The finished picture in its suggested colours; `current` makes that step's parts blink. */
export function DrawingModel({
  drawing,
  size,
  current,
}: {
  drawing: Drawing;
  size: number;
  current?: number;
}) {
  return (
    <svg viewBox="0 0 1 1" width={size} height={size} aria-hidden="true">
      {regionsOf(drawing).map((r, i) => (
        <path key={i} d={toD(r.pts, true)} fill={r.suggest} />
      ))}
      {drawing.steps.map((s, i) => (
        <g key={i} opacity={current !== undefined && i > current ? 0.35 : 1}>
          <Parts paths={s.paths} color={INK} width={0.02} />
        </g>
      ))}
      {current !== undefined && drawing.steps[current] && (
        <motion.g
          key={current}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY }}
        >
          <Parts paths={drawing.steps[current].paths} color="#ff5f6d" width={0.045} />
        </motion.g>
      )}
    </svg>
  );
}
