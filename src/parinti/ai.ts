import type { Activity, Energy, Skill, Where } from './types';
import { ENERGY, type Filters, SKILLS, THEMES, type Theme, WHERE } from './types';

/** Fast and good (~6 s; measured 22.11.2026). The slower, more detailed one is offered in Settings. */
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export const DETAILED_MODEL = 'gemini-3.8-flash';

const SAFETY = [
  'Toate activitățile sunt în lumea reală, fără ecrane.',
  'Siguranță obligatorie, potrivită vârstei:',
  'sub 4 ani fără obiecte mai mici de 3 cm (risc de înghițire);',
  'fără foc, aragaz, cuptor sau cuțite pentru copil;',
  'fără apă adâncă, înălțimi, prize, medicamente sau substanțe de curățenie;',
  'fără plante sau fructe necunoscute la gură;',
  'un adult supraveghează mereu.',
].join(' ');

const STYLE = [
  'Scrie în limba română, cu diacritice corecte (ș și ț cu virgulă dedesubt), simplu și cald, pentru un părinte.',
  'Folosește doar materiale care se găsesc de obicei în casă sau pe care le-a enumerat părintele.',
  'Fiecare activitate are un scop de învățare clar, potrivit programei preșcolare / primare din România.',
  'Personajele (opțional, ca temă): Pufi (un pui de panda, fetiță), Bruno (ursuleț explorator), Cenușăreasa (din basm),',
  'Marina (mică navigatoare pe ocean), Tavi (un uriaș al mării, blând și amuzant). Nu folosi personaje sau nume Disney.',
].join(' ');

export type ChildProfile = {
  /** nickname only (never the full name) */
  nickname: string;
  interests: string[];
  learning: Skill[];
  avoid: string;
};

export function profileText(p?: ChildProfile): string {
  if (!p) return '';
  const bits = [
    p.nickname.trim() ? `Copilul (poreclă): ${p.nickname.trim().slice(0, 20)}.` : '',
    p.interests.length ? `Îi plac: ${p.interests.join(', ')}.` : '',
    p.learning.length ? `Acum învață: ${p.learning.map((s) => SKILLS[s]).join(', ')}.` : '',
    p.avoid.trim() ? `De evitat: ${p.avoid.trim().slice(0, 200)}.` : '',
  ];
  return bits.filter(Boolean).join(' ');
}

export function buildPrompt(
  f: Filters & { theme?: Theme; people?: string },
  extra = '',
  photo = false,
  profile?: ChildProfile,
): string {
  const parts = [
    profileText(profile),
    `Propune 3 activități de joacă pentru un copil de ${f.age} ani.`,
    f.where ? `Locul: ${WHERE[f.where]}.` : '',
    f.maxMinutes ? `Durata: cel mult ${f.maxMinutes} minute.` : '',
    f.energy ? `Tipul: ${ENERGY[f.energy]}.` : '',
    f.skill ? `Ce exersăm: ${SKILLS[f.skill]}.` : '',
    f.theme ? `Tema: ${THEMES[f.theme]}.` : '',
    f.people ? `Cine se joacă: ${f.people}.` : '',
    extra.trim() ? `Ce mai spune părintele: ${extra.trim().slice(0, 500)}` : '',
    photo
      ? 'În fotografie sunt obiecte din jurul nostru. Mai întâi listează obiectele potrivite pentru o joacă sigură, apoi construiește activitățile DOAR cu ele (plus lucruri foarte comune). Ignoră persoanele din fotografie și nu le descrie.'
      : '',
    STYLE,
    SAFETY,
    'Pentru fiecare activitate dă și o variantă pentru 6–10 ani.',
  ];
  return parts.filter(Boolean).join('\n');
}

const str = { type: 'string' };
const strs = { type: 'array', items: str };

export const activitySchema = (max = 3) => ({
  type: 'object',
  properties: {
    objects: { ...strs, description: 'Obiectele potrivite din fotografie (doar pentru fotografie).' },
    activities: {
      type: 'array',
      minItems: 1,
      maxItems: max,
      items: {
        type: 'object',
        properties: {
          title: str,
          minutes: { type: 'integer' },
          energy: { type: 'string', enum: ['calm', 'activ'] },
          skills: { type: 'array', items: { type: 'string', enum: Object.keys(SKILLS) } },
          materials: strs,
          setup: strs,
          play: strs,
          goal: str,
          older: str,
          safety: str,
        },
        required: ['title', 'minutes', 'energy', 'skills', 'materials', 'play', 'goal', 'safety'],
      },
    },
  },
  required: ['activities'],
});
export const ACTIVITY_SCHEMA = activitySchema(3);

// the cedilla letters (U+015F, U+0163, U+015E, U+0162) → comma-below ș ț Ș Ț; built from code points so
// this file never contains the wrong letters (the copy guard checks that)
const CEDILLA = new Map([0x15f, 0x163, 0x15e, 0x162].map((c, i) => [String.fromCodePoint(c), 'șțȘȚ'[i]]));
const CEDILLA_RE = new RegExp(`[${[...CEDILLA.keys()].join('')}]`, 'g');
export const fixDiacritics = (s: string) => s.replace(CEDILLA_RE, (c) => CEDILLA.get(c) ?? c);

const clean = (v: unknown, max = 300) => (typeof v === 'string' ? fixDiacritics(v.trim()).slice(0, max) : '');
const cleanList = (v: unknown, n = 8) =>
  Array.isArray(v)
    ? v
        .map((x) => clean(x, 240))
        .filter(Boolean)
        .slice(0, n)
    : [];

/** Turn the model's JSON into safe, complete Activity objects; anything malformed is dropped. */
export function parseActivities(
  json: string,
  ctx: { age: number; where?: Where; source: 'ai' | 'poza' },
): { objects: string[]; activities: Activity[] } {
  let data: { objects?: unknown; activities?: unknown };
  try {
    data = JSON.parse(json);
  } catch {
    return { objects: [], activities: [] };
  }
  const raw = Array.isArray(data.activities) ? data.activities : [];
  const activities = raw
    .map((r: Record<string, unknown>, i: number): Activity | null => {
      const title = clean(r.title, 80);
      const play = cleanList(r.play);
      if (!title || !play.length) return null;
      const skills = (Array.isArray(r.skills) ? r.skills : []).filter(
        (s): s is Skill => typeof s === 'string' && s in SKILLS,
      );
      const minutes = Math.max(2, Math.min(90, Math.round(Number(r.minutes) || 10)));
      return {
        id: `${ctx.source}-${Date.now().toString(36)}-${i}`,
        title,
        where: ctx.where ? [ctx.where] : ['acasa'],
        energy: (r.energy === 'activ' ? 'activ' : 'calm') as Energy,
        minutes,
        ages: [Math.max(3, ctx.age - 1), Math.min(10, ctx.age + 2)],
        skills: skills.length ? skills : ['creativitate'],
        materials: cleanList(r.materials),
        setup: cleanList(r.setup),
        play,
        goal: clean(r.goal),
        older: clean(r.older) || undefined,
        safety: clean(r.safety) || 'Un adult supraveghează mereu.',
        source: ctx.source,
      };
    })
    .filter((a): a is Activity => a !== null);
  return { objects: cleanList(data.objects, 20), activities };
}

export const REFINE = {
  usor: 'mai ușoară, pentru un copil mai mic sau obosit',
  greu: 'mai provocatoare, cu un pas în plus',
  alta: 'o variantă diferită, cu același scop de învățare',
  fara: 'fără niciun material (doar corpul, vocea și ce e în jur)',
  miscare: 'cu mult mai multă mișcare',
  linistit: 'mai liniștită, potrivită înainte de somn',
} as const;
export type RefineHow = keyof typeof REFINE;

export function buildRefinePrompt(a: Activity, how: RefineHow, age: number, profile?: ChildProfile): string {
  const brief = { title: a.title, minutes: a.minutes, materials: a.materials, play: a.play, goal: a.goal };
  return [
    profileText(profile),
    `Iată o activitate de joacă pentru un copil de ${age} ani: ${JSON.stringify(brief)}.`,
    `Rescrie-o ca să fie ${REFINE[how]}. Dă exact o activitate.`,
    STYLE,
    SAFETY,
    'Dă și o variantă pentru 6–10 ani.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildWeekPrompt(age: number, profile?: ChildProfile, extra = ''): string {
  return [
    profileText(profile),
    `Fă un plan pe o săptămână: exact 7 activități de joacă (una pe zi, de luni până duminică) pentru un copil de ${age} ani.`,
    'Variază locurile (acasă, afară, în parc, la bunici), energia (liniștit / cu mișcare) și ce exersăm (numere, litere, culori, forme, mișcare, creativitate, emoții, natură).',
    'Zilele de lucru: activități scurte (10–15 minute) pentru seară. Weekendul: una mai lungă, afară.',
    extra.trim() ? `Ce mai spune părintele: ${extra.trim().slice(0, 300)}` : '',
    STYLE,
    SAFETY,
    'Pentru fiecare activitate dă și o variantă pentru 6–10 ani.',
  ]
    .filter(Boolean)
    .join('\n');
}

export const STORY_TOPICS = {
  curaj: 'curaj',
  prietenie: 'prietenie și împărțit',
  emotii: 'cum ne descurcăm când suntem supărați',
  numere: 'numărat până la 10',
  litere: 'sunetul și litera de la începutul numelui unui personaj',
  natura: 'grija pentru natură și animale',
  somn: 'liniștire și somn',
} as const;
export type StoryTopic = keyof typeof STORY_TOPICS;

export function buildStoryPrompt(o: {
  age: number;
  topic: StoryTopic;
  minutes: number;
  theme?: Theme;
  profile?: ChildProfile;
}): string {
  const words = Math.round(o.minutes * 110);
  return [
    profileText(o.profile),
    `Scrie o poveste de seară în română pentru un copil de ${o.age} ani, de aproximativ ${words} de cuvinte (${o.minutes} minute citită cu voce tare).`,
    `Tema: ${STORY_TOPICS[o.topic]}.`,
    o.theme
      ? `Personaj principal: ${THEMES[o.theme]}.`
      : 'Personaje: Pufi (pui de panda, fetiță), Bruno (ursuleț explorator), Marina (mică navigatoare), Tavi (uriaș blând al mării), Cenușăreasa (din basm).',
    o.profile?.nickname.trim()
      ? `Copilul (${o.profile.nickname.trim().slice(0, 20)}) poate apărea în poveste, ca prietena personajelor.`
      : '',
    'Ton cald, propoziții scurte, repetiții plăcute, fără nimic înfricoșător, un final liniștit. Fără personaje sau nume Disney.',
    'Împarte povestea în paragrafe scurte. La final, 2–3 întrebări simple despre poveste pe care părintele le poate pune.',
    'Scrie cu diacritice corecte (ș și ț cu virgulă).',
  ]
    .filter(Boolean)
    .join('\n');
}

export const STORY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    paragraphs: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 30 },
    questions: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  },
  required: ['title', 'paragraphs'],
} as const;

export type Story = { id: string; title: string; paragraphs: string[]; questions: string[]; at: number };

export function parseStory(json: string): Story | null {
  try {
    const d = JSON.parse(json);
    const paragraphs = (Array.isArray(d.paragraphs) ? d.paragraphs : [])
      .map((p: unknown) => clean(p, 1200))
      .filter(Boolean)
      .slice(0, 30);
    const title = clean(d.title, 100);
    if (!title || paragraphs.length < 2) return null;
    return {
      id: `poveste-${Date.now().toString(36)}`,
      title,
      paragraphs,
      questions: cleanList(d.questions, 4),
      at: Date.now(),
    };
  } catch {
    return null;
  }
}
