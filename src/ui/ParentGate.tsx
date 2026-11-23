import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { voice } from '../audio/voice';
import { useProfile } from '../core/profile';
import { useT } from '../i18n/ui';
import { LockIcon } from './icons';

export const HOLD_MS = 3000;

/** Small corner lock: hold for 3 s, then the PIN pad. A child's quick tap only says "ask a parent". */
export function LockButton({ onUnlock, testId = 'lock' }: { onUnlock(): void; testId?: string }) {
  const t = useT();
  const [holding, setHolding] = useState(false);
  const [pad, setPad] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);

  const start = () => {
    started.current = Date.now();
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      setPad(true);
    }, HOLD_MS);
  };
  const end = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (holding && Date.now() - started.current < 600) void voice.say('parent.ask', 'now');
    setHolding(false);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <>
      <button
        type="button"
        aria-label={t('gate.hold')}
        data-testid={testId}
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        className="relative grid size-14 place-items-center rounded-full bg-white/70"
      >
        <LockIcon size={30} />
        {holding && (
          <svg className="absolute inset-0" viewBox="0 0 56 56" aria-hidden="true">
            <motion.circle
              cx={28}
              cy={28}
              r={25}
              fill="none"
              stroke="#7e63b8"
              strokeWidth={5}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: HOLD_MS / 1000, ease: 'linear' }}
              style={{ rotate: -90, originX: 0.5, originY: 0.5 }}
            />
          </svg>
        )}
      </button>
      {pad && (
        <PinPad
          onCancel={() => setPad(false)}
          onSuccess={() => {
            setPad(false);
            onUnlock();
          }}
        />
      )}
    </>
  );
}

export function PinPad({ onSuccess, onCancel }: { onSuccess(): void; onCancel(): void }) {
  const t = useT();
  const pin = useProfile((s) => s.pin);
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(0);

  const press = (d: string) => {
    const next = (entry + d).slice(0, 4);
    setEntry(next);
    if (next.length === 4) {
      if (next === pin) onSuccess();
      else {
        setWrong((w) => w + 1);
        setTimeout(() => setEntry(''), 350);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/50" data-testid="pin-pad">
      <motion.div
        key={wrong}
        animate={wrong ? { x: [0, -14, 14, -8, 8, 0] } : undefined}
        className="w-[340px] rounded-3xl bg-paper p-6 text-center shadow-2xl"
      >
        <h2 className="text-2xl font-semibold">{t('gate.title')}</h2>
        <p className="mt-1 text-sm text-ink/70">{t('gate.pin')}</p>
        <div className="my-4 flex justify-center gap-3" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`size-5 rounded-full border-2 border-ink ${i < entry.length ? 'bg-ink' : ''}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
            k === '' ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                aria-label={k === '⌫' ? t('gate.erase') : k}
                onClick={() => (k === '⌫' ? setEntry((e) => e.slice(0, -1)) : press(k))}
                className="h-16 rounded-2xl bg-white text-2xl font-semibold shadow active:scale-95"
              >
                {k}
              </button>
            ),
          )}
        </div>
        <button type="button" onClick={onCancel} className="mt-4 text-base underline">
          {t('gate.cancel')}
        </button>
      </motion.div>
    </div>
  );
}
