import { type ReactNode, useState } from 'react';
import { GUIDES } from '../../art/guides';
import { accuracy, freshSkill } from '../../core/adaptive';
import { type Avatar, useProfile } from '../../core/profile';
import { useProgress } from '../../core/progress';
import { games } from '../../core/registry';
import { useRouter } from '../../core/router';

const Card = ({
  title,
  children,
  highlight,
}: {
  title: string;
  children: ReactNode;
  highlight?: boolean;
}) => (
  <section className={`rounded-3xl bg-white p-5 shadow ${highlight ? 'ring-4 ring-coral' : ''}`}>
    <h2 className="mb-3 text-xl font-semibold">{title}</h2>
    {children}
  </section>
);

const Pill = ({
  on,
  onClick,
  children,
  label,
}: {
  on?: boolean;
  onClick(): void;
  children: ReactNode;
  label?: string;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={`min-h-12 min-w-12 rounded-2xl border-2 px-3 text-lg ${on ? 'border-ink bg-sun font-semibold' : 'border-ink/20 bg-paper'}`}
  >
    {children}
  </button>
);

function PinChange() {
  const setPin = useProfile((s) => s.setPin);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [msg, setMsg] = useState('');
  const ok = /^\d{4}$/.test(a) && a === b;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        inputMode="numeric"
        maxLength={4}
        placeholder="PIN nou"
        value={a}
        onChange={(e) => setA(e.target.value.replace(/\D/g, ''))}
        className="w-28 rounded-xl border-2 border-ink/20 px-3 py-2 text-lg"
      />
      <input
        inputMode="numeric"
        maxLength={4}
        placeholder="Repetă"
        value={b}
        onChange={(e) => setB(e.target.value.replace(/\D/g, ''))}
        className="w-28 rounded-xl border-2 border-ink/20 px-3 py-2 text-lg"
      />
      <button
        type="button"
        disabled={!ok}
        onClick={() => {
          setPin(a);
          setA('');
          setB('');
          setMsg('PIN schimbat.');
        }}
        className="rounded-xl bg-lagoon px-4 py-2 text-lg text-white disabled:opacity-40"
      >
        Salvează
      </button>
      {msg && <span className="text-bamboo-deep">{msg}</span>}
    </div>
  );
}

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function ParentHome() {
  const go = useRouter((s) => s.go);
  const p = useProfile();
  const me = p.active();
  const prog = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const stats = prog.stats[me.id] ?? {};

  return (
    <div className="h-full overflow-auto bg-[#f3eefb] p-6" data-testid="parent">
      <div className="mx-auto flex max-w-4xl flex-col gap-5 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Zona părinților</h1>
          <button
            type="button"
            onClick={() => go({ name: 'map' })}
            className="rounded-2xl bg-sun px-5 py-3 text-lg font-semibold"
          >
            Înapoi la joacă
          </button>
        </div>

        {!p.pinChanged && (
          <Card title="Alege un PIN al tău (acum e 0000)" highlight>
            <PinChange />
          </Card>
        )}

        <Card title="Copilul">
          <div className="mb-3 flex flex-wrap gap-2">
            {p.profiles.map((x) => (
              <Pill key={x.id} on={x.id === me.id} onClick={() => p.select(x.id)}>
                {x.name || 'Fără nume'}
              </Pill>
            ))}
            <Pill onClick={() => p.select(p.add())} label="Adaugă un copil">
              ＋
            </Pill>
          </div>
          <label className="mb-3 block">
            <span className="text-sm text-ink/70">Numele (rămâne doar pe această tabletă)</span>
            <input
              value={me.name}
              onChange={(e) => p.update(me.id, { name: e.target.value.slice(0, 24) })}
              className="mt-1 block w-full rounded-xl border-2 border-ink/20 px-3 py-2 text-lg"
            />
          </label>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-2">Vârsta:</span>
            {[4, 5, 6, 7, 8, 9, 10].map((a) => (
              <Pill key={a} on={me.age === a} onClick={() => p.update(me.id, { age: a })}>
                {a}
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2">Personaj:</span>
            {(Object.keys(GUIDES) as Avatar[]).map((a) => {
              const G = GUIDES[a];
              return (
                <button
                  key={a}
                  type="button"
                  aria-label={a}
                  onClick={() => p.update(me.id, { avatar: a })}
                  className={`rounded-2xl p-1 ${me.avatar === a ? 'bg-sun' : 'bg-paper'}`}
                >
                  <G size={56} />
                </button>
              );
            })}
          </div>
          {p.profiles.length > 1 && (
            <button
              type="button"
              onClick={() => p.remove(me.id)}
              className="mt-3 text-sm text-coral underline"
            >
              Șterge acest profil
            </button>
          )}
        </Card>

        <Card title="Timp de joacă">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2">Pauză după:</span>
            {[10, 15, 20, 30].map((m) => (
              <Pill
                key={m}
                on={p.sessionLimitMin === m}
                onClick={() => p.setSettings({ sessionLimitMin: m })}
              >
                {m} min
              </Pill>
            ))}
          </div>
        </Card>

        <Card title="Sunet">
          <label className="flex items-center gap-3">
            <span>Volum</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={p.volume}
              onChange={(e) => p.setSettings({ volume: Number(e.target.value) })}
              className="w-64"
            />
          </label>
          <label className="mt-2 flex items-center gap-3">
            <input
              type="checkbox"
              checked={p.voiceOn}
              onChange={(e) => p.setSettings({ voiceOn: e.target.checked })}
              className="size-5"
            />
            <span>Vocea care explică jocurile</span>
          </label>
        </Card>

        <Card title="Progres">
          <table className="w-full text-left text-base">
            <thead>
              <tr className="text-ink/60">
                <th className="py-1">Joc</th>
                <th>Nivel acum</th>
                <th>Reușite recente</th>
                <th>Schimbă nivelul</th>
              </tr>
            </thead>
            <tbody>
              {games().map((g) => {
                const l = prog.levels[me.id]?.[g.id] ?? freshSkill(g.startStep?.(me.age) ?? 0);
                const acc = accuracy(l);
                return (
                  <tr key={g.id} className="border-t border-ink/10">
                    <td className="py-2">{g.title}</td>
                    <td>
                      {Math.min(l.step, g.skills.length - 1) + 1} / {g.skills.length}{' '}
                      <span className="text-sm text-ink/50">
                        ({g.skills[Math.min(l.step, g.skills.length - 1)]})
                      </span>
                    </td>
                    <td>{acc === null ? '–' : `${Math.round(acc * 100)}%`}</td>
                    <td className="flex gap-1 py-1">
                      <Pill
                        label="Mai ușor"
                        onClick={() => prog.setLevel(me.id, g.id, Math.max(0, l.step - 1))}
                      >
                        −
                      </Pill>
                      <Pill
                        label="Mai greu"
                        onClick={() => prog.setLevel(me.id, g.id, Math.min(g.skills.length - 1, l.step + 1))}
                      >
                        +
                      </Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {Object.keys(stats).length > 0 && (
            <p className="mt-3 text-sm text-ink/60">
              Abilități exersate:{' '}
              {Object.entries(stats)
                .map(([k, v]) => `${k} ${v.ok}/${v.total}`)
                .join(' · ')}
            </p>
          )}
          <p className="mt-2 text-sm text-ink/60">Abțibilduri: {(prog.stickers[me.id] ?? []).length} / 24</p>
        </Card>

        <Card title="Date">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl bg-lagoon px-4 py-2 text-white"
              onClick={() =>
                download(`insula-progres-${new Date().toISOString().slice(0, 10)}.json`, {
                  app: 'insula-jocurilor',
                  version: 1,
                  profile: me,
                  progress: {
                    levels: prog.levels[me.id] ?? {},
                    stats: prog.stats[me.id] ?? {},
                    cards: prog.cards[me.id] ?? {},
                    stickers: prog.stickers[me.id] ?? [],
                  },
                })
              }
            >
              Salvează progresul (fișier)
            </button>
            <label className="cursor-pointer rounded-xl bg-paper px-4 py-2">
              Încarcă progres din fișier
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const d = JSON.parse(await f.text());
                    if (d.app !== 'insula-jocurilor') throw new Error('format');
                    useProgress.setState((s) => ({
                      levels: { ...s.levels, [me.id]: d.progress.levels ?? {} },
                      stats: { ...s.stats, [me.id]: d.progress.stats ?? {} },
                      cards: { ...s.cards, [me.id]: d.progress.cards ?? {} },
                      stickers: { ...s.stickers, [me.id]: d.progress.stickers ?? [] },
                    }));
                    alert('Progres încărcat.');
                  } catch {
                    alert('Fișierul nu este un progres valid.');
                  }
                }}
              />
            </label>
            {confirmReset ? (
              <button
                type="button"
                className="rounded-xl bg-coral px-4 py-2 text-white"
                onClick={() => {
                  prog.resetProfile(me.id);
                  setConfirmReset(false);
                }}
              >
                Sigur? Șterge tot progresul
              </button>
            ) : (
              <button
                type="button"
                className="rounded-xl bg-paper px-4 py-2"
                onClick={() => setConfirmReset(true)}
              >
                Începe de la zero
              </button>
            )}
          </div>
        </Card>

        {p.pinChanged && (
          <Card title="Schimbă PIN-ul">
            <PinChange />
          </Card>
        )}
        <p className="text-center text-sm text-ink/50">Versiunea {__APP_VERSION__}</p>
      </div>
    </div>
  );
}
