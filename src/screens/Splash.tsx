import { motion } from 'motion/react';
import { useState } from 'react';
import { GUIDES } from '../art/guides';
import { LiveGuide } from '../art/LiveGuide';
import { unlockAudio } from '../audio/engine';
import { sfx } from '../audio/sfx';
import { say, setVoiceLang } from '../audio/voice';
import { useProfile } from '../core/profile';
import { resetChild } from '../core/reset';
import { useRouter } from '../core/router';
import { useSession } from '../core/session';
import { askPersistentStorage } from '../core/storage';
import type { Lang } from '../i18n/lang';
import { useT } from '../i18n/ui';
import { LockButton } from '../ui/ParentGate';
import { Waves } from './Waves';

const Flag = ({ lang }: { lang: Lang }) =>
  lang === 'ro' ? (
    <svg
      viewBox="0 0 30 20"
      width={54}
      height={36}
      aria-hidden="true"
      className="rounded-md border-2 border-ink/70"
    >
      <rect width="10" height="20" fill="#002b7f" />
      <rect x="10" width="10" height="20" fill="#fcd116" />
      <rect x="20" width="10" height="20" fill="#ce1126" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 30 20"
      width={54}
      height={36}
      aria-hidden="true"
      className="rounded-md border-2 border-ink/70"
    >
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0V20M0 10H30" stroke="#c8102e" strokeWidth="3.4" />
    </svg>
  );

/**
 * First screen: who is playing, in which language, then the big tap that unlocks sound (autoplay rules).
 * The corner lock (hold 3 s + PIN) opens a total reset for the chosen child.
 */
export function Splash() {
  const go = useRouter((s) => s.go);
  const t = useT();
  const profiles = useProfile((s) => s.profiles);
  const me = useProfile((s) => s.active());
  const select = useProfile((s) => s.select);
  const update = useProfile((s) => s.update);
  const [reset, setReset] = useState<'closed' | 'ask' | 'sure' | 'done'>('closed');
  const lang: Lang = me.lang ?? 'ro';
  const name = me.name || t('start.noName');

  const start = async () => {
    await unlockAudio();
    sfx.chime();
    void askPersistentStorage();
    useSession.getState().start();
    void say('app.hello');
    go({ name: 'map' });
  };

  const pickLang = async (l: Lang) => {
    update(me.id, { lang: l });
    setVoiceLang(l);
    await unlockAudio();
    sfx.pop();
    void say('lang.hello', 'now');
  };

  return (
    <div className="relative grid h-full place-items-center overflow-hidden bg-gradient-to-b from-sky via-[#d8f2ff] to-lagoon">
      <Waves />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <motion.h1
          className="text-center text-6xl font-bold tracking-wide text-ink drop-shadow-[0_3px_0_#fff]"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {t('app.name')}
        </motion.h1>
        <div className="flex items-end gap-2">
          <LiveGuide who="bruno" size={140} />
          <LiveGuide who="pufi" size={190} mood="wave" />
          <LiveGuide who="marina" size={140} />
        </div>
        <div className="relative">
          {/* the halo pulses, the button stays still (a moving target is harder to tap) */}
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-3 rounded-full bg-sun/50"
            animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}
          />
          <motion.button
            type="button"
            data-testid="start"
            aria-label={t('start.aria')}
            onClick={start}
            className="relative flex min-h-[120px] min-w-[320px] items-center justify-center gap-4 rounded-full border-4 border-ink/80 bg-sun px-10 text-4xl font-semibold shadow-[0_8px_0_rgba(59,42,74,0.35)]"
            whileTap={{ scale: 0.9 }}
          >
            <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden="true">
              <path
                d="M20 12 L52 32 L20 52 Z"
                fill="#ff8a80"
                stroke="#3b2a4a"
                strokeWidth={4}
                strokeLinejoin="round"
              />
            </svg>
            {t('start.play')}
          </motion.button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          {profiles.length > 1 && (
            <fieldset className="flex items-center gap-3 rounded-[2rem] bg-white/70 px-4 py-2 m-0 min-w-0 border-0">
              <legend className="sr-only">{t('start.who')}</legend>
              {profiles.map((p) => {
                const G = GUIDES[p.avatar];
                return (
                  <button
                    key={p.id}
                    type="button"
                    data-testid={`child-${p.id}`}
                    aria-label={p.name || t('start.noName')}
                    aria-pressed={p.id === me.id}
                    onClick={() => {
                      sfx.pop();
                      select(p.id);
                    }}
                    className={`flex min-h-[104px] min-w-[104px] flex-col items-center justify-center rounded-[1.6rem] border-4 px-2 ${
                      p.id === me.id ? 'border-ink/80 bg-sun' : 'border-transparent bg-paper'
                    }`}
                  >
                    <G size={64} />
                    <span className="max-w-[110px] truncate text-lg font-semibold">{p.name || '…'}</span>
                  </button>
                );
              })}
            </fieldset>
          )}
          <fieldset className="flex items-center gap-3 rounded-[2rem] bg-white/70 px-4 py-2 m-0 min-w-0 border-0">
            <legend className="sr-only">{t('start.lang')}</legend>
            {(['ro', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                data-testid={`lang-${l}`}
                aria-pressed={lang === l}
                aria-label={l === 'ro' ? 'Română' : 'English'}
                onClick={() => void pickLang(l)}
                className={`flex min-h-[88px] min-w-[150px] items-center justify-center gap-3 rounded-[1.6rem] border-4 px-4 text-2xl font-semibold ${
                  lang === l ? 'border-ink/80 bg-sun' : 'border-transparent bg-paper'
                }`}
              >
                <Flag lang={l} />
                {l === 'ro' ? 'Română' : 'English'}
              </button>
            ))}
          </fieldset>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-20">
        <LockButton testId="start-lock" onUnlock={() => setReset('ask')} />
      </div>

      {reset !== 'closed' && (
        <div
          className="absolute inset-0 z-50 grid place-items-center bg-ink/45 p-6"
          data-testid="reset-sheet"
        >
          <div className="flex max-w-[640px] flex-col items-center gap-5 rounded-[2.5rem] border-4 border-ink/80 bg-paper p-8 text-center">
            {reset === 'done' ? (
              <p className="text-3xl font-semibold">{t('start.resetDone', { name })}</p>
            ) : reset === 'sure' ? (
              <p className="text-2xl">{t('start.resetSure', { name })}</p>
            ) : (
              <p className="text-3xl font-semibold">{t('start.reset', { name })}</p>
            )}
            <div className="flex flex-wrap justify-center gap-4">
              {reset === 'ask' && (
                <button
                  type="button"
                  data-testid="reset-child"
                  onClick={() => setReset('sure')}
                  className="min-h-[72px] rounded-2xl bg-coral px-6 text-2xl font-semibold text-white"
                >
                  {t('start.reset', { name })}
                </button>
              )}
              {reset === 'sure' && (
                <button
                  type="button"
                  data-testid="reset-yes"
                  onClick={async () => {
                    await resetChild(me.id);
                    setReset('done');
                  }}
                  className="min-h-[72px] rounded-2xl bg-coral px-6 text-2xl font-semibold text-white"
                >
                  {t('start.resetYes')}
                </button>
              )}
              <button
                type="button"
                data-testid="reset-close"
                onClick={() => setReset('closed')}
                className="min-h-[72px] rounded-2xl bg-sun px-6 text-2xl font-semibold"
              >
                {reset === 'done' ? t('level.close') : t('start.resetNo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
