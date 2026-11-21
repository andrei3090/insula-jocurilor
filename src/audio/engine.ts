/** One shared AudioContext with a master gain. It is created and resumed on the first tap (autoplay rules). */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.9;

export function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = isMuted() ? 0 : volume;
    master.connect(ctx.destination);
  }
  return { ctx, out: master! };
}

/**
 * Quiet mode for testing on Andrei's computer: localStorage["insula.mute"] = "1" silences everything
 * (voices, effects, notes). Also honoured in production, so a parent can force silence too.
 */
export function isMuted(): boolean {
  try {
    return localStorage.getItem('insula.mute') === '1';
  } catch {
    return false;
  }
}

/**
 * Called on the first tap (autoplay rules). It does NOT change the audio session category: the device's
 * silent switch / mute must always win (an earlier version set audioSession "playback", which ignores it).
 */
export async function unlockAudio(): Promise<void> {
  const a = audio();
  if (a && isMuted()) a.out.gain.value = 0;
  if (a && a.ctx.state !== 'running') {
    try {
      await a.ctx.resume();
    } catch {
      /* will retry on the next tap */
    }
  }
}

export function setVolume(v: number) {
  volume = isMuted() ? 0 : Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
}

export const isUnlocked = () => ctx?.state === 'running';
