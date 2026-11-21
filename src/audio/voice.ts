import type { Speakable } from '../core/types';
import { type LineId, lines } from '../voice/lines';
import { audio, isMuted } from './engine';

const BASE = import.meta.env.BASE_URL;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let current: AudioBufferSourceNode | null = null;
let token = 0;
let lastPrompt: Speakable | null = null;
let enabled = true;

/** Romanian voices only. A missing Romanian pack must never fall back to an English voice. */
export function pickRoVoice(voices: readonly Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>[]) {
  const ro = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ro'));
  return ro.find((v) => v.localService) ?? ro[0] ?? null;
}

function load(id: string): Promise<AudioBuffer | null> {
  let p = buffers.get(id);
  if (!p) {
    p = (async () => {
      const a = audio();
      if (!a) return null;
      try {
        const res = await fetch(`${BASE}audio/${id}.m4a`);
        if (!res.ok) return null;
        return await a.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    buffers.set(id, p);
  }
  return p;
}

/** Warm the cache for lines a screen is about to use. */
export function preload(ids: readonly LineId[]) {
  for (const id of ids) void load(id);
}

/** Plays one clip. Always settles: on end, or after its duration + 400 ms (a suspended or muted
 *  AudioContext never fires `ended`, and a game must never wait forever on the voice). */
export function playBuffer(buf: Pick<AudioBuffer, 'duration'>, t: number = token): Promise<void> {
  return new Promise((resolve) => {
    const a = audio();
    if (!a || t !== token || a.ctx.state !== 'running') return resolve();
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

/** Speak free text with Web Speech, but only with a Romanian voice; otherwise stay silent. */
export function speakText(
  text: string,
  synth: SynthLike | undefined = globalThis.speechSynthesis,
): Promise<void> {
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined' || isMuted()) return Promise.resolve();
  const voice = pickRoVoice(synth.getVoices());
  if (!voice) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice as SpeechSynthesisVoice;
    u.lang = 'ro-RO';
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

export function stop() {
  token++;
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

export async function say(x: Speakable): Promise<void> {
  if (!enabled || isMuted()) return;
  stop();
  const t = token;
  if (typeof x === 'object' && 'text' in x) return speakText(x.text);
  const ids = (Array.isArray(x) ? x : [x]) as LineId[];
  const bufs = await Promise.all(ids.map(load));
  for (let i = 0; i < ids.length; i++) {
    if (t !== token) return;
    const b = bufs[i];
    if (b) await playBuffer(b, t);
    else await speakText(lines[ids[i]]);
  }
}

export async function prompt(x: Speakable) {
  lastPrompt = x;
  return say(x);
}

export const repeat = () => (lastPrompt ? say(lastPrompt) : Promise.resolve());

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  if (!on) stop();
}

export const voice = { say, prompt, repeat, stop };
