import { motion } from 'motion/react';
import { useEffect } from 'react';
import { LiveGuide } from '../art/LiveGuide';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { type AgeGroup, ageFor, groupOf } from '../core/age';
import { useProfile } from '../core/profile';
import { useRouter } from '../core/router';
import { useT } from '../i18n/ui';
import { Waves } from './Waves';

/** After "Hai să ne jucăm!": 3–4 or 5–7. The islands then show the games of that group. */
export function AgePicker() {
  const go = useRouter((s) => s.go);
  const t = useT();
  const me = useProfile((s) => s.active());
  const update = useProfile((s) => s.update);
  const current = groupOf(me.age);

  useEffect(() => {
    void voice.prompt('age.choose');
  }, []);

  const pick = (g: AgeGroup) => {
    sfx.pop();
    update(me.id, { age: ageFor(g, me.age) });
    void voice.say(g === 'small' ? 'age.small' : 'age.big', 'now');
    setTimeout(() => go({ name: 'map' }), 900);
  };

  const card = (g: AgeGroup, label: string, art: React.ReactNode, delay: number) => (
    <motion.button
      key={g}
      type="button"
      data-testid={`age-${g}`}
      aria-label={label}
      aria-pressed={current === g}
      onClick={() => pick(g)}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 240, damping: 16 }}
      whileTap={{ scale: 0.93 }}
      className={`flex h-[320px] w-[272px] flex-col items-center justify-center gap-3 rounded-[2.6rem] border-4 shadow-[0_10px_0_rgba(59,42,74,0.3)] touch-manipulation ${
        current === g ? 'border-ink/80 bg-sun' : 'border-ink/60 bg-paper'
      }`}
    >
      <span className="pointer-events-none flex items-end gap-1">{art}</span>
      <span className="text-6xl font-bold leading-none">{label}</span>
    </motion.button>
  );

  return (
    <div
      className="relative grid h-full place-items-center overflow-hidden bg-gradient-to-b from-sky via-[#d8f2ff] to-lagoon"
      data-testid="age-screen"
    >
      <Waves />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <h1 className="text-5xl font-bold text-ink drop-shadow-[0_3px_0_#fff]">{t('age.title')}</h1>
        <div className="flex flex-wrap items-center justify-center gap-8 px-6">
          {card('small', t('age.small'), <LiveGuide who="pufi" size={150} />, 0.05)}
          {card(
            'big',
            t('age.big'),
            <>
              <LiveGuide who="bruno" size={120} />
              <LiveGuide who="marina" size={130} />
            </>,
            0.15,
          )}
        </div>
      </div>
    </div>
  );
}
