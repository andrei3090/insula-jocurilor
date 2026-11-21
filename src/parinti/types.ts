export const WHERE = {
  acasa: 'Acasă',
  afara: 'Afară / curte',
  parc: 'În parc',
  masina: 'În mașină / pe drum',
  cafenea: 'La cafenea / restaurant',
  bunici: 'La bunici',
} as const;
export type Where = keyof typeof WHERE;

export const SKILLS = {
  numere: 'Numere',
  litere: 'Litere și sunete',
  culori: 'Culori',
  forme: 'Forme și mărimi',
  logica: 'Logică',
  motricitate: 'Mâini îndemânatice',
  miscare: 'Mișcare',
  creativitate: 'Creativitate',
  limbaj: 'Vorbire și povești',
  emotii: 'Emoții',
  natura: 'Natură',
} as const;
export type Skill = keyof typeof SKILLS;

export const ENERGY = { calm: 'Liniștit', activ: 'Cu mișcare' } as const;
export type Energy = keyof typeof ENERGY;

export const THEMES = {
  pufi: 'Pufi, micuța panda (fetiță)',
  bruno: 'Bruno, ursulețul explorator',
  cenusareasa: 'Cenușăreasa',
  marina: 'Marina, mica navigatoare',
  tavi: 'Tavi, uriașul mării',
} as const;
export type Theme = keyof typeof THEMES;

export type Activity = {
  id: string;
  title: string;
  where: Where[];
  energy: Energy;
  minutes: number;
  ages: [number, number];
  skills: Skill[];
  theme?: Theme;
  materials: string[];
  setup: string[];
  play: string[];
  goal: string;
  older?: string;
  safety?: string;
  source: 'biblioteca' | 'ai' | 'poza';
};

export type Filters = {
  where?: Where;
  energy?: Energy;
  maxMinutes?: number;
  skill?: Skill;
  age: number;
};
