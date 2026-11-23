import type { Speakable } from '../core/types';
import type { Lang } from '../i18n/lang';
import { type LineId, textOf } from '../voice/lines';
import { createChannel, type SayMode } from './channel';
import { audio, isMuted } from './engine';

export type { SayMode } from './channel';

const BASE = import.meta.env.BASE_URL;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let current: AudioBufferSourceNode | null = null;
let lastPrompt: Speakable | null = null;
let enabled = true;
let lang: Lang = 'ro';

/** Clips live in audio/<id>.m4a (Romanian) and audio/en/<id>.m4a (English). */
export const clipUrl = (id: string, l: Lang) => `${BASE}audio/${l === 'en' ? 'en/' : ''}${id}.m4a`;

/** A voice in the wanted language only: a missing Romanian pack must never fall back to an English voice. */
export function pickVoice(
  voices: readonly Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>[],
  l: Lang = 'ro',
) {
  const ok = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(l));
  return ok.find((v) => v.localService) ?? ok[0] ?? null;
}
/** kept for the tests and older call sites */
export const pickRoVoice = (voices: Parameters<typeof pickVoice>[0]) => pickVoice(voices, 'ro');

function load(id: string, l: Lang): Promise<AudioBuffer | null> {
  const key = `${l}:${id}`;
  let p = buffers.get(key);
  if (!p) {
    p = (async () => {
      const a = audio();
      if (!a) return null;
      try {
        const res = await fetch(clipUrl(id, l));
        if (!res.ok) return null;
        return await a.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    buffers.set(key, p);
  }
  return p;
}

/** Warm the cache for lines a screen is about to use. */
export function preload(ids: readonly LineId[]) {
  for (const id of ids) void load(id, lang);
}

/** Plays one clip. Always settles: on end, or after its duration + 400 ms (a suspended or muted
 *  AudioContext never fires `ended`, and a game must never wait forever on the voice). */
export function playBuffer(buf: Pick<AudioBuffer, 'duration'>, cancelled: () => boolean = () => false) {
  return new Promise<void>((resolve) => {
    const a = audio();
    if (!a || cancelled() || a.ctx.state !== 'running') return resolve();
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    setTimeout(done, buf.duration * 1000 + 400);
    try {
      const src = a.ctx.createBufferSource();
      src.buffer = buf as AudioBuffer;
      src.connect(a.out);
      src.onended = done;
      current = src;
      src.start();
    } catch {
      done();
    }
  });
}

type SynthLike = Pick<SpeechSynthesis, 'getVoices' | 'speak' | 'cancel'>;

/** Speak free text with Web Speech, but only with a voice in the language; otherwise stay silent. */
export function speakText(
  text: string,
  synth: SynthLike | undefined = globalThis.speechSynthesis,
  l: Lang = lang,
): Promise<void> {
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined' || isMuted()) return Promise.resolve();
  const v = pickVoice(synth.getVoices(), l);
  if (!v) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v as SpeechSynthesisVoice;
    u.lang = l === 'en' ? 'en-US' : 'ro-RO';
    u.rate = 0.92;
    u.pitch = 1.1;
    const done = () => resolve();
    u.onend = done;
    u.onerror = done;
    keep.add(u);
    setTimeout(done, 400 + text.length * 120); // stall guard
    synth.speak(u);
  }).finally(() => keep.clear());
}
const keep = new Set<SpeechSynthesisUtterance>(); // GC guard so onend fires

function cancelAudio() {
  try {
    current?.stop();
  } catch {
    /* already stopped */
  }
  current = null;
  try {
    globalThis.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

async function play(x: Speakable, cancelled: () => boolean): Promise<void> {
  const l = lang;
  if (typeof x === 'object' && 'text' in x) return speakText(x.text, undefined, l);
  const ids = (Array.isArray(x) ? x : [x]) as LineId[];
  const bufs = await Promise.all(ids.map((id) => load(id, l)));
  for (let i = 0; i < ids.length; i++) {
    if (cancelled()) return;
    const b = bufs[i];
    if (b) await playBuffer(b, cancelled);
    else await speakText(textOf(ids[i], l), undefined, l);
  }
}

const channel = createChannel<Speakable>(play, cancelAudio);

/**
 * Speak. `queue` (default) waits for the current sentence; `now` answers the child's own tap and may cut
 * it; `idle` is decoration and is dropped when something is playing. See channel.ts.
 */
export function say(x: Speakable, mode: SayMode = 'queue'): Promise<void> {
  if (!enabled || isMuted()) return Promise.resolve();
  return channel.say(x, mode);
}

/** Speak and remember it as the current instruction (the 🔊 button repeats it). */
export function prompt(x: Speakable, mode: SayMode = 'queue') {
  lastPrompt = x;
  return say(x, mode);
}

/** The repeat button: the child asked, so it may cut what is playing. */
export const repeat = () => (lastPrompt ? say(lastPrompt, 'now') : Promise.resolve());

/** A short line followed by the current instruction, as ONE queued sentence (hint rung 1). */
export function again(first: LineId): Promise<void> {
  const p = lastPrompt;
  if (p && typeof p === 'object' && 'text' in p) return say(first).then(() => say(p));
  const rest = p ? ((Array.isArray(p) ? p : [p]) as LineId[]) : [];
  return say([first, ...rest]);
}

export const stop = () => channel.stop();
export const busy = () => channel.busy();

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  if (!on) stop();
}

/** Switching the language stops the current speech; clips of the other language load on demand. */
export function setVoiceLang(l: Lang) {
  if (l === lang) return;
  lang = l;
  stop();
}
export const voiceLang = () => lang;

export const voice = { say, prompt, repeat, again, stop };
