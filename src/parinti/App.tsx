import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import { buildPrompt, parseActivities } from './ai';
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

type Tab = 'idei' | 'creeaza' | 'poza' | 'plan' | 'setari';

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

function Detail({ a, onClose }: { a: Activity; onClose(): void }) {
  const { saved, toggleSave, addToPlan, markDone } = useParent();
  const [day, setDay] = useState<number | null>(null);
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
  const { apiKey, model } = useParent();
  const [busy, setBusy] = useState(false);
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
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : 'Nu a mers. Mai încearcă o dată.');
    } finally {
      setBusy(false);
    }
  };
  return { apiKey, busy, error, result, run };
}

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
      <textarea
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
        placeholder="Ce aveți la îndemână sau ce vreți (ex.: plouă, avem o minge și cretă, e obosită)"
        className="mb-3 min-h-20 w-full rounded-2xl border-2 border-cave/40 bg-white p-3 text-base"
        maxLength={500}
      />
      <button
        type="button"
        data-testid="generate"
        disabled={!g.apiKey || g.busy}
        onClick={() =>
          g.run(buildPrompt({ ...f, people }, extra), { age: f.age, where: f.where, source: 'ai' })
        }
        className="w-full rounded-2xl bg-cave-deep py-4 text-lg font-semibold text-white disabled:opacity-40"
      >
        {g.busy ? 'Se gândește…' : '✨ Creează 3 idei'}
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
          img && g.run(buildPrompt(f, '', true), { age: f.age, where: f.where, source: 'poza' }, img.b64)
        }
        className="w-full rounded-2xl bg-cave-deep py-4 text-lg font-semibold text-white disabled:opacity-40"
      >
        {g.busy ? 'Se uită la poză…' : '✨ Creează jocuri din poză'}
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
  const { saved, plan, removeFromPlan } = useParent();
  const [open, setOpen] = useState<Activity | null>(null);
  const favorites = Object.values(saved);
  return (
    <>
      <h2 className="mb-2 text-xl font-semibold">Săptămâna</h2>
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
        <h2 className="text-lg font-semibold">Modelul</h2>
        <input
          value={m}
          onChange={(e) => setM(e.target.value)}
          onBlur={() => setModel(m)}
          className="mt-2 w-full rounded-xl border-2 border-cave/40 px-3 py-2"
        />
        <p className="mt-1 text-sm text-ink/60">Implicit: gemini-3.8-flash.</p>
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

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'idei', label: 'Idei', icon: '💡' },
  { id: 'creeaza', label: 'Creează', icon: '✨' },
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
          {tab === 'poza' && <Photo />}
          {tab === 'plan' && <Plan />}
          {tab === 'setari' && <Settings />}
        </div>
      </main>
      <nav className="grid grid-cols-5 border-t border-cave/30 bg-white pb-[env(safe-area-inset-bottom)]">
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
