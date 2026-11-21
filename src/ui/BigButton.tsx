import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { sfx } from '../audio/sfx';

export type Tone = 'lagoon' | 'sun' | 'coral' | 'bamboo' | 'cave' | 'castle' | 'white';

const TONES: Record<Tone, string> = {
  lagoon: 'bg-lagoon text-white',
  sun: 'bg-sun text-ink',
  coral: 'bg-coral text-white',
  bamboo: 'bg-bamboo text-ink',
  cave: 'bg-cave text-ink',
  castle: 'bg-castle text-ink',
  white: 'bg-white text-ink',
};

type Props = {
  label: string;
  onPress(): void;
  children: ReactNode;
  /** min width and height in CSS px (≥ 104 for ages ≤ 6) */
  size?: number;
  tone?: Tone;
  round?: boolean;
  className?: string;
  disabled?: boolean;
  silent?: boolean;
  testId?: string;
};

/** A big, squishy button: reacts instantly, never needs reading. */
export function BigButton({
  label,
  onPress,
  children,
  size = 104,
  tone = 'white',
  round,
  className,
  disabled,
  silent,
  testId,
}: Props) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      onClick={() => {
        if (!silent) sfx.tap();
        onPress();
      }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      style={{ minWidth: size, minHeight: size }}
      className={`grid select-none place-items-center border-4 border-ink/80 shadow-[0_6px_0_rgba(59,42,74,0.35)] disabled:opacity-40 ${
        round ? 'rounded-full' : 'rounded-[2rem]'
      } ${TONES[tone]} ${className ?? ''}`}
    >
      {children}
    </motion.button>
  );
}
