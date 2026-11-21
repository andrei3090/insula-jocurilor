/** One bamboo stick (original). */
export function Bamboo({ height = 120, dim = false }: { height?: number; dim?: boolean }) {
  const w = height * 0.32;
  return (
    <svg
      viewBox="0 0 40 130"
      width={w}
      height={height}
      aria-hidden="true"
      style={{ opacity: dim ? 0.35 : 1 }}
    >
      <rect x={12} y={6} width={16} height={120} rx={8} fill="#8fd16a" stroke="#3b2a4a" strokeWidth={3.5} />
      <path d="M12 46 H28 M12 86 H28" stroke="#3b2a4a" strokeWidth={3} />
      <path d="M16 14 V40 M16 52 V80" stroke="#c6f0a8" strokeWidth={3} strokeLinecap="round" />
      <path
        d="M27 60 q12 -10 12 -26 q-12 6 -12 26z"
        fill="#5aa83a"
        stroke="#3b2a4a"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Basket({ width = 260 }: { width?: number }) {
  return (
    <svg viewBox="0 0 260 120" width={width} height={(width * 120) / 260} aria-hidden="true">
      <path
        d="M10 30 H250 L228 112 H32 Z"
        fill="#e0a56a"
        stroke="#3b2a4a"
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <path d="M20 54 H240 M26 78 H234 M30 100 H230" stroke="#b97b45" strokeWidth={5} />
      <path d="M70 30 L60 112 M130 30 V112 M190 30 L200 112" stroke="#b97b45" strokeWidth={5} />
      <rect x={4} y={20} width={252} height={18} rx={9} fill="#c98a55" stroke="#3b2a4a" strokeWidth={5} />
    </svg>
  );
}
