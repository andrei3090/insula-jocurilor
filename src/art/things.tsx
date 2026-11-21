/** Bowl, chair and bed for the three bears (original art). `s` scales the drawing (0.5–1). */
const st = { stroke: '#3b2a4a', strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;

export function Bowl({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 100" width={size} height={(size * 100) / 120} aria-hidden="true">
      <ellipse cx={60} cy={42} rx={50} ry={12} fill="#fff1c9" {...st} />
      <path d="M10 42 Q14 86 60 88 Q106 86 110 42" fill="#ff8a80" {...st} />
      <path d="M26 58 Q60 70 94 58" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      <path d="M80 34 L104 6" {...st} strokeWidth={6} />
      <ellipse cx={60} cy={40} rx={38} ry={7} fill="#f5d48b" />
    </svg>
  );
}

export function Chair({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 120" width={(size * 100) / 120} height={size} aria-hidden="true">
      <rect x={20} y={6} width={60} height={56} rx={10} fill="#7cc7f2" {...st} />
      <circle cx={50} cy={34} r={9} fill="#ffd166" {...st} strokeWidth={3} />
      <rect x={12} y={60} width={76} height={16} rx={6} fill="#c98a55" {...st} />
      <path d="M22 76 V114 M78 76 V114" {...st} strokeWidth={7} />
    </svg>
  );
}

export function Bed({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 140 100" width={size} height={(size * 100) / 140} aria-hidden="true">
      <rect x={8} y={16} width={22} height={74} rx={6} fill="#c98a55" {...st} />
      <rect x={110} y={40} width={22} height={50} rx={6} fill="#c98a55" {...st} />
      <rect x={24} y={50} width={96} height={26} rx={8} fill="#b39ddb" {...st} />
      <ellipse cx={44} cy={46} rx={16} ry={9} fill="#fff" {...st} strokeWidth={3} />
      <path d="M62 50 H116" stroke="#fff" strokeWidth={4} strokeDasharray="6 6" />
    </svg>
  );
}

export const THINGS = { bowl: Bowl, chair: Chair, bed: Bed } as const;
