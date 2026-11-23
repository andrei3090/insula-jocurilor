import { COLORS, type Token } from './logic';

const PATHS: Record<Token['shape'], string> = {
  circle: 'M50 12 A38 38 0 1 1 49.9 12 Z',
  square: 'M16 16 H84 V84 H16 Z',
  triangle: 'M50 12 L88 84 H12 Z',
  star: 'M50 8 L61 37 L92 38 L67 57 L76 88 L50 70 L24 88 L33 57 L8 38 L39 37 Z',
  heart: 'M50 86 C20 64 8 48 12 32 C16 16 38 12 50 30 C62 12 84 16 88 32 C92 48 80 64 50 86 Z',
};

/** One pattern piece: a coloured shape with a dark outline and a little shine. */
export function ShapeArt({ token, size }: { token: Token; size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <path
        d={PATHS[token.shape]}
        fill={COLORS[token.color]}
        stroke="#3b2a4a"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <ellipse cx="38" cy="36" rx="8" ry="5" fill="#fff" opacity="0.55" transform="rotate(-30 38 36)" />
    </svg>
  );
}
