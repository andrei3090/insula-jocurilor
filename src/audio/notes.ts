import { audio } from './engine';

/** C major, C5..C6: one bar each. */
export const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];

/** A soft mallet/bell tone: fundamental + a few inharmonic partials with fast decay. */
export function playNote(i: number, dur = 1.1) {
  const a = audio();
  if (!a || a.ctx.state !== 'running') return;
  const f = SCALE[Math.max(0, Math.min(SCALE.length - 1, i))];
  const now = a.ctx.currentTime;
  const partials: [number, number][] = [
    [1, 0.5],
    [2.76, 0.16],
    [5.4, 0.06],
  ];
  for (const [mult, g] of partials) {
    const o = a.ctx.createOscillator();
    const gain = a.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f * mult;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(g, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur / mult ** 0.5);
    o.connect(gain).connect(a.out);
    o.start(now);
    o.stop(now + dur + 0.05);
  }
}
