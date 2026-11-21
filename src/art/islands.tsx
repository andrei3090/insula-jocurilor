import type { IslandId } from '../core/types';
import { line, thin } from './parts';

const Sand = ({ d }: { d?: string }) => (
  <>
    <ellipse cx={120} cy={128} rx={112} ry={26} fill="#7fd8ea" opacity={0.55} />
    <path
      d={d ?? 'M18 124 Q30 92 80 88 Q120 80 160 88 Q214 92 222 124 Q120 146 18 124 Z'}
      fill="#ffe3a8"
      {...line}
    />
  </>
);

function Bamboo({ x, h, tilt = 0 }: { x: number; h: number; tilt?: number }) {
  const nodes = Array.from({ length: Math.floor(h / 18) }, (_, i) => 112 - (i + 1) * 18);
  return (
    <g transform={`rotate(${tilt} ${x} 112)`}>
      <rect x={x - 6} y={112 - h} width={12} height={h} rx={6} fill="#8fd16a" {...thin} />
      {nodes.map((y) => (
        <path key={y} d={`M${x - 6} ${y} H${x + 6}`} {...thin} strokeWidth={2.5} />
      ))}
      <path
        d={`M${x + 5} ${116 - h * 0.6} q16 -8 24 2 q-14 6 -24 -2z`}
        fill="#6fbf4a"
        {...thin}
        strokeWidth={2.5}
      />
      <path
        d={`M${x - 5} ${116 - h * 0.85} q-16 -8 -24 2 q14 6 24 -2z`}
        fill="#6fbf4a"
        {...thin}
        strokeWidth={2.5}
      />
    </g>
  );
}

const ART: Record<IslandId, () => React.ReactElement> = {
  bambus: () => (
    <>
      <Sand d="M18 124 Q28 86 84 82 Q120 74 158 82 Q214 88 222 124 Q120 146 18 124 Z" />
      <path d="M40 112 Q60 78 120 76 Q182 78 200 112 Q120 126 40 112 Z" fill="#9edc7a" {...thin} />
      <Bamboo x={70} h={70} tilt={-6} />
      <Bamboo x={96} h={92} />
      <Bamboo x={150} h={82} tilt={5} />
      <Bamboo x={176} h={58} tilt={8} />
    </>
  ),
  pestera: () => (
    <>
      <Sand />
      <path d="M44 116 Q52 40 120 34 Q190 40 198 116 Z" fill="#b39ddb" {...line} />
      <path d="M90 116 Q92 74 120 72 Q148 74 150 116 Z" fill="#4a3a63" {...thin} />
      <path d="M62 116 l8 -26 l8 26z M162 116 l8 -30 l8 30z" fill="#e5dbff" {...thin} strokeWidth={2.5} />
      <path d="M104 52 l6 -16 l6 16z M128 56 l5 -12 l5 12z" fill="#f3edff" {...thin} strokeWidth={2.5} />
      <circle cx={112} cy={100} r={3} fill="#ffd166" />
      <circle cx={128} cy={100} r={3} fill="#ffd166" />
    </>
  ),
  castel: () => (
    <>
      <Sand />
      <rect x={70} y={60} width={100} height={56} fill="#f8bbd0" {...line} />
      <rect x={56} y={44} width={26} height={72} fill="#fbd0df" {...line} />
      <rect x={158} y={44} width={26} height={72} fill="#fbd0df" {...line} />
      <rect x={106} y={30} width={28} height={86} fill="#fbd0df" {...line} />
      <path d="M52 46 L69 14 L86 46 Z M154 46 L171 14 L188 46 Z" fill="#b39ddb" {...line} />
      <path d="M102 32 L120 0 L138 32 Z" fill="#cfaef0" {...line} />
      <path d="M120 0 v-10 l12 5 l-12 5" fill="#ff8a80" {...thin} strokeWidth={2.5} />
      <path d="M108 116 V94 Q120 80 132 94 V116 Z" fill="#a785d8" {...thin} />
      <circle cx={120} cy={56} r={8} fill="#fff" {...thin} />
      <path d="M120 50 V56 L124 58" fill="none" {...thin} strokeWidth={2} />
      <ellipse cx={200} cy={112} rx={16} ry={12} fill="#ffa24c" {...thin} />
      <path d="M200 100 q2 -6 6 -6" fill="none" stroke="#5aa83a" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  laguna: () => (
    <>
      <Sand />
      <path d="M166 116 Q160 74 150 44" fill="none" stroke="#a9744a" strokeWidth={8} strokeLinecap="round" />
      <path
        d="M150 44 q-30 -6 -40 14 q24 -10 40 -14z M150 44 q30 -8 40 12 q-24 -8 -40 -12z M150 44 q-4 -26 14 -34 q-6 18 -14 34z"
        fill="#5aa83a"
        {...thin}
      />
      <path d="M44 116 q30 10 64 0 q-6 -10 -64 0z" fill="#ff7b6b" {...thin} />
      <path d="M48 112 h56" stroke="#fff" strokeWidth={3} />
      <path
        d="M108 120 l4 -8 l4 8 l8 1 l-6 5 l2 8 l-8 -4 l-8 4 l2 -8 l-6 -5z"
        fill="#ff8a80"
        {...thin}
        strokeWidth={2}
      />
      {[
        [40, 24],
        [80, 12],
        [206, 30],
      ].map(([x, y]) => (
        <path
          key={x}
          d={`M${x} ${y - 7} l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z`}
          fill="#ffd166"
          {...thin}
          strokeWidth={1.5}
        />
      ))}
    </>
  ),
  atelier: () => (
    <>
      <Sand />
      <path d="M40 104 A80 80 0 0 1 200 104" fill="none" stroke="#ff8a80" strokeWidth={8} />
      <path d="M50 104 A70 70 0 0 1 190 104" fill="none" stroke="#ffd166" strokeWidth={8} />
      <path d="M60 104 A60 60 0 0 1 180 104" fill="none" stroke="#8fd16a" strokeWidth={8} />
      <path d="M70 104 A50 50 0 0 1 170 104" fill="none" stroke="#7cc7f2" strokeWidth={8} />
      <path d="M96 116 L110 52 M144 116 L130 52" stroke="#a9744a" strokeWidth={6} strokeLinecap="round" />
      <rect x={96} y={50} width={48} height={40} rx={4} fill="#fff" {...thin} />
      <path
        d="M104 80 q10 -20 20 -4 q6 8 14 -6"
        fill="none"
        stroke="#ff7b6b"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d="M160 110 q-6 -20 16 -22 q22 0 20 16 q-2 8 -12 6 q-8 -2 -8 6 q0 6 -16 -6z"
        fill="#ffe8c2"
        {...thin}
      />
      <circle cx={170} cy={96} r={3.5} fill="#ff5f6d" />
      <circle cx={180} cy={92} r={3.5} fill="#4cc9f0" />
      <circle cx={189} cy={98} r={3.5} fill="#6fd36f" />
    </>
  ),
};

export function IslandArt({ id, width = 240 }: { id: IslandId; width?: number }) {
  const Art = ART[id];
  return (
    <svg
      viewBox="0 -12 240 162"
      width={width}
      height={(width * 162) / 240}
      aria-hidden="true"
      overflow="visible"
    >
      <Art />
    </svg>
  );
}
