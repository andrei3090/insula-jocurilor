import { motion } from 'motion/react';
import { useEffect } from 'react';
import { Pufi } from '../art/Pufi';
import { voice } from '../audio/voice';
import { useSession } from '../core/session';
import { LockButton } from '../ui/ParentGate';

/** Calm "time for a break" screen after the parent-set limit. No guilt, no pleading. */
export function BreakScreen({ onParentDismiss }: { onParentDismiss(): void }) {
  useEffect(() => {
    void voice.say('break.time');
  }, []);
  return (
    <motion.div
      data-testid="break"
      className="absolute inset-0 z-[55] grid place-items-center bg-gradient-to-b from-sky to-paper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex flex-col items-center gap-4">
        <Pufi size={260} mood="wave" />
        <p className="text-4xl font-semibold">Pauză!</p>
        <p className="max-w-md text-center text-xl text-ink/70">
          Ne-am jucat frumos. Mișcă-te puțin și bea un pahar cu apă.
        </p>
      </div>
      <div className="absolute bottom-6 right-6">
        <LockButton
          onUnlock={() => {
            useSession.getState().snooze(15);
            onParentDismiss();
          }}
        />
      </div>
    </motion.div>
  );
}
