/** Simple UI icons drawn to match the characters' style. */
const s = { stroke: '#3b2a4a', strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;

export const HouseIcon = ({ size = 56 }: { size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <path d="M8 30 L32 10 L56 30" fill="none" {...s} />
    <path d="M14 26 V54 H50 V26" fill="#ffd166" {...s} />
    <path d="M27 54 V40 H37 V54" fill="#ff8a80" {...s} />
  </svg>
);

export const SpeakerIcon = ({ size = 56 }: { size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <path d="M10 24 H22 L36 12 V52 L22 40 H10 Z" fill="#4cc9c0" {...s} />
    <path d="M44 22 Q52 32 44 42 M50 14 Q64 32 50 50" fill="none" {...s} />
  </svg>
);

export const CheckIcon = ({ size = 56, color = '#fff' }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <path d="M14 34 L27 47 L51 18" fill="none" {...s} strokeWidth={8} stroke={color} />
  </svg>
);

export const CrossIcon = ({ size = 56 }: { size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <path d="M18 18 L46 46 M46 18 L18 46" fill="none" {...s} strokeWidth={8} stroke="#fff" />
  </svg>
);

export const AgainIcon = ({ size = 56 }: { size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <path d="M48 22 A20 20 0 1 0 52 38" fill="none" {...s} strokeWidth={6} />
    <path d="M40 22 H50 V12" fill="none" {...s} strokeWidth={6} />
  </svg>
);

export const BookIcon = ({ size = 56 }: { size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <path d="M8 14 Q20 8 32 16 Q44 8 56 14 V52 Q44 46 32 54 Q20 46 8 52 Z" fill="#f8bbd0" {...s} />
    <path d="M32 16 V54" {...s} />
    <circle cx={20} cy={28} r={4} fill="#ffd166" />
    <circle cx={44} cy={30} r={4} fill="#8fd16a" />
  </svg>
);

export const LockIcon = ({ size = 36 }: { size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <path d="M20 28 V20 A12 12 0 0 1 44 20 V28" fill="none" {...s} />
    <rect x={14} y={28} width={36} height={26} rx={6} fill="#b39ddb" {...s} />
  </svg>
);

export const TrashIcon = ({ size = 40 }: { size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <path d="M14 18 H50 M26 18 V12 H38 V18 M18 18 L22 54 H42 L46 18" fill="#ffe3a8" {...s} />
  </svg>
);
