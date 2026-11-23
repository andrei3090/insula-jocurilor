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
  [/^(island\.pestera|game\.ursi|ursi\.|game\.xilofon|xilo\.|tap\.bruno\.)/, 'bruno'],
  [/^(island\.castel|game\.memorie|memorie\.|tap\.cenusareasa\.)/, 'cenusareasa'],
  [/^(island\.laguna|game\.nisip|nisip\.|letter\.|tap\.marina\.)/, 'marina'],
  [/^(island\.atelier|game\.desen|desen\.|game\.coloreaza|coloreaza\.|tap\.tavi\.)/, 'tavi'],
];

export const speakerFor = (id: string): Speaker => RULES.find(([re]) => re.test(id))?.[1] ?? 'pufi';

/** Each clip in public/audio comes from 'gemini' (natural, preferred) or 'ioana' (macOS, placeholder until Gemini). */
export type Engine = 'ioana' | 'gemini';
/** flash-lite-tts: natural Romanian voices with its own (separate) free-tier quota. */
export const GEMINI_MODEL = 'gemini-3.8-flash-lite-tts';

/** Everything that changes the sound of a clip (hashed into the clip manifest). */
export const clipKey = (id: string, text: string, engine: Engine) => {
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
 * Chosen 21.11.2026 from the measured samples (pitch, pitch range = expressiveness, syllables/s):
 * Pufi Laomedeia (286 Hz, most expressive, 3.0/s), Bruno Achird, Cenușăreasa Achernar, Marina Autonoe (308 Hz),
 * Tavi Algenib (133 Hz, deep and jolly).
 */
export const GEMINI: Record<
  Speaker,
  { voice: string; candidates: string[]; style: string; countStyle: string; sample: string }
> = {
  pufi: {
    voice: 'Laomedeia',
    candidates: ['Leda', 'Laomedeia', 'Zephyr'],
    style:
      'a sweet, playful little panda girl talking to a 4-year-old: warm, cheerful, smiling, lively and expressive, clear and not too fast',
    countStyle: 'a sweet little panda girl counting out loud happily, one clear word',
    sample:
      'Bună! Eu sunt Pufi, ursulețul panda! Hai să numărăm împreună bețele de bambus. Unu, doi, trei! Bravo!',
  },
  bruno: {
    voice: 'Achird',
    candidates: ['Puck', 'Achird', 'Fenrir'],
    style:
      'a friendly, curious little bear cub explorer: warm, excited, a bit funny, talking to a small child',
    countStyle: 'a friendly bear cub counting, one clear word',
    sample:
      'Salut! Eu sunt Bruno, ursulețul explorator! Hai în peșteră, am niște jocuri de gândit pentru tine!',
  },
  cenusareasa: {
    voice: 'Achernar',
    candidates: ['Vindemiatrix', 'Achernar', 'Sulafat'],
    style:
      'a gentle, kind fairy-tale princess talking to a small child: soft, warm, smiling and a little magical',
    countStyle: 'a gentle princess counting, one clear word',
    sample:
      'Bine ai venit la Castelul de cristal! Te așteptam la bal. Hai să găsim perechile pantofilor de cristal!',
  },
  marina: {
    voice: 'Autonoe',
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

/**
 * English clips: Kokoro-82M (Apache 2.0), made locally on the Mac, one voice per character; pitch is a small
 * shift after synthesis (tempo kept), speed is Kokoro's own. Clips live in public/audio/en/.
 */
export const KOKORO: Record<Speaker, { voice: string; speed: number; pitch: number }> = {
  // no pitch shift for the girls: a child learning English needs every word clear ("six", not "sex")
  pufi: { voice: 'af_heart', speed: 0.95, pitch: 1 },
  marina: { voice: 'af_bella', speed: 0.97, pitch: 1 },
  cenusareasa: { voice: 'bf_emma', speed: 0.95, pitch: 1 },
  bruno: { voice: 'am_michael', speed: 0.97, pitch: 1.06 },
  tavi: { voice: 'am_fenrir', speed: 0.92, pitch: 0.96 },
};
export const KOKORO_MODEL = 'Kokoro-82M-v1.0-q8-soft-trim';

/** Everything that changes the sound of an English clip (hashed into public/audio/en/manifest.json). */
export const clipKeyEn = (id: string, text: string) => {
  const k = KOKORO[speakerFor(id)];
  return `kokoro|${KOKORO_MODEL}|${k.voice}|${k.speed}|${k.pitch}|${text}`;
};
