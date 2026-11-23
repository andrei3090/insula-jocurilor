import { motion } from 'motion/react';
import { useEffect } from 'react';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { type LevelState, MAX_LEVEL } from '../core/levels';
import { useT } from '../i18n/ui';
import { BigButton } from './BigButton';
import { CrossIcon, LockIcon, StarIcon } from './icons';

/** The 50 levels of a game as stones on a path: open ones in colour with their stars, locked ones grey. */
export function LevelPath({
  state,
  playing,
  onPick,
  onClose,
}: {
  state: LevelState;
  playing: number;
  onPick(n: number): void;
  onClose(): void;
}) {
  const t = useT();
  useEffect(() => {
    void voice.say('level.choose');
  }, []);
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col bg-ink/40 p-4 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="level-path"
    >
      <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col rounded-[2.5rem] border-4 border-ink/80 bg-paper p-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-4xl font-semibold">{t('level.path')}</h2>
          <BigButton
            label={t('level.close')}
            tone="coral"
            size={88}
            round
            onPress={onClose}
            testId="level-close"
          >
            <CrossIcon size={44} />
          </BigButton>
        </div>
        <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3 overflow-y-auto p-2">
          {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((n) => {
            const open = n <= state.unlocked;
            const stars = state.stars[n] ?? 0;
            const here = n === playing;
            return (
              <button
                key={n}
                type="button"
                data-testid={`level-${n}`}
                data-open={open}
                aria-label={
                  open ? `${t('level', { n })}, ${t('level.stars', { n: stars })}` : t('level.locked', { n })
                }
                onClick={() => {
                  if (!open) {
                    sfx.boop();
                    void voice.say('level.locked', 'now');
                    return;
                  }
                  sfx.pop();
                  onPick(n);
                }}
                className={`relative flex h-[104px] flex-col items-center justify-center rounded-[1.6rem] border-4 touch-manipulation ${
                  open
                    ? 'border-ink/80 bg-sun shadow-[0_5px_0_rgba(59,42,74,0.3)]'
                    : 'border-ink/20 bg-[#ebe6f0] text-ink/40'
                } ${here ? 'ring-8 ring-lagoon' : ''}`}
              >
                {open ? (
                  <span className="text-4xl font-bold leading-none">{n}</span>
                ) : (
                  <>
                    <LockIcon size={30} />
                    <span className="text-xl font-semibold">{n}</span>
                  </>
                )}
                {open && (
                  <span className="mt-1 flex gap-0.5" aria-hidden="true">
                    {[1, 2, 3].map((k) => (
                      <StarIcon key={k} size={22} on={k <= stars} color="#ff7b29" />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/** Header badge: the level being played; tapping it says the level and opens the path. */
export function LevelBadge({ n, onPress }: { n: number; onPress(): void }) {
  const t = useT();
  return (
    <BigButton label={t('level', { n })} tone="sun" size={88} round onPress={onPress} testId="level-badge">
      <span className="flex flex-col items-center leading-none">
        <StarIcon size={30} color="#ff7b29" />
        <span className="text-3xl font-bold" data-testid="level-number">
          {n}
        </span>
      </span>
    </BigButton>
  );
}
