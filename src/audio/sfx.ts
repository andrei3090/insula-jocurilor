import { audio } from './engine';

/** f: start frequency; to: optional glide target over the note */
type Note = { f: number; t: number; d: number; type?: OscillatorType; g?: number; to?: number };

function play(notes: Note[]) {
  const a = audio();
  if (a?.ctx.state !== 'running') return;
  const now = a.ctx.currentTime;
  for (const n of notes) {
    const osc = a.ctx.createOscillator();
    const gain = a.ctx.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.f, now + n.t);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, now + n.t + n.d);
    const peak = (n.g ?? 0.25) * 0.9;
    gain.gain.setValueAtTime(0.0001, now + n.t);
    gain.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
    osc.connect(gain).connect(a.out);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.05);
  }
}

function noise(duration: number, from: number, to: number, g = 0.12) {
  const a = audio();
  if (a?.ctx.state !== 'running') return;
  const len = Math.floor(a.ctx.sampleRate * duration);
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  const now = a.ctx.currentTime;
  filter.frequency.setValueAtTime(from, now);
  filter.frequency.exponentialRampToValueAtTime(to, now + duration);
  const gain = a.ctx.createGain();
  gain.gain.value = g;
  src.connect(filter).connect(gain).connect(a.out);
  src.start();
}

/** Synthesised sound effects: no files, no licences, tiny. */
export const sfx = {
  pop: () =>
    play([
      { f: 660, t: 0, d: 0.09, type: 'triangle', g: 0.3 },
      { f: 990, t: 0.03, d: 0.08, g: 0.15 },
    ]),
  tap: () => play([{ f: 520, t: 0, d: 0.06, type: 'triangle', g: 0.2 }]),
  chime: () =>
    play([
      { f: 1046.5, t: 0, d: 0.5, g: 0.18 },
      { f: 1568, t: 0.06, d: 0.6, g: 0.12 },
    ]),
  /** soft, neutral "not quite" (never a buzzer) */
  boop: () =>
    play([
      { f: 330, t: 0, d: 0.16, type: 'sine', g: 0.22 },
      { f: 262, t: 0.1, d: 0.2, g: 0.18 },
    ]),
  success: () =>
    play([
      { f: 523.25, t: 0, d: 0.18, type: 'triangle' },
      { f: 659.25, t: 0.1, d: 0.18, type: 'triangle' },
      { f: 783.99, t: 0.2, d: 0.2, type: 'triangle' },
      { f: 1046.5, t: 0.3, d: 0.45, type: 'triangle', g: 0.3 },
    ]),
  fanfare: () =>
    play([
      { f: 523.25, t: 0, d: 0.2, type: 'square', g: 0.08 },
      { f: 659.25, t: 0.15, d: 0.2, type: 'square', g: 0.08 },
      { f: 783.99, t: 0.3, d: 0.2, type: 'square', g: 0.08 },
      { f: 1046.5, t: 0.45, d: 0.7, type: 'triangle', g: 0.25 },
      { f: 1318.5, t: 0.45, d: 0.7, type: 'sine', g: 0.12 },
    ]),
  /** a tiny "hi-hi" giggle at a character's pitch */
  giggle: (hz = 900) =>
    play([
      { f: hz, to: hz * 1.35, t: 0, d: 0.11, type: 'sine', g: 0.16 },
      { f: hz * 1.08, to: hz * 1.5, t: 0.14, d: 0.12, type: 'sine', g: 0.14 },
    ]),
  /** end of a round: a short bouncy dance tune (≈1.6 s) */
  party: () => {
    const melody = [523.25, 659.25, 783.99, 659.25, 880, 783.99, 1046.5];
    play([
      ...melody.map((f, i) => ({ f, t: i * 0.15, d: 0.13, type: 'triangle' as const, g: 0.2 })),
      ...[130.81, 196, 130.81, 196].map((f, i) => ({
        f,
        t: i * 0.3,
        d: 0.2,
        type: 'square' as const,
        g: 0.05,
      })),
      { f: 1046.5, t: 1.05, d: 0.55, type: 'triangle', g: 0.25 },
      { f: 1318.5, t: 1.05, d: 0.55, type: 'sine', g: 0.12 },
      { f: 1568, t: 1.05, d: 0.55, type: 'sine', g: 0.08 },
    ]);
  },
  swish: () => noise(0.35, 400, 2400, 0.1),
  wave: () => noise(1.1, 300, 900, 0.14),
};
