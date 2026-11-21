import type { Activity, Energy, Skill, Where } from './types';
import { ENERGY, type Filters, SKILLS, THEMES, type Theme, WHERE } from './types';

export const DEFAULT_MODEL = 'gemini-3.8-flash';

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

export function buildPrompt(
  f: Filters & { theme?: Theme; people?: string },
  extra = '',
  photo = false,
): string {
  const parts = [
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

export const ACTIVITY_SCHEMA = {
  type: 'object',
  properties: {
    objects: { ...strs, description: 'Obiectele potrivite din fotografie (doar pentru fotografie).' },
    activities: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
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
} as const;

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
