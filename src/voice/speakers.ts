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

/** Which generator made the clips in public/audio: 'ioana' (macOS, npm run voice) or 'gemini' (tools/voice-gemini.mjs). */
export const ENGINE: 'ioana' | 'gemini' = 'ioana';
export const GEMINI_MODEL = 'gemini-3.8-flash-tts';

/** Everything that changes the sound of a clip (hashed into the clip manifest). */
export const clipKey = (id: string, text: string, engine: 'ioana' | 'gemini' = ENGINE) => {
  if (engine === 'gemini') {
    const g = GEMINI[speakerFor(id)];
    const style = id.startsWith('num.') || id === 'si' ? g.countStyle : g.style;
    return `gemini|${GEMINI_MODEL}|${g.voice}|${style}|${text}`;
  }
  const s = SPEAKERS[speakerFor(id)];
  return `${VOICE.name}|${VOICE.rate}|${s.pitch}|${s.tempo}|${text}`;
};

/**
 * Gemini TTS casting (build-time only, see tools/voice-gemini.mjs). `voice` is the chosen prebuilt voice;
 * `candidates` are the options rendered as samples for the parent to choose from.
 */
export const GEMINI: Record<
  Speaker,
  { voice: string; candidates: string[]; style: string; countStyle: string; sample: string }
> = {
  pufi: {
    voice: 'Leda',
    candidates: ['Leda', 'Laomedeia', 'Zephyr'],
    style:
      'a sweet, playful little panda girl talking to a 4-year-old: warm, cheerful, smiling, lively and expressive, clear and not too fast',
    countStyle: 'a sweet little panda girl counting out loud happily, one clear word',
    sample:
      'Bună! Eu sunt Pufi, ursulețul panda! Hai să numărăm împreună bețele de bambus. Unu, doi, trei! Bravo!',
  },
  bruno: {
    voice: 'Puck',
    candidates: ['Puck', 'Achird', 'Fenrir'],
    style:
      'a friendly, curious little bear cub explorer: warm, excited, a bit funny, talking to a small child',
    countStyle: 'a friendly bear cub counting, one clear word',
    sample:
      'Salut! Eu sunt Bruno, ursulețul explorator! Hai în peșteră, am niște jocuri de gândit pentru tine!',
  },
  cenusareasa: {
    voice: 'Vindemiatrix',
    candidates: ['Vindemiatrix', 'Achernar', 'Sulafat'],
    style:
      'a gentle, kind fairy-tale princess talking to a small child: soft, warm, smiling and a little magical',
    countStyle: 'a gentle princess counting, one clear word',
    sample:
      'Bine ai venit la Castelul de cristal! Te așteptam la bal. Hai să găsim perechile pantofilor de cristal!',
  },
  marina: {
    voice: 'Sadachbia',
    candidates: ['Sadachbia', 'Autonoe', 'Aoede'],
    style:
      'an adventurous, lively young girl sailor talking to a small child: bright, enthusiastic and joyful',
    countStyle: 'a lively young girl counting, one clear word',
    sample: 'Ahoi! Eu sunt Marina, mica navigatoare! Hai să scriem pe nisip, înainte să vină valul!',
  },
  tavi: {
    voice: 'Algenib',
    candidates: ['Algenib', 'Charon', 'Enceladus'],
    style:
      'a huge, kind and funny sea giant talking to a small child: deep, jolly, chuckling warmly, slow and friendly',
    countStyle: 'a jolly sea giant counting, one clear word',
    sample: 'Ho, ho, ho! Eu sunt Tavi, uriașul mării! Hai în atelier, desenăm și colorăm tot ce vrei tu!',
  },
};
