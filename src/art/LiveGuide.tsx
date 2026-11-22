import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import type { Avatar } from '../core/profile';
import { GUIDES } from './guides';
import { GIGGLE_HZ, GUIDE_NAMES, LINE_EVERY_MS, REACTION_MS, reactionAt, tapLine } from './live';
import type { Mood } from './parts';

/**
 * A guide that comes alive when tapped: it hops, waves or dances (in turn), giggles, and on the island
 * screens also says a short line. `mood` is what the screen wants when nobody is tapping.
 * In games `speak` stays off, so a tap never talks over an instruction.
 */
export function LiveGuide({
  who,
  size,
  mood = 'idle',
  speak = false,
  className,
}: {
  who: Avatar;
  size: number;
  mood?: Mood;
  speak?: boolean;
  className?: string;
}) {
  const C = GUIDES[who];
  const [reacting, setReacting] = useState<Mood | null>(null);
  const n = useRef(0);
  const lastLine = useRef(0);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const react = () => {
    if (busy.current) return;
    busy.current = true;
    let k = n.current++;
    // a reaction equal to the resting mood would show nothing: take the next one
    if (reactionAt(k) === mood) k = n.current++;
    const r = reactionAt(k);
    setReacting(r);
    sfx.giggle(GIGGLE_HZ[who]);
    if (speak && Date.now() - lastLine.current > LINE_EVERY_MS) {
      lastLine.current = Date.now();
      void voice.say(tapLine(who, k));
    }
    timer.current = setTimeout(() => {
      busy.current = false;
      setReacting(null);
    }, REACTION_MS[r]);
  };

  const shown = reacting ?? mood;
  return (
    <button
      type="button"
      aria-label={GUIDE_NAMES[who]}
      data-testid={`live-${who}`}
      data-mood={shown}
      onClick={react}
      className={`inline-block touch-manipulation rounded-full outline-none ${className ?? ''}`}
    >
      <C size={size} mood={shown} />
    </button>
  );
}
