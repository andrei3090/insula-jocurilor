/**
 * Character voices. Every clip is the macOS "Ioana" voice, then pitch-shifted (tempo kept) per character:
 * Pufi high and sweet, Marina and Cenușăreasa bright, Bruno a cub, Tavi a deep, kind giant.
 */
export type Speaker = 'pufi' | 'bruno' | 'cenusareasa' | 'marina' | 'tavi';

export const VOICE = { name: 'Ioana', rate: 165 } as const;

/** pitch: frequency factor (1.26 ≈ +4 semitones); tempo: speed factor after the pitch shift */
export const SPEAKERS: Record<Speaker, { pitch: number; tempo: number }> = {
  pufi: { pitch: 1.3, tempo: 1.05 },
  marina: { pitch: 1.2, tempo: 1.04 },
  cenusareasa: { pitch: 1.16, tempo: 0.98 },
  bruno: { pitch: 1.1, tempo: 0.97 },
  tavi: { pitch: 0.78, tempo: 0.92 },
};

const RULES: [RegExp, Speaker][] = [
  [/^(island\.pestera|game\.ursi|ursi\.)/, 'bruno'],
  [/^(island\.castel|game\.memorie|memorie\.)/, 'cenusareasa'],
  [/^(island\.laguna|game\.nisip|nisip\.|letter\.)/, 'marina'],
  [/^(island\.atelier|game\.desen|desen\.|game\.coloreaza|coloreaza\.)/, 'tavi'],
];

export const speakerFor = (id: string): Speaker => RULES.find(([re]) => re.test(id))?.[1] ?? 'pufi';

/** Everything that changes the sound of a clip (hashed into the clip manifest). */
export const clipKey = (id: string, text: string) => {
  const s = SPEAKERS[speakerFor(id)];
  return `${VOICE.name}|${VOICE.rate}|${s.pitch}|${s.tempo}|${text}`;
};
