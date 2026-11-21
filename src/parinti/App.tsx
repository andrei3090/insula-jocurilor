import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
import { LIBRARY } from './library';
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

type Tab = 'idei' | 'creeaza' | 'poveste' | 'poza' | 'plan' | 'setari';

const Chip = ({
  on,
  onClick,
  children,
  testId,
}: {
  on?: boolean;
  onClick(): void;
  children: ReactNode;
  testId?: string;
}) => (
  <button
    type="button"
    data-testid={testId}
    onClick={onClick}
    className={`min-h-10 shrink-0 rounded-full border-2 px-3 text-[15px] whitespace-nowrap transition ${on ? 'border-cave-deep bg-cave-deep text-white' : 'border-cave/50 bg-white'}`}
  >
    {children}
  </button>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mb-2">
    <div className="mb-1 text-xs font-medium tracking-wide text-ink/55 uppercase">{label}</div>
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">{children}</div>
  </div>
);

function FilterForm({
  f,
  setF,
  withTheme,
}: {
  f: Filters & { theme?: Theme };
  setF(f: Filters & { theme?: Theme }): void;
  withTheme?: boolean;
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
            {a}
          </Chip>
        ))}
      </Row>
      <Row label="Unde">
        {(Object.keys(WHERE) as Where[]).map((w) => (
          <Chip
            key={w}
            testId={`where-${w}`}
            on={f.where === w}
            onClick={() => setF({ ...f, where: f.where === w ? undefined : w })}
          >
            {WHERE[w]}
          </Chip>
        ))}
      </Row>
      <Row label="Cât timp">
        {[5, 10, 15, 30].map((m) => (
          <Chip
            key={m}
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

function Card({ a, onOpen }: { a: Activity; onOpen(): void }) {
  const saved = useParent((s) => !!s.saved[a.id]);
  const done = useParent((s) => s.done[a.id]);
  return (
    <motion.button
      layout
      type="button"
      data-testid="activity"
      onClick={onOpen}
      className="w-full rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-cave/30"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold leading-tight">{a.title}</h3>
        <span className="shrink-0 text-sm text-ink/60">{a.minutes} min</span>
      </div>
      <p className="mt-1 text-sm text-ink/70">{a.goal}</p>
      <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {a.source !== 'biblioteca' && (
          <span className="rounded-full bg-sun/60 px-2 py-0.5">nou, creat acum</span>
        )}
        {saved && <span className="rounded-full bg-castle px-2 py-0.5">♥ salvat</span>}
        {done && (
          <span className="rounded-full bg-bamboo/60 px-2 py-0.5">
            ✓ făcut {['', '🙁', '😐', '😀'][done.rating]}
          </span>
        )}
        {a.skills.map((s) => (
          <span key={s} className="rounded-full bg-cave/20 px-2 py-0.5">
            {SKILLS[s]}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <h4 className="font-semibold">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
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

function Detail({ a: initial, onClose }: { a: Activity; onClose(): void }) {
  const { saved, toggleSave, addToPlan, markDone, apiKey, model, age, profile, replace } = useParent();
  const [a, setA] = useState(initial);
  const [day, setDay] = useState<number | null>(null);
  const [busy, setBusy] = useState<RefineHow | null>(null);
  const [err, setErr] = useState('');
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
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      data-testid="detail"
    >
      <motion.div
        className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-paper p-5 sm:rounded-3xl"
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-semibold">{a.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-3 py-1 text-lg"
            aria-label="Închide"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-ink/60">
          {a.minutes} min · {ENERGY[a.energy]} · {a.ages[0]}–{a.ages[1]} ani ·{' '}
          {a.where.map((w) => WHERE[w]).join(', ')}
          {a.theme ? ` · ${THEMES[a.theme]}` : ''}
        </p>
        <p className="mt-3 rounded-2xl bg-white p-3">
          <b>Ce învață:</b> {a.goal}
        </p>
        <Section title="Ai nevoie de" items={a.materials} />
        <Section title="Pregătire" items={a.setup} />
        <Section title="Cum vă jucați" items={a.play} />
        {a.older && (
          <p className="mt-3">
            <b>Pentru 6–10 ani:</b> {a.older}
          </p>
        )}
        {a.safety && <p className="mt-3 rounded-2xl bg-coral/15 p-3 text-sm">⚠️ {a.safety}</p>}
        {apiKey && (
          <div className="mt-4" data-testid="refine">
            <div className="text-sm text-ink/60">✨ Ajustează cu AI</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {(Object.keys(REFINE) as RefineHow[]).map((h) => (
                <Chip key={h} on={busy === h} onClick={() => !busy && void refine(h)} testId={`refine-${h}`}>
                  {busy === h ? 'Se rescrie…' : REFINE_LABEL[h]}
                </Chip>
              ))}
            </div>
            {err && <p className="mt-2 rounded-2xl bg-coral/20 p-2 text-sm">{err}</p>}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip on={!!saved[a.id]} onClick={() => toggleSave(a)} testId="save-activity">
            ♥ {saved[a.id] ? 'Salvat' : 'Salvează'}
          </Chip>
          <Chip
            on={day !== null}
            onClick={() =>
              setDay(day === null ? (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) : null)
            }
          >
            📅 Pune în plan
          </Chip>
        </div>
        {day !== null && (
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <Chip
                key={d}
                onClick={() => {
                  addToPlan(i, a);
                  setDay(null);
                }}
              >
                {d}
              </Chip>
            ))}
          </div>
        )}
        <div className="mt-4">
          <div className="text-sm text-ink/60">Ați făcut-o? Cum i-a plăcut?</div>
          <div className="mt-1 flex gap-2 text-3xl">
            {([3, 2, 1] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => markDone(a.id, r)}
                className="rounded-2xl bg-white px-3 py-1"
                aria-label={`notă ${r}`}
              >
                {['', '🙁', '😐', '😀'][r]}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function List({ items, empty }: { items: Activity[]; empty: string }) {
  const [open, setOpen] = useState<Activity | null>(null);
  return (
    <>
      <div className="mt-2 space-y-3">
        {items.map((a) => (
          <Card key={a.id} a={a} onOpen={() => setOpen(a)} />
        ))}
        {!items.length && <p className="rounded-2xl bg-white/60 p-4 text-ink/60">{empty}</p>}
      </div>
      <AnimatePresence>{open && <Detail a={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}

function Ideas() {
  const age = useParent((s) => s.age);
  const [f, setF] = useState<Filters>({ age });
  const items = useMemo(() => filterActivities(LIBRARY, f), [f]);
  return (
    <>
      <FilterForm f={f} setF={setF} />
      <p className="mt-3 text-sm text-ink/60" data-testid="count">
        {items.length} idei
      </p>
      <List items={items} empty="Nicio idee cu toate filtrele astea. Scoate unul sau încearcă „Creează”." />
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

const Thinking = ({ label, seconds }: { label: string; seconds: number }) => (
  <span className="inline-flex items-center gap-2">
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
    >
      🐼
    </motion.span>
    {label} {seconds > 2 ? `${seconds}s` : ''}
  </span>
);

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
      className={`absolute right-2 bottom-5 grid size-11 place-items-center rounded-full text-xl ${on ? 'animate-pulse bg-coral text-white' : 'bg-cave/20'}`}
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

const NeedKey = () => (
  <p className="rounded-2xl bg-sun/40 p-4" data-testid="need-key">
    Pentru idei noi cu AI e nevoie de o cheie Gemini (gratuită din Google AI Studio). O pui o singură dată în{' '}
    <b>Setări</b>; rămâne doar pe acest telefon.
  </p>
);

function Create() {
  const age = useParent((s) => s.age);
  const [f, setF] = useState<Filters & { theme?: Theme }>({ age });
  const [extra, setExtra] = useState('');
  const [people, setPeople] = useState('');
  const g = useGenerate();
  return (
    <>
      {!g.apiKey && <NeedKey />}
      <FilterForm f={f} setF={setF} withTheme />
      <Row label="Cine se joacă">
        {['Doar copilul', 'Cu un părinte', 'Cu alți copii', 'Cu bunicii'].map((p) => (
          <Chip key={p} on={people === p} onClick={() => setPeople(people === p ? '' : p)}>
            {p}
          </Chip>
        ))}
      </Row>
      <div className="relative">
        <textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Ce aveți la îndemână sau ce vreți (ex.: plouă, avem o minge și cretă, e obosită)"
          className="mb-3 min-h-20 w-full rounded-2xl border-2 border-cave/40 bg-white p-3 pr-14 text-base"
          maxLength={500}
        />
        <MicButton onText={(t) => setExtra((x) => (x ? `${x} ${t}` : t))} />
      </div>
      <button
        type="button"
        data-testid="generate"
        disabled={!g.apiKey || g.busy}
        onClick={() =>
          g.run(buildPrompt({ ...f, people }, extra, false, g.profile), {
            age: f.age,
            where: f.where,
            source: 'ai',
          })
        }
        className="w-full rounded-2xl bg-cave-deep py-4 text-lg font-semibold text-white disabled:opacity-40"
      >
        {g.busy ? <Thinking label="Se gândește…" seconds={g.elapsed} /> : '✨ Creează 3 idei'}
      </button>
      {g.error && (
        <p className="mt-3 rounded-2xl bg-coral/20 p-3" data-testid="gen-error">
          {g.error}
        </p>
      )}
      {g.result && <List items={g.result.activities} empty="" />}
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
      {!g.apiKey && <NeedKey />}
      <p className="mb-3 rounded-2xl bg-white/70 p-3 text-sm text-ink/70">
        Fotografiază <b>obiecte</b> (jucării, bucătăria, curtea), nu copii. Poza se micșorează și pleacă la
        Google (Gemini) doar când apeși „Creează jocuri”. În varianta gratuită, Google poate folosi datele
        pentru a-și îmbunătăți serviciile.
      </p>
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
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="mb-3 w-full rounded-2xl border-2 border-dashed border-cave-deep bg-white py-6 text-lg"
      >
        📷 {img ? 'Altă poză' : 'Fă o poză sau alege una'}
      </button>
      {img && (
        <img src={img.url} alt="Poza aleasă" className="mb-3 max-h-64 w-full rounded-2xl object-cover" />
      )}
      <FilterForm f={f} setF={setF} />
      <button
        type="button"
        data-testid="generate-photo"
        disabled={!g.apiKey || g.busy || !img}
        onClick={() =>
          img &&
          g.run(buildPrompt(f, '', true, g.profile), { age: f.age, where: f.where, source: 'poza' }, img.b64)
        }
        className="w-full rounded-2xl bg-cave-deep py-4 text-lg font-semibold text-white disabled:opacity-40"
      >
        {g.busy ? <Thinking label="Se uită la poză…" seconds={g.elapsed} /> : '✨ Creează jocuri din poză'}
      </button>
      {g.error && <p className="mt-3 rounded-2xl bg-coral/20 p-3">{g.error}</p>}
      {g.result?.objects.length ? (
        <p className="mt-3 text-sm text-ink/70">
          <b>Am văzut:</b> {g.result.objects.join(', ')}
        </p>
      ) : null}
      {g.result && <List items={g.result.activities} empty="" />}
    </>
  );
}

function Plan() {
  const { saved, plan, removeFromPlan, apiKey, model, age, profile, setWeek, history } = useParent();
  const [open, setOpen] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const elapsed = useElapsed(busy);
  const favorites = Object.values(saved);
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
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Săptămâna</h2>
        {apiKey && (
          <button
            type="button"
            data-testid="week-ai"
            disabled={busy}
            onClick={() => void makeWeek()}
            className="rounded-2xl bg-cave-deep px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? <Thinking label="Planific…" seconds={elapsed} /> : '✨ Plan cu AI'}
          </button>
        )}
      </div>
      {err && <p className="mb-2 rounded-2xl bg-coral/20 p-2 text-sm">{err}</p>}
      <div className="space-y-2">
        {DAYS.map((d, i) => (
          <div key={d} className="rounded-2xl bg-white p-3">
            <div className="font-semibold">{d}</div>
            {(plan[i] ?? []).map((id) =>
              saved[id] ? (
                <div key={id} className="mt-1 flex items-center justify-between gap-2">
                  <button type="button" className="text-left underline" onClick={() => setOpen(saved[id])}>
                    {saved[id].title}
                  </button>
                  <button
                    type="button"
                    aria-label="Scoate din plan"
                    onClick={() => removeFromPlan(i, id)}
                    className="px-2 text-ink/50"
                  >
                    ✕
                  </button>
                </div>
              ) : null,
            )}
            {!(plan[i] ?? []).length && <div className="text-sm text-ink/40">liber</div>}
          </div>
        ))}
      </div>
      <h2 className="mt-5 mb-2 text-xl font-semibold">Salvate ({favorites.length})</h2>
      <List items={favorites} empty="Apasă ♥ pe o idee ca s-o păstrezi aici." />
      <h2 className="mt-5 mb-2 text-xl font-semibold">Istoric idei AI ({history.length})</h2>
      <List items={history} empty="Ideile create cu AI apar aici." />
      <AnimatePresence>{open && <Detail a={open} onClose={() => setOpen(null)} />}</AnimatePresence>
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
    <div className="space-y-4">
      <ProfileCard />
      <section className="rounded-3xl bg-white p-4">
        <h2 className="text-lg font-semibold">Cheia Gemini</h2>
        <p className="mt-1 text-sm text-ink/70">
          Faci una gratuit în Google AI Studio („Get API key”). Rămâne salvată doar pe acest telefon.
          Recomandat: în Google Cloud, restricționează cheia la site-ul <code>andrei3090.github.io</code>.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type={show ? 'text' : 'password'}
            value={k}
            onChange={(e) => setK(e.target.value)}
            placeholder="Lipește cheia aici"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border-2 border-cave/40 px-3 py-2"
            data-testid="key-input"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="rounded-xl bg-paper px-3">
            {show ? 'Ascunde' : 'Arată'}
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded-xl bg-cave-deep px-4 py-2 text-white"
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
            className="rounded-xl bg-paper px-4 py-2"
          >
            Deschide AI Studio
          </a>
        </div>
        {msg && <p className="mt-2 text-sm text-bamboo-deep">{msg}</p>}
      </section>
      <section className="rounded-3xl bg-white p-4">
        <h2 className="text-lg font-semibold">Modelul AI</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip
            on={m === DEFAULT_MODEL}
            onClick={() => {
              setM(DEFAULT_MODEL);
              setModel(DEFAULT_MODEL);
            }}
          >
            ⚡ Rapid (~6 secunde)
          </Chip>
          <Chip
            on={m === DETAILED_MODEL}
            onClick={() => {
              setM(DETAILED_MODEL);
              setModel(DETAILED_MODEL);
            }}
          >
            🧠 Detaliat (~1 minut)
          </Chip>
        </div>
        <input
          value={m}
          onChange={(e) => setM(e.target.value)}
          onBlur={() => setModel(m)}
          className="mt-2 w-full rounded-xl border-2 border-cave/40 px-3 py-2 text-sm"
          aria-label="Numele modelului"
        />
      </section>
      <section className="rounded-3xl bg-white p-4 text-sm text-ink/70">
        <h2 className="text-lg font-semibold text-ink">Despre</h2>
        Aplicația pentru copil nu folosește internet și nici AI. Doar această aplicație pentru părinți trimite
        cererile tale către Gemini, de pe telefonul tău.
        <a href="../" className="mt-2 block underline">
          Deschide Insula Jocurilor (pentru copil)
        </a>
      </section>
    </div>
  );
}

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
      {!apiKey && <NeedKey />}
      <Row label="Despre ce">
        {(Object.keys(STORY_TOPICS) as StoryTopic[]).map((t) => (
          <Chip key={t} on={topic === t} onClick={() => setTopic(t)}>
            {STORY_LABEL[t]}
          </Chip>
        ))}
      </Row>
      <Row label="Cu personajul">
        {(Object.keys(THEMES) as Theme[]).map((t) => (
          <Chip key={t} on={theme === t} onClick={() => setTheme(theme === t ? undefined : t)}>
            {THEMES[t]}
          </Chip>
        ))}
      </Row>
      <Row label="Cât de lungă">
        {[3, 5, 8].map((m) => (
          <Chip key={m} on={minutes === m} onClick={() => setMinutes(m)}>
            {m} minute
          </Chip>
        ))}
      </Row>
      <button
        type="button"
        data-testid="make-story"
        disabled={!apiKey || busy}
        onClick={() => void make()}
        className="mt-1 w-full rounded-2xl bg-cave-deep py-4 text-lg font-semibold text-white disabled:opacity-40"
      >
        {busy ? <Thinking label="Pufi scrie povestea…" seconds={elapsed} /> : '🌙 Scrie o poveste de seară'}
      </button>
      {err && <p className="mt-3 rounded-2xl bg-coral/20 p-3">{err}</p>}
      {current && (
        <article className="mt-4 rounded-3xl bg-white p-5 shadow-sm" data-testid="story">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-2xl font-semibold">{current.title}</h2>
            {reader.reading === null ? (
              <button
                type="button"
                onClick={() =>
                  reader.canRead()
                    ? reader.read(current.paragraphs)
                    : setErr('Telefonul nu are o voce în română instalată.')
                }
                className="shrink-0 rounded-full bg-lagoon px-4 py-2 text-white"
              >
                ▶︎ Citește
              </button>
            ) : (
              <button
                type="button"
                onClick={reader.stop}
                className="shrink-0 rounded-full bg-coral px-4 py-2 text-white"
              >
                ■ Oprește
              </button>
            )}
          </div>
          <div className="mt-3 space-y-3 font-school text-[19px] leading-relaxed">
            {current.paragraphs.map((p, i) => (
              <p key={i} className={`rounded-xl px-1 transition ${reader.reading === i ? 'bg-sun/40' : ''}`}>
                {p}
              </p>
            ))}
          </div>
          {current.questions.length > 0 && (
            <div className="mt-4 rounded-2xl bg-cave/15 p-3">
              <div className="font-semibold">Întrebări după poveste</div>
              <ul className="mt-1 list-disc pl-5">
                {current.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </article>
      )}
      {stories.length > 1 && (
        <Row label="Poveștile de până acum">
          {stories.map((st) => (
            <Chip key={st.id} on={current?.id === st.id} onClick={() => setCurrent(st)}>
              {st.title}
            </Chip>
          ))}
        </Row>
      )}
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
    <section className="rounded-3xl bg-white p-4" data-testid="profile">
      <h2 className="text-lg font-semibold">Profilul copilului (pentru AI)</h2>
      <p className="mt-1 text-sm text-ink/70">
        Folosit în toate ideile și poveștile. Pune doar o poreclă, nu numele complet.
      </p>
      <input
        value={profile.nickname}
        onChange={(e) => setProfile({ nickname: e.target.value.slice(0, 20) })}
        placeholder="Poreclă (opțional)"
        className="mt-2 w-full rounded-xl border-2 border-cave/40 px-3 py-2"
      />
      <div className="mt-3 text-sm font-medium text-ink/60">Îi place</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {INTERESTS.map((x) => (
          <Chip key={x} on={profile.interests.includes(x)} onClick={() => toggle(x)}>
            {x}
          </Chip>
        ))}
      </div>
      <div className="mt-3 text-sm font-medium text-ink/60">Acum învață</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {(Object.keys(SKILLS) as Skill[]).map((k) => (
          <Chip
            key={k}
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
        className="mt-3 w-full rounded-xl border-2 border-cave/40 px-3 py-2"
      />
    </section>
  );
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'idei', label: 'Idei', icon: '💡' },
  { id: 'creeaza', label: 'Creează', icon: '✨' },
  { id: 'poveste', label: 'Poveste', icon: '🌙' },
  { id: 'poza', label: 'Din poză', icon: '📷' },
  { id: 'plan', label: 'Plan', icon: '📅' },
  { id: 'setari', label: 'Setări', icon: '⚙️' },
];

export function ParentApp() {
  const [tab, setTab] = useState<Tab>('idei');
  return (
    <div className="flex h-full flex-col bg-[#f6f1ff]">
      <header className="bg-cave-deep px-5 pt-[max(env(safe-area-inset-top),12px)] pb-3 text-white">
        <h1 className="text-2xl font-semibold">Insula · Părinți</h1>
        <p className="text-sm text-white/80">Joacă adevărată, acasă și afară</p>
      </header>
      <main className="flex-1 overflow-auto px-4 py-4" data-testid={`tab-${tab}`}>
        <div className="mx-auto max-w-xl pb-6">
          {tab === 'idei' && <Ideas />}
          {tab === 'creeaza' && <Create />}
          {tab === 'poveste' && <StoryTab />}
          {tab === 'poza' && <Photo />}
          {tab === 'plan' && <Plan />}
          {tab === 'setari' && <Settings />}
        </div>
      </main>
      <nav className="grid grid-cols-6 border-t border-cave/30 bg-white pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={`nav-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex min-h-16 flex-col items-center justify-center text-xs ${tab === t.id ? 'text-cave-deep font-semibold' : 'text-ink/60'}`}
          >
            <span className="text-2xl">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
