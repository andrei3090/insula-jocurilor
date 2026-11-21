import { motion } from 'motion/react';

/** Round progress as a string of beads: no numbers, no timer. */
export function Beads({ total, done }: { total: number; done: number }) {
  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
    >
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          data-testid={i < done ? 'bead-done' : 'bead'}
          className={`block size-7 rounded-full border-[3px] border-ink/70 ${i < done ? 'bg-sun' : 'bg-white/70'}`}
          animate={i === done ? { scale: [1, 1.18, 1] } : { scale: i < done ? 1.05 : 1 }}
          transition={i === done ? { duration: 1.2, repeat: Number.POSITIVE_INFINITY } : { type: 'spring' }}
        />
      ))}
    </div>
  );
}
