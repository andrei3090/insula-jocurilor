import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/** The big letter / digit, appearing with a little magic. Tapping it says it again. */
export function GlyphCard({
  glyph,
  onPress,
  children,
  color = '#4cc9c0',
  testId,
}: {
  glyph: string;
  onPress(): void;
  children?: ReactNode;
  color?: string;
  testId?: string;
}) {
  return (
    <motion.button
      key={glyph}
      type="button"
      aria-label={`Litera sau cifra ${glyph}, atinge s-o auzi`}
      data-testid={testId}
      onClick={onPress}
      initial={{ scale: 0.3, rotate: -15, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
      whileTap={{ scale: 0.94 }}
      className="relative flex min-h-[250px] min-w-[230px] flex-col items-center justify-center rounded-[2.5rem] border-4 border-ink/80 px-6 py-3 shadow-[0_8px_0_rgba(59,42,74,0.3)]"
      style={{ background: color }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute text-2xl"
          style={{ left: `${10 + i * 20}%`, top: i % 2 ? '6%' : '84%' }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 1.6, delay: i * 0.25, repeat: 1 }}
          aria-hidden="true"
        >
          ✦
        </motion.span>
      ))}
      <span className="font-school text-[150px] leading-none font-bold text-white drop-shadow-[0_4px_0_rgba(59,42,74,0.6)]">
        {glyph}
      </span>
      {children}
    </motion.button>
  );
}
