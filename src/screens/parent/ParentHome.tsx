import { type ReactNode, useState } from 'react';
import { GUIDES } from '../../art/guides';
import { setVoiceLang } from '../../audio/voice';
import { freshSkill } from '../../core/adaptive';
import { firstLevelOf, freshLevels, MAX_LEVEL } from '../../core/levels';
import { type Avatar, useProfile } from '../../core/profile';
import { useProgress } from '../../core/progress';
import { games } from '../../core/registry';
import { resetChild } from '../../core/reset';
import { useRouter } from '../../core/router';
import type { Lang } from '../../i18n/lang';
import { useLang, useT } from '../../i18n/ui';
import { textOf } from '../../voice/lines';

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
  const t = useT();
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
        placeholder={t('p.pinNew')}
        value={a}
        onChange={(e) => setA(e.target.value.replace(/\D/g, ''))}
        className="w-28 rounded-xl border-2 border-ink/20 px-3 py-2 text-lg"
      />
      <input
        inputMode="numeric"
        maxLength={4}
        placeholder={t('p.pinRepeat')}
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
          setMsg(t('p.pinSaved'));
        }}
        className="rounded-xl bg-lagoon px-4 py-2 text-lg text-white disabled:opacity-40"
      >
        {t('p.save')}
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
  const t = useT();
  const lang = useLang();
  const [confirmReset, setConfirmReset] = useState(false);
  const [opened, setOpened] = useState(false);
  const stats = prog.stats[me.id] ?? {};
  const leveled = games().filter((g) => g.levelSpec && g.scored !== false);
  const startOf = (g: (typeof leveled)[number]) => {
    const st = prog.levels[me.id]?.[g.id] ?? freshSkill(g.startStep?.(me.age) ?? 0);
    return g.levelSpec ? firstLevelOf(g.levelSpec, g.skills[Math.min(st.step, g.skills.length - 1)]) : 1;
  };
  const setLang = (l: Lang) => {
    p.update(me.id, { lang: l });
    setVoiceLang(l);
  };

  return (
    <div className="h-full overflow-auto bg-[#f3eefb] p-6" data-testid="parent">
      <div className="mx-auto flex max-w-4xl flex-col gap-5 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">{t('p.title')}</h1>
          <button
            type="button"
            onClick={() => go({ name: 'map' })}
            className="rounded-2xl bg-sun px-5 py-3 text-lg font-semibold"
          >
            {t('p.back')}
          </button>
        </div>

        {!p.pinChanged && (
          <Card title={t('p.pinFirst')} highlight>
            <PinChange />
          </Card>
        )}

        <Card title={t('p.child')}>
          <div className="mb-3 flex flex-wrap gap-2">
            {p.profiles.map((x) => (
              <Pill key={x.id} on={x.id === me.id} onClick={() => p.select(x.id)}>
                {x.name || t('p.noName')}
              </Pill>
            ))}
            <Pill onClick={() => p.select(p.add())} label={t('p.addChild')}>
              ＋
            </Pill>
          </div>
          <label className="mb-3 block">
            <span className="text-sm text-ink/70">{t('p.name')}</span>
            <input
              value={me.name}
              onChange={(e) => p.update(me.id, { name: e.target.value.slice(0, 24) })}
              className="mt-1 block w-full rounded-xl border-2 border-ink/20 px-3 py-2 text-lg"
            />
          </label>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-2">{t('p.age')}</span>
            {[4, 5, 6, 7, 8, 9, 10].map((a) => (
              <Pill key={a} on={me.age === a} onClick={() => p.update(me.id, { age: a })}>
                {a}
              </Pill>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-2">{t('p.lang')}</span>
            {(['ro', 'en'] as const).map((l) => (
              <Pill key={l} on={(me.lang ?? 'ro') === l} onClick={() => setLang(l)}>
                {l === 'ro' ? 'Română' : 'English'}
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2">{t('p.avatar')}</span>
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
              {t('p.removeChild')}
            </button>
          )}
        </Card>

        <Card title={t('p.time')}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2">{t('p.breakAfter')}</span>
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

        <Card title={t('p.sound')}>
          <label className="flex items-center gap-3">
            <span>{t('p.volume')}</span>
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
            <span>{t('p.voice')}</span>
          </label>
        </Card>

        <Card title={t('p.levels')}>
          <p className="mb-2 text-sm text-ink/60">{t('p.saved')}</p>
          <table className="w-full text-left text-base">
            <thead>
              <tr className="text-ink/60">
                <th className="py-1">{t('p.game')}</th>
                <th>{t('p.levelNow')}</th>
                <th>{t('p.levelOpen')}</th>
                <th>{t('p.stars')}</th>
                <th>{t('p.change')}</th>
              </tr>
            </thead>
            <tbody>
              {leveled.map((g) => {
                const start = startOf(g);
                const l = prog.lv[me.id]?.[g.id] ?? freshLevels(start);
                const stars = Object.values(l.stars).reduce((a, b) => a + b, 0);
                return (
                  <tr key={g.id} className="border-t border-ink/10" data-testid={`parent-level-${g.id}`}>
                    <td className="py-2">{textOf(g.titleVoice, lang)}</td>
                    <td className="text-lg font-semibold">{l.current}</td>
                    <td>
                      {l.unlocked} / {MAX_LEVEL}
                    </td>
                    <td>⭐ {stars}</td>
                    <td className="flex gap-1 py-1">
                      <Pill
                        label={t('p.easier')}
                        onClick={() => prog.chooseLevel(me.id, g.id, l.current - 1, start)}
                      >
                        −
                      </Pill>
                      <Pill
                        label={t('p.harder')}
                        onClick={() => {
                          // the parent may move ahead: open the next level too
                          if (l.current >= l.unlocked)
                            useProgress.setState((s) => ({
                              lv: {
                                ...s.lv,
                                [me.id]: {
                                  ...s.lv[me.id],
                                  [g.id]: { ...l, unlocked: Math.min(MAX_LEVEL, l.unlocked + 1) },
                                },
                              },
                            }));
                          prog.chooseLevel(me.id, g.id, l.current + 1, start);
                        }}
                      >
                        +
                      </Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="open-all-levels"
              className="rounded-xl bg-lagoon px-4 py-2 text-white"
              onClick={() => {
                prog.openLevels(
                  me.id,
                  leveled.map((g) => g.id),
                );
                setOpened(true);
              }}
            >
              {t('p.openAll')}
            </button>
            {opened && <span className="text-bamboo-deep">{t('p.openAllDone')}</span>}
          </div>
          {Object.keys(stats).length > 0 && (
            <p className="mt-3 text-sm text-ink/60">
              {t('p.skills')}{' '}
              {Object.entries(stats)
                .map(([k, v]) => `${k} ${v.ok}/${v.total}`)
                .join(' · ')}
            </p>
          )}
          <p className="mt-2 text-sm text-ink/60">
            {t('p.stickers', { n: (prog.stickers[me.id] ?? []).length })}
          </p>
        </Card>

        <Card title={t('p.data')}>
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
                    lv: prog.lv[me.id] ?? {},
                  },
                })
              }
            >
              {t('p.export')}
            </button>
            <label className="cursor-pointer rounded-xl bg-paper px-4 py-2">
              {t('p.import')}
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
                      lv: { ...s.lv, [me.id]: d.progress.lv ?? {} },
                    }));
                    alert(t('p.imported'));
                  } catch {
                    alert(t('p.importBad'));
                  }
                }}
              />
            </label>
            {confirmReset ? (
              <button
                type="button"
                className="rounded-xl bg-coral px-4 py-2 text-white"
                data-testid="parent-reset-yes"
                onClick={async () => {
                  await resetChild(me.id);
                  setConfirmReset(false);
                }}
              >
                {t('p.resetSure')}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-xl bg-paper px-4 py-2"
                data-testid="parent-reset"
                onClick={() => setConfirmReset(true)}
              >
                {t('p.reset')}
              </button>
            )}
          </div>
        </Card>

        {p.pinChanged && (
          <Card title={t('p.changePin')}>
            <PinChange />
          </Card>
        )}
        <p className="text-center text-sm text-ink/50">{t('p.version', { v: __APP_VERSION__ })}</p>
      </div>
    </div>
  );
}
