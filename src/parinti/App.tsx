import { AnimatePresence, motion } from 'motion/react';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IslandArt } from '../art/islands';
import { Pufi } from '../art/Pufi';
import {
  activitySchema,
  buildPrompt,
  buildRefinePrompt,
  buildStoryPrompt,
  buildWeekPrompt,
  DEFAULT_MODEL,
  DETAILED_MODEL,
  parseActivities,
  parseStory,
  REFINE,
  type RefineHow,
  STORY_SCHEMA,
  STORY_TOPICS,
  type Story,
  type StoryTopic,
} from './ai';
import { filterActivities } from './filter';
import { GeminiError, generateJson, photoToJpeg } from './gemini';
import type { IconName } from './icons-data';
import { LIBRARY } from './library';
import {
  ENERGY_ICON,
  greeting,
  ideaOfDay,
  lookOf,
  SKY,
  THEME_ICON,
  TOPIC_ICON,
  WHERE_ICON,
  weekdayIndex,
} from './look';
import { DAYS, useParent } from './store';
import {
  type Activity,
  ENERGY,
  type Energy,
  type Filters,
  SKILLS,
  type Skill,
  THEMES,
  type Theme,
  WHERE,
  type Where,
} from './types';
import {
  BigAction,
  Callout,
  Card,
  Chip,
  Hero,
  type HeroTone,
  Icon,
  PAGE,
  Pill,
  Row,
  SectionTitle,
  Skeletons,
  Steps,
  SubTitle,
  Thinking,
} from './ui';

type Tab = 'idei' | 'creeaza' | 'poveste' | 'poza' | 'plan' | 'setari';

/** Lets any screen jump to another tab (quick actions, "go to Settings"). */
const GoTo = createContext<(t: Tab) => void>(() => {});

const FACE: Record<1 | 2 | 3, IconName> = {
  1: 'slightly-frowning-face',
  2: 'neutral-face',
  3: 'grinning-face',
};

const SHORT_THEME: Record<Theme, string> = {
  pufi: 'Pufi',
  bruno: 'Bruno',
  cenusareasa: 'Cenușăreasa',
  marina: 'Marina',
  tavi: 'Tavi',
};

function FilterForm({
  f,
  setF,
  withTheme,
  withWhere = true,
}: {
  f: Filters & { theme?: Theme };
  setF(f: Filters & { theme?: Theme }): void;
  withTheme?: boolean;
  withWhere?: boolean;
}) {
  const setAge = useParent((s) => s.setAge);
  return (
    <div>
      <Row label="Vârsta">
        {[3, 4, 5, 6, 7, 8, 9, 10].map((a) => (
          <Chip
            key={a}
            on={f.age === a}
            onClick={() => {
              setF({ ...f, age: a });
              setAge(a);
            }}
          >
            {a} ani
          </Chip>
        ))}
      </Row>
      {withWhere && (
        <Row label="Unde">
          {(Object.keys(WHERE) as Where[]).map((w) => (
            <Chip
              key={w}
              testId={`where-${w}`}
              icon={WHERE_ICON[w]}
              on={f.where === w}
              onClick={() => setF({ ...f, where: f.where === w ? undefined : w })}
            >
              {WHERE[w]}
            </Chip>
          ))}
        </Row>
      )}
      <Row label="Cât timp">
        {[5, 10, 15, 30].map((m) => (
          <Chip
            key={m}
            icon="stopwatch"
            on={f.maxMinutes === m}
            onClick={() => setF({ ...f, maxMinutes: f.maxMinutes === m ? undefined : m })}
          >
            ≤ {m} min
          </Chip>
        ))}
      </Row>
      <Row label="Cum">
        {(Object.keys(ENERGY) as Energy[]).map((e) => (
          <Chip
            key={e}
            icon={ENERGY_ICON[e]}
            on={f.energy === e}
            onClick={() => setF({ ...f, energy: f.energy === e ? undefined : e })}
          >
            {ENERGY[e]}
          </Chip>
        ))}
      </Row>
      <Row label="Ce exersăm">
        {(Object.keys(SKILLS) as Skill[]).map((s) => (
          <Chip
            key={s}
            icon={lookOf({ skills: [s] }).icon}
            on={f.skill === s}
            onClick={() => setF({ ...f, skill: f.skill === s ? undefined : s })}
          >
            {SKILLS[s]}
          </Chip>
        ))}
      </Row>
      {withTheme && (
        <Row label="Cu personajul">
          {(Object.keys(THEMES) as Theme[]).map((t) => (
            <Chip
              key={t}
              icon={THEME_ICON[t]}
              on={f.theme === t}
              onClick={() => setF({ ...f, theme: f.theme === t ? undefined : t })}
            >
              {THEMES[t]}
            </Chip>
          ))}
        </Row>
      )}
    </div>
  );
}

function ActivityCard({ a, onOpen, index = 0 }: { a: Activity; onOpen(): void; index?: number }) {
  const saved = useParent((s) => !!s.saved[a.id]);
  const done = useParent((s) => s.done[a.id]);
  const look = lookOf(a);
  return (
    <motion.button
      type="button"
      data-testid="activity"
      onClick={onOpen}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, type: 'spring', stiffness: 260, damping: 24 }}
      whileTap={{ scale: 0.98 }}
      className="flex w-full gap-3.5 rounded-[26px] bg-white p-3 text-left shadow-[0_1px_0_rgba(59,42,74,0.04),0_12px_28px_-18px_rgba(59,42,74,0.45)] ring-1 ring-ink/[0.05]"
    >
      <span
        className="relative grid size-[78px] shrink-0 place-items-center overflow-hidden rounded-[22px]"
        style={{ background: `linear-gradient(145deg, ${look.from}, ${look.to})` }}
      >
        <span className="absolute -top-4 -right-4 size-12 rounded-full bg-white/25" />
        <Icon name={look.icon} size={46} className="relative drop-shadow-[0_3px_3px_rgba(0,0,0,0.18)]" />
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block text-[17px] leading-snug font-semibold">{a.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-[14px] leading-snug text-ink/65">{a.goal}</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <Pill icon="stopwatch">{a.minutes} min</Pill>
          <Pill icon={ENERGY_ICON[a.energy]}>{ENERGY[a.energy]}</Pill>
          {a.source !== 'biblioteca' && <Pill icon="sparkles">nou</Pill>}
          {saved && <Pill icon="red-heart">salvat</Pill>}
          {done && <Pill icon={FACE[done.rating]}>făcut</Pill>}
        </span>
      </span>
    </motion.button>
  );
}

const REFINE_LABEL: Record<RefineHow, string> = {
  usor: 'Mai ușor',
  greu: 'Mai greu',
  alta: 'Altă variantă',
  fara: 'Fără materiale',
  miscare: 'Mai multă mișcare',
  linistit: 'Mai liniștit',
};

function Checklist({ items }: { items: string[] }) {
  const [got, setGot] = useState<Record<number, boolean>>({});
  return (
    <ul className="space-y-2">
      {items.map((x, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => setGot((g) => ({ ...g, [i]: !g[i] }))}
            className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-left ring-1 ring-ink/[0.06]"
          >
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full border-2 text-[13px] font-bold transition ${got[i] ? 'border-[#25a07a] bg-[#25a07a] text-white' : 'border-ink/25'}`}
            >
              {got[i] ? '✓' : ''}
            </span>
            <span className={`text-[16px] ${got[i] ? 'text-ink/45 line-through' : ''}`}>{x}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Detail({ a: initial, onClose }: { a: Activity; onClose(): void }) {
  const { saved, toggleSave, addToPlan, markDone, done, apiKey, model, age, profile, replace } = useParent();
  const [a, setA] = useState(initial);
  const [day, setDay] = useState<number | null>(null);
  const [busy, setBusy] = useState<RefineHow | null>(null);
  const [err, setErr] = useState('');
  const look = lookOf(a);
  const refine = async (how: RefineHow) => {
    setBusy(how);
    setErr('');
    try {
      const json = await generateJson({
        apiKey,
        model,
        prompt: buildRefinePrompt(a, how, age, profile),
        schema: activitySchema(1),
      });
      const r = parseActivities(json, { age, where: a.where[0], source: 'ai' });
      if (!r.activities[0]) throw new GeminiError('Nu a mers. Mai încearcă o dată.');
      const next = { ...r.activities[0], where: a.where };
      replace(a.id, next);
      setA(next);
    } catch (e) {
      setErr(e instanceof GeminiError ? e.message : 'Nu a mers. Mai încearcă o dată.');
    } finally {
      setBusy(null);
    }
  };
  const isSaved = !!saved[a.id];
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2a1f38]/50 backdrop-blur-[3px] sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      data-testid="detail"
    >
      <motion.div
        className="relative max-h-[93vh] w-full max-w-xl overflow-auto overscroll-contain rounded-t-[34px] sm:rounded-[34px]"
        style={{ background: '#fffaf2' }}
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative h-44 overflow-hidden"
          style={{ background: `linear-gradient(140deg, ${look.from}, ${look.to})` }}
        >
          <span className="absolute top-2.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/70" />
          <span className="absolute -bottom-10 -left-8 size-40 rounded-full bg-white/15" />
          <span className="absolute top-6 left-24 size-14 rounded-full bg-white/15" />
          <motion.span
            className="absolute right-8 bottom-5"
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
          >
            <Icon name={look.icon} size={112} className="drop-shadow-[0_10px_12px_rgba(0,0,0,0.22)]" />
          </motion.span>
          {a.theme && (
            <span className="absolute bottom-8 left-5 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[13px] font-semibold">
              <Icon name={THEME_ICON[a.theme]} size={18} /> cu {SHORT_THEME[a.theme]}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white/85 text-[20px] shadow-sm backdrop-blur"
            aria-label="Închide"
          >
            ✕
          </button>
        </div>
        <div className="relative -mt-6 rounded-t-[28px] px-5 pt-5 pb-4" style={{ background: '#fffaf2' }}>
          <h2 className="text-[27px] leading-[1.12] font-bold">{a.title}</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Pill icon="stopwatch">{a.minutes} min</Pill>
            <Pill icon={ENERGY_ICON[a.energy]}>{ENERGY[a.energy]}</Pill>
            <Pill icon="teddy-bear">
              {a.ages[0]}–{a.ages[1]} ani
            </Pill>
            {a.where.map((w) => (
              <Pill key={w} icon={WHERE_ICON[w]}>
                {WHERE[w]}
              </Pill>
            ))}
          </div>
          <Callout icon="light-bulb" tone="sun" title="Ce învață">
            {a.goal}
          </Callout>
          {a.materials.length > 0 && (
            <>
              <SubTitle>Ai nevoie de</SubTitle>
              <Checklist items={a.materials} />
            </>
          )}
          {a.setup.length > 0 && (
            <>
              <SubTitle>Pregătire</SubTitle>
              <Steps items={a.setup} color={look.to} />
            </>
          )}
          {a.play.length > 0 && (
            <>
              <SubTitle>Cum vă jucați</SubTitle>
              <Steps items={a.play} color={look.to} />
            </>
          )}
          {a.older && (
            <Callout icon="backpack" tone="lagoon" title="Pentru 6–10 ani">
              {a.older}
            </Callout>
          )}
          {a.safety && (
            <Callout icon="warning" tone="coral" title="Atenție">
              {a.safety}
            </Callout>
          )}
          {apiKey && (
            <div className="mt-5 rounded-[22px] bg-[#f0eaff] p-3.5" data-testid="refine">
              <div className="flex items-center gap-2 text-[15px] font-semibold">
                <Icon name="sparkles" size={22} /> Ajustează cu AI
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(Object.keys(REFINE) as RefineHow[]).map((h) => (
                  <Chip
                    key={h}
                    on={busy === h}
                    onClick={() => !busy && void refine(h)}
                    testId={`refine-${h}`}
                  >
                    {busy === h ? 'Se rescrie…' : REFINE_LABEL[h]}
                  </Chip>
                ))}
              </div>
              {err && <p className="mt-2 rounded-2xl bg-[#ffe9e6] p-2 text-sm">{err}</p>}
            </div>
          )}
          <SubTitle>Ați făcut-o? Cum i-a plăcut?</SubTitle>
          <div className="flex gap-3">
            {([3, 2, 1] as const).map((r) => (
              <motion.button
                key={r}
                type="button"
                whileTap={{ scale: 0.85 }}
                onClick={() => markDone(a.id, r)}
                className={`grid size-16 place-items-center rounded-[20px] bg-white ring-1 transition ${done[a.id]?.rating === r ? 'ring-4 ring-[#8b6cf0]' : 'ring-ink/10'}`}
                aria-label={`notă ${r}`}
              >
                <Icon name={FACE[r]} size={40} />
              </motion.button>
            ))}
          </div>
        </div>
        <div
          className="sticky bottom-0 z-10 border-t border-ink/[0.06] px-4 pt-3 pb-[max(env(safe-area-inset-bottom),14px)] backdrop-blur-xl"
          style={{ background: 'rgba(255,250,242,0.9)' }}
        >
          <AnimatePresence>
            {day !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
              >
                {DAYS.map((d, i) => (
                  <Chip
                    key={d}
                    on={i === day}
                    onClick={() => {
                      addToPlan(i, a);
                      setDay(null);
                    }}
                  >
                    {d}
                  </Chip>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2.5">
            <motion.button
              type="button"
              data-testid="save-activity"
              whileTap={{ scale: 0.96 }}
              onClick={() => toggleSave(a)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[18px] py-3.5 text-[16px] font-semibold transition ${isSaved ? 'bg-[#ffe3ec] text-[#c2275f] ring-2 ring-[#ff8fb8]' : 'bg-white ring-1 ring-ink/10'}`}
            >
              <Icon name="red-heart" size={22} /> {isSaved ? 'Salvat' : 'Salvează'}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setDay(day === null ? weekdayIndex(new Date()) : null)}
              className="flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-gradient-to-br from-[#8b6cf0] to-[#6a4bc9] py-3.5 text-[16px] font-semibold text-white shadow-[0_4px_0_#4d3599]"
            >
              <Icon name="spiral-calendar" size={22} /> Pune în plan
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function List({ items, empty }: { items: Activity[]; empty: ReactNode }) {
  const [open, setOpen] = useState<Activity | null>(null);
  return (
    <>
      <div className="space-y-3">
        {items.map((a, i) => (
          <ActivityCard key={a.id} a={a} index={i} onOpen={() => setOpen(a)} />
        ))}
        {!items.length && empty && (
          <div className="rounded-[22px] border-2 border-dashed border-ink/10 bg-white/60 p-5 text-center text-[15px] text-ink/60">
            {empty}
          </div>
        )}
      </div>
      <AnimatePresence>{open && <Detail a={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}

const QUICK: {
  id: Tab | 'surpriza';
  title: string;
  sub: string;
  icon: IconName;
  from: string;
  to: string;
  shade: string;
}[] = [
  {
    id: 'creeaza',
    title: 'Creează cu AI',
    sub: '3 idei noi, pe loc',
    icon: 'sparkles',
    from: '#9a7bff',
    to: '#6a4bc9',
    shade: '#4d3599',
  },
  {
    id: 'poza',
    title: 'Din poză',
    sub: 'din ce ai prin casă',
    icon: 'camera-with-flash',
    from: '#2ec4b6',
    to: '#138a85',
    shade: '#0d625e',
  },
  {
    id: 'poveste',
    title: 'Poveste de seară',
    sub: 'cu Pufi și prietenii',
    icon: 'crescent-moon',
    from: '#5546b8',
    to: '#2b2366',
    shade: '#1a1545',
  },
  {
    id: 'surpriza',
    title: 'Surpriză!',
    sub: 'o idee la întâmplare',
    icon: 'game-die',
    from: '#ff8a62',
    to: '#d9442c',
    shade: '#a4321f',
  },
];

function Ideas() {
  const go = useContext(GoTo);
  const age = useParent((s) => s.age);
  const nickname = useParent((s) => s.profile.nickname.trim());
  const [f, setF] = useState<Filters>({ age });
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<Activity | null>(null);
  const items = useMemo(() => filterActivities(LIBRARY, f), [f]);
  const forAge = useMemo(() => filterActivities(LIBRARY, { age: f.age }), [f.age]);
  const today = ideaOfDay(forAge, new Date());
  const { hello, sky } = greeting(new Date().getHours());
  const tone: HeroTone = {
    ...SKY[sky],
    deco: SKY[sky].dark ? 'stars' : 'clouds',
  };
  const active = [f.maxMinutes, f.energy, f.skill].filter(Boolean).length;
  return (
    <>
      <Hero
        tone={tone}
        kicker="Insula · Părinți"
        title={hello}
        art={
          <div className="relative h-[150px] w-[170px]">
            <div className="absolute right-0 bottom-0 opacity-95">
              <IslandArt id="bambus" width={170} />
            </div>
            <div className="absolute bottom-[54px] left-[38px]">
              <Pufi size={92} mood="wave" title="Pufi" />
            </div>
          </div>
        }
      >
        <p
          className={`mt-2 max-w-[58%] text-[18px] leading-snug ${tone.dark ? 'text-white/90' : 'text-ink/75'}`}
        >
          Ce vă jucați azi{nickname ? ` cu ${nickname}` : ''}?
        </p>
      </Hero>
      <div className="mx-auto max-w-xl px-5">
        <div className="relative z-10 -mt-8 grid grid-cols-2 gap-3">
          {QUICK.map((q, i) => (
            <motion.button
              key={q.id}
              type="button"
              data-testid={`quick-${q.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05, type: 'spring', stiffness: 260, damping: 22 }}
              whileTap={{ y: 3 }}
              onClick={() =>
                q.id === 'surpriza'
                  ? setOpen(forAge[Math.floor(Math.random() * forAge.length)] ?? null)
                  : go(q.id)
              }
              className="relative min-h-[118px] overflow-hidden rounded-[24px] p-3.5 text-left text-white"
              style={{
                background: `linear-gradient(145deg, ${q.from}, ${q.to})`,
                boxShadow: `0 5px 0 ${q.shade}, 0 16px 26px -14px ${q.shade}`,
              }}
            >
              <span className="absolute -top-6 -right-6 size-20 rounded-full bg-white/15" />
              <Icon name={q.icon} size={40} className="relative drop-shadow-[0_3px_3px_rgba(0,0,0,0.2)]" />
              <span className="relative mt-2 block text-[17px] leading-tight font-bold">{q.title}</span>
              <span className="relative block text-[13px] text-white/90">{q.sub}</span>
            </motion.button>
          ))}
        </div>

        {today && (
          <>
            <SectionTitle icon="glowing-star">Ideea zilei</SectionTitle>
            <motion.button
              type="button"
              data-testid="idea-of-day"
              whileTap={{ scale: 0.98 }}
              onClick={() => setOpen(today)}
              className="relative w-full overflow-hidden rounded-[30px] p-5 pr-28 text-left text-white shadow-[0_18px_36px_-18px_rgba(91,63,163,0.8)]"
              style={{ background: 'linear-gradient(135deg, #5b3fa3 0%, #a64fc4 58%, #ff7f8f 100%)' }}
            >
              <span className="absolute -right-10 -bottom-12 size-48 rounded-full bg-white/10" />
              <span className="absolute top-4 right-20 size-6 rounded-full bg-white/20" />
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold tracking-wide uppercase">
                pentru {f.age} ani
              </span>
              <span className="mt-3 block text-[25px] leading-[1.1] font-bold">{today.title}</span>
              <span className="mt-1.5 line-clamp-2 block text-[14.5px] text-white/90">{today.goal}</span>
              <span className="mt-3 flex flex-wrap gap-1.5">
                <Pill light icon="stopwatch">
                  {today.minutes} min
                </Pill>
                <Pill light icon={ENERGY_ICON[today.energy]}>
                  {ENERGY[today.energy]}
                </Pill>
              </span>
              <motion.span
                className="absolute right-3 bottom-5"
                animate={{ rotate: [-8, -2, -8], y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              >
                <Icon
                  name={lookOf(today).icon}
                  size={96}
                  className="drop-shadow-[0_10px_12px_rgba(0,0,0,0.3)]"
                />
              </motion.span>
            </motion.button>
          </>
        )}

        <SectionTitle icon="books">Toate ideile</SectionTitle>
        <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pt-0.5 pb-2 [scrollbar-width:none]">
          {(Object.keys(WHERE) as Where[]).map((w) => {
            const on = f.where === w;
            return (
              <motion.button
                key={w}
                type="button"
                data-testid={`where-${w}`}
                whileTap={{ scale: 0.93 }}
                onClick={() => setF({ ...f, where: on ? undefined : w })}
                className={`flex h-[94px] w-[88px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[22px] px-1 text-center text-[12.5px] leading-tight font-medium transition ${
                  on
                    ? 'bg-[#efe8ff] text-[#4d3599] ring-2 ring-[#8b6cf0]'
                    : 'bg-white ring-1 ring-ink/[0.07] shadow-[0_6px_16px_-12px_rgba(59,42,74,0.5)]'
                }`}
              >
                <Icon name={WHERE_ICON[w]} size={36} />
                {WHERE[w]}
              </motion.button>
            );
          })}
        </div>
        <div className="mt-2 mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold ring-1 ${more || active ? 'bg-[#efe8ff] text-[#4d3599] ring-[#8b6cf0]/60' : 'bg-white ring-ink/10'}`}
            aria-expanded={more}
          >
            <Icon name="magnifying-glass-tilted-left" size={20} />
            Filtre · {f.age} ani
            {active > 0 && (
              <span className="grid size-6 place-items-center rounded-full bg-[#6a4bc9] text-[12px] text-white">
                {active}
              </span>
            )}
          </button>
          <p className="text-[14px] font-medium text-ink/55" data-testid="count">
            {items.length} idei
          </p>
        </div>
        <AnimatePresence initial={false}>
          {more && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="mb-4">
                <FilterForm f={f} setF={setF} withWhere={false} />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        <List
          items={items}
          empty="Nicio idee cu toate filtrele astea. Scoate unul sau încearcă „Creează cu AI”."
        />
      </div>
      <AnimatePresence>{open && <Detail a={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}

function useGenerate() {
  const { apiKey, model, profile, remember } = useParent();
  const [busy, setBusy] = useState(false);
  const elapsed = useElapsed(busy);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ objects: string[]; activities: Activity[] } | null>(null);
  const run = async (
    prompt: string,
    ctx: { age: number; where?: Where; source: 'ai' | 'poza' },
    jpegBase64?: string,
  ) => {
    setBusy(true);
    setError('');
    try {
      const json = await generateJson({ apiKey, model, prompt, jpegBase64 });
      const r = parseActivities(json, ctx);
      if (!r.activities.length) throw new GeminiError('Nu am primit idei bune. Mai încearcă o dată.');
      setResult(r);
      remember(r.activities);
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : 'Nu a mers. Mai încearcă o dată.');
    } finally {
      setBusy(false);
    }
  };
  return { apiKey, busy, error, result, run, profile, elapsed };
}

/** Seconds since `on` became true (for "thinking…" messages). */
function useElapsed(on: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    setT(0);
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [on]);
  return t;
}

/** Romanian dictation (Chrome on Android supports it); hidden where the browser cannot. */
function MicButton({ onText }: { onText(t: string): void }) {
  const [on, setOn] = useState(false);
  const Rec =
    (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRec;
        webkitSpeechRecognition?: new () => SpeechRec;
      }
    ).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
  if (!Rec) return null;
  return (
    <button
      type="button"
      aria-label="Dictează"
      onClick={() => {
        const r = new Rec();
        r.lang = 'ro-RO';
        r.interimResults = false;
        r.onresult = (e) => onText(e.results[0][0].transcript);
        r.onend = () => setOn(false);
        setOn(true);
        r.start();
      }}
      className={`absolute right-2.5 bottom-2.5 grid size-11 place-items-center rounded-full text-xl ${on ? 'animate-pulse bg-coral text-white' : 'bg-[#efe8ff]'}`}
    >
      🎙️
    </button>
  );
}
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void;
  onend: () => void;
  start(): void;
};

function NeedKey() {
  const go = useContext(GoTo);
  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-[22px] bg-[#fff4d6] p-4 ring-1 ring-[#ffd166]/70"
      data-testid="need-key"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white">
        <Icon name="key" size={28} />
      </span>
      <div className="text-[15px] leading-snug">
        Pentru idei noi cu AI e nevoie de o cheie Gemini (gratuită din Google AI Studio). O pui o singură dată
        în Setări; rămâne doar pe acest telefon.
        <button
          type="button"
          onClick={() => go('setari')}
          className="mt-2 block rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white"
        >
          Mergi la Setări
        </button>
      </div>
    </div>
  );
}

const ErrorBox = ({ children, testId }: { children: ReactNode; testId?: string }) => (
  <p
    className="mt-3 rounded-[18px] bg-[#ffe9e6] p-3 text-[15px] ring-1 ring-[#ff8a80]/40"
    data-testid={testId}
  >
    {children}
  </p>
);

const PEOPLE: { label: string; icon: IconName }[] = [
  { label: 'Doar copilul', icon: 'teddy-bear' },
  { label: 'Cu un părinte', icon: 'red-heart' },
  { label: 'Cu alți copii', icon: 'busts-in-silhouette' },
  { label: 'Cu bunicii', icon: 'house-with-garden' },
];

function Create() {
  const age = useParent((s) => s.age);
  const [f, setF] = useState<Filters & { theme?: Theme }>({ age });
  const [extra, setExtra] = useState('');
  const [people, setPeople] = useState('');
  const g = useGenerate();
  return (
    <>
      <Hero
        tone={{ from: '#7b5cf0', to: '#e86aa8', dark: true, deco: 'stars' }}
        kicker="Idei noi, doar pentru voi"
        title="Creează cu AI"
        art={
          <div className="relative">
            <Pufi size={104} mood="think" title="Pufi" />
            <Icon name="sparkles" size={44} className="absolute -top-3 -left-5" />
          </div>
        }
      >
        <p className="mt-2 max-w-[60%] text-[16px] leading-snug text-white/90">
          Spune unde sunteți și ce aveți la îndemână. Primești 3 jocuri gata de jucat.
        </p>
      </Hero>
      <div className="mx-auto max-w-xl px-5">
        <div className="relative z-10 -mt-6">
          {!g.apiKey && <NeedKey />}
          <Card>
            <FilterForm f={f} setF={setF} withTheme />
            <Row label="Cine se joacă">
              {PEOPLE.map((p) => (
                <Chip
                  key={p.label}
                  icon={p.icon}
                  on={people === p.label}
                  onClick={() => setPeople(people === p.label ? '' : p.label)}
                >
                  {p.label}
                </Chip>
              ))}
            </Row>
            <div className="relative">
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Ce aveți la îndemână sau ce vreți (ex.: plouă, avem o minge și cretă, e obosită)"
                className="min-h-24 w-full rounded-[18px] bg-[#f7f3ff] p-3.5 pr-14 text-[16px] ring-1 ring-[#b39ddb]/40 outline-none focus:ring-2 focus:ring-[#8b6cf0]"
                maxLength={500}
              />
              <MicButton onText={(t) => setExtra((x) => (x ? `${x} ${t}` : t))} />
            </div>
          </Card>
          <div className="mt-5">
            <BigAction
              testId="generate"
              disabled={!g.apiKey || g.busy}
              onClick={() =>
                g.run(buildPrompt({ ...f, people }, extra, false, g.profile), {
                  age: f.age,
                  where: f.where,
                  source: 'ai',
                })
              }
            >
              {g.busy ? (
                <Thinking label="Pufi se gândește…" seconds={g.elapsed} />
              ) : (
                <>
                  <Icon name="sparkles" size={24} /> Creează 3 idei
                </>
              )}
            </BigAction>
          </div>
          {g.error && <ErrorBox testId="gen-error">{g.error}</ErrorBox>}
          {g.busy && <Skeletons />}
          {g.result && !g.busy && (
            <>
              <SectionTitle icon="party-popper">Ideile voastre</SectionTitle>
              <List items={g.result.activities} empty="" />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Photo() {
  const age = useParent((s) => s.age);
  const [f, setF] = useState<Filters>({ age });
  const [img, setImg] = useState<{ url: string; b64: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const g = useGenerate();
  return (
    <>
      <Hero
        tone={{ from: '#5fd9cb', to: '#178f88', dark: true, deco: 'bubbles' }}
        kicker="Din poză"
        title="Joacă din ce ai prin casă"
        art={<Icon name="camera-with-flash" size={104} className="rotate-[-10deg] drop-shadow-xl" />}
      />
      <div className="mx-auto max-w-xl px-5">
        <div className="relative z-10 -mt-6">
          {!g.apiKey && <NeedKey />}
          <input
            ref={input}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            data-testid="photo-input"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const b64 = await photoToJpeg(file);
              setImg({ url: `data:image/jpeg;base64,${b64}`, b64 });
            }}
          />
          {img ? (
            <div className="relative overflow-hidden rounded-[26px] shadow-[0_14px_34px_-18px_rgba(59,42,74,0.5)]">
              <img src={img.url} alt="Poza aleasă" className="max-h-72 w-full object-cover" />
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[15px] font-semibold backdrop-blur"
              >
                <Icon name="camera-with-flash" size={20} /> Altă poză
              </button>
            </div>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => input.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-[26px] border-[3px] border-dashed border-[#1f9e95]/45 bg-white py-8 text-[17px] font-semibold"
            >
              <span className="grid size-20 place-items-center rounded-full bg-[#e3f8f6]">
                <Icon name="camera-with-flash" size={48} />
              </span>
              Fă o poză sau alege una
              <span className="text-[14px] font-normal text-ink/55">jucării, bucătăria, curtea</span>
            </motion.button>
          )}
          <Callout icon="locked" tone="lagoon">
            Fotografiază <b>obiecte</b>, nu copii. Poza se micșorează și pleacă la Google (Gemini) doar când
            apeși „Creează jocuri”. În varianta gratuită, Google poate folosi datele pentru a-și îmbunătăți
            serviciile.
          </Callout>
          <Card className="mt-4">
            <FilterForm f={f} setF={setF} />
          </Card>
          <div className="mt-5">
            <BigAction
              testId="generate-photo"
              disabled={!g.apiKey || g.busy || !img}
              from="#2ec4b6"
              to="#138a85"
              shade="#0d625e"
              onClick={() =>
                img &&
                g.run(
                  buildPrompt(f, '', true, g.profile),
                  { age: f.age, where: f.where, source: 'poza' },
                  img.b64,
                )
              }
            >
              {g.busy ? (
                <Thinking label="Se uită la poză…" seconds={g.elapsed} />
              ) : (
                <>
                  <Icon name="sparkles" size={24} /> Creează jocuri din poză
                </>
              )}
            </BigAction>
          </div>
          {g.error && <ErrorBox>{g.error}</ErrorBox>}
          {g.busy && <Skeletons />}
          {g.result?.objects.length ? (
            <Callout icon="magnifying-glass-tilted-left" tone="cave" title="Am văzut">
              {g.result.objects.join(', ')}
            </Callout>
          ) : null}
          {g.result && !g.busy && (
            <>
              <SectionTitle icon="party-popper">Jocuri din poză</SectionTitle>
              <List items={g.result.activities} empty="" />
            </>
          )}
        </div>
      </div>
    </>
  );
}

const DAY_SHORT = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
const DAY_COLOR = ['#8b6cf0', '#2ec4b6', '#ff8a62', '#5aa83a', '#e86aa8', '#f2a23a', '#4c8df0'];

function Plan() {
  const { saved, plan, removeFromPlan, apiKey, model, age, profile, setWeek, history } = useParent();
  const [open, setOpen] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const elapsed = useElapsed(busy);
  const favorites = Object.values(saved);
  const todayIdx = weekdayIndex(new Date());
  const dateLabel = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const makeWeek = async () => {
    setBusy(true);
    setErr('');
    try {
      const json = await generateJson({
        apiKey,
        model,
        prompt: buildWeekPrompt(age, profile),
        schema: activitySchema(7),
      });
      const r = parseActivities(json, { age, source: 'ai' });
      if (r.activities.length < 5) throw new GeminiError('Planul a ieșit incomplet. Mai încearcă o dată.');
      setWeek(r.activities);
    } catch (e) {
      setErr(e instanceof GeminiError ? e.message : 'Nu a mers. Mai încearcă o dată.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Hero
        tone={{ from: '#ffe3bf', to: '#ffb0a0', deco: 'clouds' }}
        kicker={dateLabel}
        title="Planul săptămânii"
        art={<Icon name="spiral-calendar" size={100} className="rotate-[8deg] drop-shadow-xl" />}
      />
      <div className="mx-auto max-w-xl px-5">
        <Card className="relative z-10 -mt-6">
          <div className="flex justify-between gap-1">
            {DAY_SHORT.map((d, i) => {
              const n = (plan[i] ?? []).filter((id) => saved[id]).length;
              return (
                <div key={d} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={`grid size-10 place-items-center rounded-full text-[14px] font-bold ${i === todayIdx ? 'text-white' : 'bg-ink/[0.05] text-ink/70'}`}
                    style={i === todayIdx ? { background: DAY_COLOR[i] } : undefined}
                  >
                    {d}
                  </span>
                  <span
                    className="size-2 rounded-full"
                    style={{ background: n ? DAY_COLOR[i] : 'transparent' }}
                  />
                </div>
              );
            })}
          </div>
          {apiKey && (
            <div className="mt-4">
              <BigAction testId="week-ai" disabled={busy} onClick={() => void makeWeek()}>
                {busy ? (
                  <Thinking label="Planific…" seconds={elapsed} />
                ) : (
                  <>
                    <Icon name="sparkles" size={24} /> Plan cu AI
                  </>
                )}
              </BigAction>
            </div>
          )}
        </Card>
        {err && <ErrorBox>{err}</ErrorBox>}
        <div className="mt-5 space-y-2.5">
          {DAYS.map((d, i) => {
            const ids = (plan[i] ?? []).filter((id) => saved[id]);
            return (
              <div
                key={d}
                className={`relative overflow-hidden rounded-[20px] bg-white pr-3 pl-5 ${ids.length ? 'py-3' : 'py-2.5'} ${i === todayIdx ? '' : 'ring-1 ring-ink/[0.06]'}`}
                style={i === todayIdx ? { boxShadow: `0 0 0 2px ${DAY_COLOR[i]}` } : undefined}
              >
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: DAY_COLOR[i] }} />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {d}
                    {i === todayIdx && (
                      <span
                        className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                        style={{ background: DAY_COLOR[i] }}
                      >
                        azi
                      </span>
                    )}
                  </span>
                  {!ids.length && <span className="text-[14px] text-ink/40">liber</span>}
                </div>
                {ids.map((id) => (
                  <div key={id} className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 text-left"
                      onClick={() => setOpen(saved[id])}
                    >
                      <Icon name={lookOf(saved[id]).icon} size={24} />
                      <span className="truncate text-[15.5px] font-medium">{saved[id].title}</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Scoate din plan"
                      onClick={() => removeFromPlan(i, id)}
                      className="grid size-9 shrink-0 place-items-center rounded-full text-ink/45 hover:bg-ink/5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <SectionTitle icon="red-heart">{`Salvate (${favorites.length})`}</SectionTitle>
        <List items={favorites} empty="Apasă ♥ pe o idee ca s-o păstrezi aici." />
        <SectionTitle icon="sparkles">{`Istoric idei AI (${history.length})`}</SectionTitle>
        <List items={history} empty="Ideile create cu AI apar aici." />
        <AnimatePresence>{open && <Detail a={open} onClose={() => setOpen(null)} />}</AnimatePresence>
      </div>
    </>
  );
}

function Settings() {
  const { apiKey, setKey, model, setModel } = useParent();
  const [k, setK] = useState(apiKey);
  const [show, setShow] = useState(false);
  const [m, setM] = useState(model);
  const [msg, setMsg] = useState('');
  return (
    <>
      <Hero
        tone={{ from: '#efe8ff', to: '#cbb9f7', deco: 'clouds' }}
        kicker="Insula · Părinți"
        title="Setări"
        art={<Icon name="gear" size={92} className="rotate-[12deg] drop-shadow-xl" />}
      />
      <div className="mx-auto max-w-xl space-y-4 px-5">
        <div className="relative z-10 -mt-6">
          <ProfileCard />
        </div>
        <Card>
          <h2 className="flex items-center gap-2 text-[19px] font-bold">
            <Icon name="key" size={26} /> Cheia Gemini
          </h2>
          <p className="mt-1.5 text-[14.5px] text-ink/70">
            Faci una gratuit în Google AI Studio („Get API key”). Rămâne salvată doar pe acest telefon.
            Recomandat: în Google Cloud, restricționează cheia la site-ul <code>andrei3090.github.io</code>.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type={show ? 'text' : 'password'}
              value={k}
              onChange={(e) => setK(e.target.value)}
              placeholder="Lipește cheia aici"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-[16px] bg-[#f7f3ff] px-3.5 py-3 ring-1 ring-[#b39ddb]/40 outline-none focus:ring-2 focus:ring-[#8b6cf0]"
              data-testid="key-input"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="rounded-[16px] bg-ink/[0.05] px-3.5 font-medium"
            >
              {show ? 'Ascunde' : 'Arată'}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-[16px] bg-gradient-to-br from-[#8b6cf0] to-[#6a4bc9] px-5 py-2.5 font-semibold text-white shadow-[0_4px_0_#4d3599]"
              onClick={() => {
                setKey(k);
                setMsg(k.trim() ? 'Cheie salvată.' : 'Cheie ștearsă.');
              }}
            >
              Salvează
            </button>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="rounded-[16px] bg-ink/[0.05] px-4 py-2.5 font-medium"
            >
              Deschide AI Studio
            </a>
          </div>
          {msg && <p className="mt-2 text-[14px] font-medium text-bamboo-deep">{msg}</p>}
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 text-[19px] font-bold">
            <Icon name="robot" size={26} /> Modelul AI
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { id: DEFAULT_MODEL, title: 'Rapid', sub: '~6 secunde', icon: 'high-voltage' as IconName },
              { id: DETAILED_MODEL, title: 'Detaliat', sub: '~1 minut', icon: 'books' as IconName },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setM(o.id);
                  setModel(o.id);
                }}
                className={`flex items-center gap-2.5 rounded-[18px] p-3 text-left ring-1 transition ${m === o.id ? 'bg-[#efe8ff] ring-2 ring-[#8b6cf0]' : 'bg-white ring-ink/10'}`}
              >
                <Icon name={o.icon} size={30} />
                <span>
                  <span className="block font-semibold">{o.title}</span>
                  <span className="block text-[13px] text-ink/60">{o.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <input
            value={m}
            onChange={(e) => setM(e.target.value)}
            onBlur={() => setModel(m)}
            className="mt-3 w-full rounded-[14px] bg-[#f7f3ff] px-3 py-2 text-[13px] text-ink/70 ring-1 ring-[#b39ddb]/40"
            aria-label="Numele modelului"
          />
        </Card>
        <Card className="text-[14.5px] text-ink/70">
          <h2 className="flex items-center gap-2 text-[19px] font-bold text-ink">
            <Icon name="locked" size={26} /> Despre
          </h2>
          <p className="mt-1.5">
            Aplicația pentru copil nu folosește internet și nici AI. Doar această aplicație pentru părinți
            trimite cererile tale către Gemini, de pe telefonul tău.
          </p>
          <a
            href="../"
            className="mt-3 flex items-center gap-3 rounded-[18px] bg-gradient-to-br from-[#bfe8ff] to-[#d8f5d0] p-3 font-semibold text-ink"
          >
            <Pufi size={48} mood="wave" title="Pufi" />
            Deschide Insula Jocurilor (pentru copil)
          </a>
        </Card>
      </div>
    </>
  );
}

/** Bedtime first: it is the default topic. */
const TOPIC_ORDER = [
  'somn',
  ...(Object.keys(STORY_TOPICS) as StoryTopic[]).filter((t) => t !== 'somn'),
] as StoryTopic[];

const STORY_LABEL: Record<StoryTopic, string> = {
  somn: 'Somn liniștit',
  curaj: 'Curaj',
  prietenie: 'Prietenie',
  emotii: 'Emoții',
  numere: 'Numere',
  litere: 'Litere',
  natura: 'Natură',
};

/** Reads paragraphs aloud with the phone's Romanian voice (never an English fallback). */
function useReader() {
  const [reading, setReading] = useState<number | null>(null);
  const stop = () => {
    window.speechSynthesis?.cancel();
    setReading(null);
  };
  const roVoice = () =>
    window.speechSynthesis?.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ro'));
  const read = (paras: string[], from = 0) => {
    const synth = window.speechSynthesis;
    const v = roVoice();
    if (!synth || !v || from >= paras.length) {
      setReading(null);
      return;
    }
    setReading(from);
    const u = new SpeechSynthesisUtterance(paras[from]);
    u.voice = v;
    u.lang = 'ro-RO';
    u.rate = 0.9;
    u.onend = () => read(paras, from + 1);
    synth.speak(u);
  };
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return { reading, read, stop, canRead: () => !!roVoice() };
}

function StoryTab() {
  const { apiKey, model, age, profile, stories, addStory } = useParent();
  const [topic, setTopic] = useState<StoryTopic>('somn');
  const [theme, setTheme] = useState<Theme | undefined>('pufi');
  const [minutes, setMinutes] = useState(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [current, setCurrent] = useState<Story | null>(stories[0] ?? null);
  const elapsed = useElapsed(busy);
  const reader = useReader();
  const make = async () => {
    setBusy(true);
    setErr('');
    reader.stop();
    try {
      const json = await generateJson({
        apiKey,
        model,
        prompt: buildStoryPrompt({ age, topic, minutes, theme, profile }),
        schema: STORY_SCHEMA as unknown as Record<string, unknown>,
      });
      const st = parseStory(json);
      if (!st) throw new GeminiError('Povestea nu a ieșit bine. Mai încearcă o dată.');
      addStory(st);
      setCurrent(st);
    } catch (e) {
      setErr(e instanceof GeminiError ? e.message : 'Nu a mers. Mai încearcă o dată.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Hero
        tone={{ from: '#1b1540', to: '#4b3a8c', dark: true, deco: 'stars' }}
        kicker="Pufi scrie, telefonul citește"
        title="Poveste de seară"
        art={
          <div className="relative">
            <Icon name="crescent-moon" size={58} className="absolute -top-2 -left-12 rotate-[-15deg]" />
            <Pufi size={100} mood="idle" title="Pufi" />
          </div>
        }
      />
      <div className="mx-auto max-w-xl px-5">
        <div className="relative z-10 -mt-6">
          {!apiKey && <NeedKey />}
          <Card>
            <Row label="Despre ce">
              {TOPIC_ORDER.map((t) => (
                <Chip key={t} icon={TOPIC_ICON[t]} on={topic === t} onClick={() => setTopic(t)}>
                  {STORY_LABEL[t]}
                </Chip>
              ))}
            </Row>
            <Row label="Cu personajul">
              {(Object.keys(THEMES) as Theme[]).map((t) => (
                <Chip
                  key={t}
                  icon={THEME_ICON[t]}
                  on={theme === t}
                  onClick={() => setTheme(theme === t ? undefined : t)}
                >
                  {SHORT_THEME[t]}
                </Chip>
              ))}
            </Row>
            <Row label="Cât de lungă">
              {[3, 5, 8].map((m) => (
                <Chip key={m} icon="stopwatch" on={minutes === m} onClick={() => setMinutes(m)}>
                  {m} minute
                </Chip>
              ))}
            </Row>
          </Card>
          <div className="mt-5">
            <BigAction
              testId="make-story"
              disabled={!apiKey || busy}
              onClick={() => void make()}
              from="#5546b8"
              to="#2b2366"
              shade="#1a1545"
            >
              {busy ? (
                <Thinking label="Pufi scrie povestea…" seconds={elapsed} />
              ) : (
                <>
                  <Icon name="crescent-moon" size={24} /> Scrie o poveste de seară
                </>
              )}
            </BigAction>
          </div>
          {err && <ErrorBox>{err}</ErrorBox>}
          {current && (
            <motion.article
              key={current.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mt-6 overflow-hidden rounded-[30px] bg-[#fffdf7] px-5 pt-6 pb-6 shadow-[0_20px_40px_-22px_rgba(43,35,102,0.6)] ring-1 ring-[#e9dcc0]"
              data-testid="story"
            >
              <span className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-[#5546b8] to-[#e86aa8]" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-semibold tracking-[0.1em] text-[#5546b8]/70 uppercase">
                    A fost odată…
                  </div>
                  <h2 className="mt-1 text-[25px] leading-[1.15] font-bold">{current.title}</h2>
                </div>
                {reader.reading === null ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    aria-label="Citește"
                    onClick={() =>
                      reader.canRead()
                        ? reader.read(current.paragraphs)
                        : setErr('Telefonul nu are o voce în română instalată.')
                    }
                    className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2ec4b6] to-[#138a85] text-[22px] text-white shadow-[0_4px_0_#0d625e]"
                  >
                    ▶
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    aria-label="Oprește"
                    onClick={reader.stop}
                    className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff8a80] to-[#e5533c] text-[20px] text-white shadow-[0_4px_0_#a4321f]"
                  >
                    ■
                  </motion.button>
                )}
              </div>
              <div className="my-4 flex items-center gap-2 text-[#c9b37a]" aria-hidden="true">
                <span className="h-px flex-1 bg-current opacity-50" />
                <Icon name="glowing-star" size={18} />
                <span className="h-px flex-1 bg-current opacity-50" />
              </div>
              <div className="space-y-3.5 font-school text-[19px] leading-[1.65]">
                {current.paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className={`rounded-xl px-1 transition ${reader.reading === i ? 'bg-[#ffd166]/40' : ''} ${i === 0 ? 'first-letter:float-left first-letter:mt-1 first-letter:mr-2 first-letter:text-[52px] first-letter:leading-[0.8] first-letter:font-bold first-letter:text-[#5546b8]' : ''}`}
                  >
                    {p}
                  </p>
                ))}
              </div>
              {current.questions.length > 0 && (
                <Callout icon="thought-balloon" tone="cave" title="Întrebări după poveste">
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {current.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </Callout>
              )}
            </motion.article>
          )}
          {stories.length > 1 && (
            <>
              <SectionTitle icon="books">Poveștile de până acum</SectionTitle>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
                {stories.map((st) => (
                  <Chip
                    key={st.id}
                    icon="open-book"
                    on={current?.id === st.id}
                    onClick={() => setCurrent(st)}
                  >
                    {st.title}
                  </Chip>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const INTERESTS = [
  'pandași',
  'urși',
  'prințese',
  'ocean',
  'animale',
  'dinozauri',
  'mașini',
  'muzică',
  'desen',
  'dans',
  'natură',
  'gătit',
];

function ProfileCard() {
  const { profile, setProfile } = useParent();
  const toggle = (x: string) =>
    setProfile({
      interests: profile.interests.includes(x)
        ? profile.interests.filter((i) => i !== x)
        : [...profile.interests, x],
    });
  return (
    <Card testId="profile">
      <div className="flex items-center gap-3">
        <span className="grid size-16 shrink-0 place-items-center rounded-[22px] bg-gradient-to-br from-[#d8f5d0] to-[#bfe8ff]">
          <Pufi size={56} mood="happy" title="Pufi" />
        </span>
        <div>
          <h2 className="text-[19px] leading-tight font-bold">Profilul copilului</h2>
          <p className="text-[14px] text-ink/60">Folosit în toate ideile și poveștile.</p>
        </div>
      </div>
      <input
        value={profile.nickname}
        onChange={(e) => setProfile({ nickname: e.target.value.slice(0, 20) })}
        placeholder="Poreclă (opțional)"
        className="mt-4 w-full rounded-[16px] bg-[#f7f3ff] px-3.5 py-3 text-[16px] ring-1 ring-[#b39ddb]/40 outline-none focus:ring-2 focus:ring-[#8b6cf0]"
      />
      <p className="mt-1.5 text-[13px] text-ink/50">Doar o poreclă, nu numele complet.</p>
      <SubTitle>Îi place</SubTitle>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((x) => (
          <Chip key={x} on={profile.interests.includes(x)} onClick={() => toggle(x)}>
            {x}
          </Chip>
        ))}
      </div>
      <SubTitle>Acum învață</SubTitle>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SKILLS) as Skill[]).map((k) => (
          <Chip
            key={k}
            icon={lookOf({ skills: [k] }).icon}
            on={profile.learning.includes(k)}
            onClick={() =>
              setProfile({
                learning: profile.learning.includes(k)
                  ? profile.learning.filter((x) => x !== k)
                  : [...profile.learning, k],
              })
            }
          >
            {SKILLS[k]}
          </Chip>
        ))}
      </div>
      <input
        value={profile.avoid}
        onChange={(e) => setProfile({ avoid: e.target.value.slice(0, 200) })}
        placeholder="De evitat (ex.: zgomote puternice, apă)"
        className="mt-4 w-full rounded-[16px] bg-[#f7f3ff] px-3.5 py-3 text-[16px] ring-1 ring-[#b39ddb]/40 outline-none focus:ring-2 focus:ring-[#8b6cf0]"
      />
    </Card>
  );
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'idei', label: 'Idei', icon: 'light-bulb' },
  { id: 'creeaza', label: 'Creează', icon: 'sparkles' },
  { id: 'poveste', label: 'Poveste', icon: 'crescent-moon' },
  { id: 'poza', label: 'Din poză', icon: 'camera-with-flash' },
  { id: 'plan', label: 'Plan', icon: 'spiral-calendar' },
  { id: 'setari', label: 'Setări', icon: 'gear' },
];

export function ParentApp() {
  const [tab, setTab] = useState<Tab>('idei');
  const main = useRef<HTMLElement>(null);
  const go = (t: Tab) => {
    setTab(t);
    main.current?.scrollTo({ top: 0 });
  };
  return (
    <GoTo.Provider value={go}>
      <div className="relative h-full" style={{ background: PAGE }}>
        <main ref={main} className="h-full overflow-auto pb-32" data-testid={`tab-${tab}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {tab === 'idei' && <Ideas />}
              {tab === 'creeaza' && <Create />}
              {tab === 'poveste' && <StoryTab />}
              {tab === 'poza' && <Photo />}
              {tab === 'plan' && <Plan />}
              {tab === 'setari' && <Settings />}
            </motion.div>
          </AnimatePresence>
        </main>
        <nav className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),12px)] z-40 mx-auto grid max-w-xl grid-cols-6 rounded-[28px] bg-white/80 p-1.5 shadow-[0_14px_34px_-12px_rgba(59,42,74,0.5)] ring-1 ring-white backdrop-blur-xl">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`nav-${t.id}`}
                aria-current={on ? 'page' : undefined}
                onClick={() => go(t.id)}
                className={`relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-[22px] text-[11.5px] ${on ? 'font-semibold text-[#4d3599]' : 'text-ink/55'}`}
              >
                {on && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-[22px] bg-[#efe8ff]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <motion.span className="relative" animate={{ scale: on ? 1.12 : 1, y: on ? -1 : 0 }}>
                  <Icon name={t.icon} size={26} />
                </motion.span>
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </GoTo.Provider>
  );
}
