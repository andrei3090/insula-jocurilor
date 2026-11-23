import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Emoji, type EmojiName, emojiUrl } from '../../art/Emoji';
import { GUIDES } from '../../art/guides';
import { sfx } from '../../audio/sfx';
import { saveDrawing } from '../../core/drawings';
import type { Avatar } from '../../core/profile';
import type { GameProps } from '../../core/types';
import { useT } from '../../i18n/ui';
import { InkCanvas, type InkHandle, type InkTool } from '../../input/InkCanvas';
import { BigButton } from '../../ui/BigButton';
import { StarBurst } from '../../ui/Celebration';
import { CheckIcon, TrashIcon } from '../../ui/icons';
import { textOf } from '../../voice/lines';
import { POTS, SIZES, stampAt } from './logic';

const STAMP_EMOJI: EmojiName[] = [
  'glowing-star',
  'red-heart',
  'butterfly',
  'sun',
  'cherry-blossom',
  'tropical-fish',
];
const STAMP_SIZE = 130;

const svgUrl = (el: SVGElement) => {
  const clone = el.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '256');
  clone.setAttribute('height', '256');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clone.outerHTML)}`;
};

const RainbowDot = () => (
  <span
    className="block size-12 rounded-full"
    style={{ background: 'conic-gradient(#ff5f6d, #ffd84c, #6fd36f, #4cc9f0, #9b6cff, #ff5f6d)' }}
  />
);

function EraserIcon() {
  return (
    <svg viewBox="0 0 64 64" width={50} height={50} aria-hidden="true">
      <path
        d="M14 40 L36 14 L54 30 L34 52 H22 Z"
        fill="#ffb4c8"
        stroke="#3b2a4a"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path d="M22 32 L40 48" stroke="#3b2a4a" strokeWidth={4} />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 64 64" width={48} height={48} aria-hidden="true">
      <path
        d="M24 18 L12 30 L24 42"
        fill="none"
        stroke="#3b2a4a"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 30 H38 A14 14 0 0 1 38 58 H30"
        fill="none"
        stroke="#3b2a4a"
        strokeWidth={6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DesenGame({ level, voice, registerTest, profileId }: GameProps) {
  const t = useT();
  const ink = useRef<InkHandle>(null);
  const tray = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<InkTool>('pen');
  const [color, setColor] = useState(POTS[4].color);
  const [size, setSize] = useState<number>(SIZES[1]);
  const [stamps, setStamps] = useState(false);
  const [stamp, setStamp] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saved, setSaved] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: once
  useEffect(() => {
    void voice.prompt('desen.intro');
  }, []);

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  const pickPot = (c: string, v: (typeof POTS)[number]['voice']) => {
    setTool('pen');
    setColor(c);
    setStamp(null);
    void voice.say(v, 'now');
  };

  const save = async () => {
    const blob = await ink.current?.toBlob();
    if (!blob) return;
    await saveDrawing(profileId, blob);
    sfx.success();
    setSaved((n) => n + 1);
    void voice.say('desen.saved', 'now');
  };

  registerTest({ solve: () => void save(), fail: () => {} });

  return (
    <div className="flex h-full gap-4 px-5 pb-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div
          className="relative flex-1 overflow-hidden rounded-[2rem] border-4 border-ink/70 bg-white shadow-inner"
          data-testid="paper"
        >
          <InkCanvas
            ref={ink}
            tool={tool}
            color={color}
            size={size}
            label={t('desen.paper')}
            onTap={
              stamp
                ? (x, y) => {
                    const el = document.querySelector('[data-testid=paper]')!.getBoundingClientRect();
                    const p = stampAt(x, y, STAMP_SIZE, el.width, el.height);
                    ink.current?.addStamp(stamp, p.x, p.y, STAMP_SIZE);
                    sfx.pop();
                  }
                : undefined
            }
          />
          {saved > 0 && <StarBurst key={saved} />}
        </div>
        {/* colour pots */}
        <div className="flex flex-wrap items-center justify-center gap-1.5" data-testid="pots">
          {POTS.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              aria-label={p.id}
              onClick={() => pickPot(p.color, p.voice)}
              whileTap={{ scale: 0.85 }}
              animate={{ y: tool === 'pen' && color === p.color && !stamp ? -10 : 0 }}
              className="size-[68px] shrink-0 rounded-full border-4 border-ink/70 shadow-[0_5px_0_rgba(59,42,74,0.3)]"
              style={{ background: p.color }}
            />
          ))}
          <motion.button
            type="button"
            aria-label={textOf('color.rainbow', level.lang)}
            onClick={() => {
              setTool('rainbow');
              setStamp(null);
              void voice.say('color.rainbow', 'now');
            }}
            animate={{ y: tool === 'rainbow' && !stamp ? -10 : 0 }}
            className="grid size-[68px] shrink-0 place-items-center rounded-full border-4 border-ink/70 bg-white"
          >
            <RainbowDot />
          </motion.button>
          <motion.button
            type="button"
            aria-label={t('desen.eraser')}
            onClick={() => {
              setTool('eraser');
              setStamp(null);
            }}
            animate={{ y: tool === 'eraser' && !stamp ? -10 : 0 }}
            className="grid size-[68px] shrink-0 place-items-center rounded-full border-4 border-ink/70 bg-white"
          >
            <EraserIcon />
          </motion.button>
        </div>
      </div>

      {/* tools */}
      <div className="flex w-[96px] flex-col items-center justify-end gap-2 pb-1">
        <BigButton
          label={t('desen.brush')}
          size={86}
          round
          onPress={() =>
            setSize((s) => SIZES[(SIZES.indexOf(s as (typeof SIZES)[number]) + 1) % SIZES.length])
          }
        >
          <span className="block rounded-full bg-ink" style={{ width: size + 6, height: size + 6 }} />
        </BigButton>
        <BigButton
          label={t('desen.stickers')}
          size={86}
          round
          tone="white"
          className={stamps || stamp ? 'ring-8 ring-sun' : ''}
          onPress={() => setStamps((v) => !v)}
          testId="stamps"
        >
          <Emoji name="glowing-star" size={56} />
        </BigButton>
        <BigButton label={t('undo')} size={86} round onPress={() => ink.current?.undo()}>
          <UndoIcon />
        </BigButton>
        <BigButton
          label={confirmClear ? 'Da, șterge tot' : 'Șterge tot'}
          size={86}
          round
          tone={confirmClear ? 'coral' : 'white'}
          onPress={() => {
            if (confirmClear) {
              ink.current?.clear();
              sfx.swish();
              setConfirmClear(false);
            } else {
              setConfirmClear(true);
              void voice.say('desen.clear', 'now');
            }
          }}
        >
          {confirmClear ? <CheckIcon size={50} /> : <TrashIcon size={50} />}
        </BigButton>
        <BigButton
          label={t('toAlbum')}
          size={86}
          round
          tone="lagoon"
          onPress={() => void save()}
          testId="save"
        >
          <CheckIcon size={54} />
        </BigButton>
      </div>

      {stamps && (
        <motion.div
          ref={tray}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-[130px] top-4 z-30 grid grid-cols-3 gap-3 rounded-[2rem] border-4 border-ink/70 bg-paper p-4 shadow-xl"
          data-testid="stamp-tray"
        >
          {(Object.keys(GUIDES) as Avatar[]).map((g) => {
            const G = GUIDES[g];
            return (
              <button
                key={g}
                type="button"
                aria-label={g}
                className="grid size-[104px] place-items-center rounded-3xl bg-white"
                onClick={(e) => {
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) setStamp(svgUrl(svg));
                  setStamps(false);
                  void voice.say('desen.stamp', 'now');
                }}
              >
                <G size={92} />
              </button>
            );
          })}
          {STAMP_EMOJI.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={n}
              className="grid size-[104px] place-items-center rounded-3xl bg-white"
              onClick={() => {
                setStamp(emojiUrl(n));
                setStamps(false);
                void voice.say('desen.stamp', 'now');
              }}
            >
              <Emoji name={n} size={72} />
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
