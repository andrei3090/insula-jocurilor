/**
 * One voice at a time, never cut mid-sentence by the app itself.
 *
 * - `queue` (system speech: titles, intros, prompts, round end) waits for the current clip. A newer queued
 *   request replaces an older one that has not started yet, so the child never hears stale instructions.
 * - `now` (an answer to the child's own tap: counting, feedback, the repeat button) stops the current clip
 *   and clears the queue.
 * - `idle` (decoration: a guide's tap line) plays only when nothing is playing or waiting.
 *
 * Every promise settles: when its speech ends, or at once when it is dropped or stopped.
 */
export type SayMode = 'queue' | 'now' | 'idle';

export type Play<T> = (x: T, cancelled: () => boolean) => Promise<void>;

type Job<T> = { x: T; resolve: () => void };

export function createChannel<T>(play: Play<T>, cancel: () => void) {
  let gen = 0;
  let playing: Job<T> | null = null;
  let pending: Job<T> | null = null;

  const run = (job: Job<T>) => {
    const g = ++gen;
    playing = job;
    const finish = () => {
      job.resolve();
      if (g !== gen) return; // stopped or replaced: the newer owner carries on
      playing = null;
      const next = pending;
      pending = null;
      if (next) run(next);
    };
    play(job.x, () => g !== gen).then(finish, finish);
  };

  const interrupt = () => {
    pending?.resolve();
    pending = null;
    if (playing) {
      gen++;
      const p = playing;
      playing = null;
      cancel();
      p.resolve();
    }
  };

  return {
    say(x: T, mode: SayMode = 'queue'): Promise<void> {
      return new Promise<void>((resolve) => {
        const job = { x, resolve };
        if (mode === 'now') {
          interrupt();
          run(job);
          return;
        }
        if (!playing && !pending) {
          run(job);
          return;
        }
        if (mode === 'idle') {
          resolve();
          return;
        }
        pending?.resolve(); // superseded before it started
        pending = job;
      });
    },
    /** leave the screen: silence now, forget what was waiting */
    stop: interrupt,
    busy: () => playing !== null || pending !== null,
  };
}
