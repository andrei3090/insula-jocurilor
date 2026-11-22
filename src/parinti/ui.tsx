import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { Pufi } from '../art/Pufi';
import { ICONS, type IconName } from './icons-data';

/** Page background; the wavy bottom of every header is painted in it. */
export const PAGE = '#faf6ff';

/** Fluent Emoji (flat) as inline SVG, parent app subset (see tools/emoji.mjs). */
export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static, bundled icon bodies (no user input)
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

export const Chip = ({
  on,
  onClick,
  children,
  testId,
  icon,
}: {
  on?: boolean;
  onClick(): void;
  children: ReactNode;
  testId?: string;
  icon?: IconName;
}) => (
  <motion.button
    type="button"
    data-testid={testId}
    onClick={onClick}
    whileTap={{ scale: 0.94 }}
    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium whitespace-nowrap transition-colors ${
      on
        ? 'bg-gradient-to-br from-[#8b6cf0] to-[#6a4bc9] text-white shadow-[0_4px_12px_-4px_rgba(106,75,201,0.7)]'
        : 'bg-white text-ink shadow-[0_1px_2px_rgba(59,42,74,0.08)] ring-1 ring-ink/10'
    }`}
  >
    {icon && <Icon name={icon} size={20} />}
    {children}
  </motion.button>
);

export const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mb-3">
    <div className="mb-1.5 text-[12px] font-semibold tracking-[0.08em] text-ink/50 uppercase">{label}</div>
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pt-0.5 pb-1.5 [scrollbar-width:none]">
      {children}
    </div>
  </div>
);

export const Pill = ({
  icon,
  children,
  light,
}: {
  icon?: IconName;
  children: ReactNode;
  light?: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-medium ${
      light ? 'bg-white/25 text-white backdrop-blur-sm' : 'bg-ink/[0.06] text-ink/80'
    }`}
  >
    {icon && <Icon name={icon} size={15} />}
    {children}
  </span>
);

/** A soft wave that blends a header into the page. */
export const Wave = ({ color = PAGE }: { color?: string }) => (
  <svg
    viewBox="0 0 480 40"
    preserveAspectRatio="none"
    className="pointer-events-none absolute inset-x-0 -bottom-px h-8 w-full"
    aria-hidden="true"
  >
    <path d="M0 26 C 90 2, 170 4, 250 22 S 400 42, 480 12 L480 41 L0 41 Z" fill={color} />
  </svg>
);

function Clouds() {
  const reduce = useReducedMotion();
  const cloud = (x: string, y: number, s: number, d: number, k: number) => (
    <motion.svg
      key={k}
      viewBox="0 0 120 50"
      width={120 * s}
      height={50 * s}
      className="pointer-events-none absolute"
      style={{ left: x, top: y }}
      animate={reduce ? undefined : { x: [0, 26, 0] }}
      transition={{ duration: d, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <path
        d="M20 44 a16 16 0 0 1 2-31 a22 22 0 0 1 40-6 a18 18 0 0 1 32 10 a14 14 0 0 1 6 27 Z"
        fill="#fff"
        opacity={0.75}
      />
    </motion.svg>
  );
  return (
    <>
      {cloud('46%', 2, 0.55, 16, 1)}
      {cloud('74%', 64, 0.45, 18, 2)}
    </>
  );
}

const STAR_SPOTS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 53 + 17) % 100,
  y: (i * 37 + 11) % 78,
  r: 1 + ((i * 7) % 3) * 0.6,
  d: 2 + ((i * 13) % 5) * 0.5,
}));

function Stars() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {STAR_SPOTS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2 }}
          animate={reduce ? undefined : { opacity: [0.35, 1, 0.35] }}
          transition={{ duration: s.d, repeat: Number.POSITIVE_INFINITY, delay: i * 0.17 }}
        />
      ))}
    </div>
  );
}

export type HeroTone = { from: string; to: string; dark?: boolean; deco?: 'clouds' | 'stars' | 'bubbles' };

/** Illustrated gradient header that scrolls with the page and ends in a wave. */
export function Hero({
  tone,
  kicker,
  title,
  children,
  art,
}: {
  tone: HeroTone;
  kicker?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  art?: ReactNode;
}) {
  return (
    <header
      className={`relative overflow-hidden pt-[max(env(safe-area-inset-top),18px)] pb-16 ${tone.dark ? 'text-white' : 'text-ink'}`}
      style={{ background: `linear-gradient(160deg, ${tone.from} 0%, ${tone.to} 100%)` }}
    >
      <span className="pointer-events-none absolute -top-16 -left-10 size-48 rounded-full bg-white/15" />
      <span className="pointer-events-none absolute top-10 right-[-40px] size-40 rounded-full bg-white/10" />
      {tone.deco === 'clouds' && <Clouds />}
      {tone.deco === 'stars' && <Stars />}
      {tone.deco === 'bubbles' && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {[14, 38, 62, 84].map((x, i) => (
            <span
              key={x}
              className="absolute rounded-full border-2 border-white/40"
              style={{
                left: `${x}%`,
                top: `${20 + ((i * 23) % 50)}%`,
                width: 14 + i * 6,
                height: 14 + i * 6,
              }}
            />
          ))}
        </div>
      )}
      <div className="relative mx-auto max-w-xl px-5">
        {kicker && (
          <div
            className={`text-[13px] font-semibold tracking-[0.06em] uppercase ${tone.dark ? 'text-white/80' : 'text-ink/60'}`}
          >
            {kicker}
          </div>
        )}
        <h1 className="mt-1 max-w-[70%] text-[30px] leading-[1.1] font-bold">{title}</h1>
        {children}
      </div>
      {art && <div className="pointer-events-none absolute right-3 bottom-7">{art}</div>}
      <Wave />
    </header>
  );
}

/** Big chunky call-to-action (Duolingo-like 3D bottom edge). */
export function BigAction({
  children,
  onClick,
  disabled,
  testId,
  from = '#8b6cf0',
  to = '#6a4bc9',
  shade = '#4d3599',
}: {
  children: ReactNode;
  onClick(): void;
  disabled?: boolean;
  testId?: string;
  from?: string;
  to?: string;
  shade?: string;
}) {
  return (
    <motion.button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? undefined : { y: 3 }}
      className="relative w-full overflow-hidden rounded-[22px] py-4 text-[18px] font-semibold text-white disabled:opacity-45"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 5px 0 ${shade}, 0 14px 24px -12px ${shade}`,
      }}
    >
      <span className="pointer-events-none absolute inset-x-6 top-1 h-1/3 rounded-full bg-white/15" />
      <span className="relative inline-flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  );
}

const CALLOUT: Record<'sun' | 'lagoon' | 'coral' | 'cave', string> = {
  sun: 'bg-[#fff4d6] ring-[#ffd166]/60',
  lagoon: 'bg-[#e3f8f6] ring-[#4cc9c0]/50',
  coral: 'bg-[#ffe9e6] ring-[#ff8a80]/50',
  cave: 'bg-[#f0eaff] ring-[#b39ddb]/60',
};

export function Callout({
  icon,
  title,
  tone,
  children,
  testId,
}: {
  icon: IconName;
  title?: string;
  tone: keyof typeof CALLOUT;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className={`mt-4 flex gap-3 rounded-[20px] p-3.5 ring-1 ${CALLOUT[tone]}`} data-testid={testId}>
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/80">
        <Icon name={icon} size={26} />
      </span>
      <div className="min-w-0 text-[15px] leading-snug">
        {title && <div className="font-semibold">{title}</div>}
        <div className="text-ink/80">{children}</div>
      </div>
    </div>
  );
}

export const SectionTitle = ({
  icon,
  children,
  right,
}: {
  icon?: IconName;
  children: ReactNode;
  right?: ReactNode;
}) => (
  <div className="mt-7 mb-3 flex items-center justify-between gap-2">
    <h2 className="flex items-center gap-2 text-[21px] font-bold">
      {icon && <Icon name={icon} size={26} />}
      {children}
    </h2>
    {right}
  </div>
);

export const Card = ({
  children,
  className = '',
  style,
  testId,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  testId?: string;
}) => (
  <section
    data-testid={testId}
    className={`rounded-[26px] bg-white p-4 shadow-[0_1px_0_rgba(59,42,74,0.04),0_14px_34px_-18px_rgba(59,42,74,0.35)] ring-1 ring-ink/[0.05] ${className}`}
    style={style}
  >
    {children}
  </section>
);

/** Pufi bobbing while the AI works, with the seconds so far. */
export function Thinking({ label, seconds }: { label: string; seconds: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-flex items-center gap-2">
      <motion.span
        className="-my-3 inline-block"
        animate={reduce ? undefined : { y: [0, -5, 0], rotate: [0, -6, 0, 6, 0] }}
        transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
      >
        <Pufi size={40} mood="think" title="Pufi se gândește" />
      </motion.span>
      {label} {seconds > 2 ? `${seconds}s` : ''}
    </span>
  );
}

/** Placeholder cards while ideas are being written. */
export const Skeletons = ({ n = 3 }: { n?: number }) => (
  <div className="mt-4 space-y-3" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="flex gap-3 rounded-[24px] bg-white p-3 ring-1 ring-ink/5">
        <div className="size-[76px] shrink-0 animate-pulse rounded-[20px] bg-[#ece4ff]" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-[#ece4ff]" />
          <div className="h-3 w-full animate-pulse rounded-full bg-[#f3eefc]" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-[#f3eefc]" />
        </div>
      </div>
    ))}
  </div>
);

/** Numbered steps on a connector line. */
export function Steps({ items, color }: { items: string[]; color: string }) {
  return (
    <ol className="relative mt-1 space-y-3">
      <span
        className="absolute top-3 bottom-3 left-[15px] w-[2px] rounded-full opacity-30"
        style={{ background: color }}
      />
      {items.map((x, i) => (
        <li key={i} className="relative flex gap-3">
          <span
            className="z-10 grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white shadow-sm"
            style={{ background: color }}
          >
            {i + 1}
          </span>
          <span className="pt-1 text-[16px] leading-snug">{x}</span>
        </li>
      ))}
    </ol>
  );
}

export const SubTitle = ({ children }: { children: ReactNode }) => (
  <h4 className="mt-5 mb-2 text-[13px] font-semibold tracking-[0.08em] text-ink/55 uppercase">{children}</h4>
);
