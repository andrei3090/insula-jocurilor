/** One shared AudioContext with a master gain. It is created and resumed on the first tap (autoplay rules). */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.9;

type AudioSessionNav = Navigator & { audioSession?: { type: string } };

export function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  return { ctx, out: master! };
}

export async function unlockAudio(): Promise<void> {
  try {
    const nav = navigator as AudioSessionNav;
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    /* not supported */
  }
  const a = audio();
  if (a && a.ctx.state !== 'running') {
    try {
      await a.ctx.resume();
    } catch {
      /* will retry on the next tap */
    }
  }
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
}

export const isUnlocked = () => ctx?.state === 'running';
