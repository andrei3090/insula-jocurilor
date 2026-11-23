import { describe, expect, it } from 'vitest';
import { createChannel } from './channel';

/** A fake speaker: each item "plays" until finish(item) is called or it is cancelled. */
function rig() {
  const log: string[] = [];
  const open = new Map<string, () => void>();
  const ch = createChannel<string>(
    (x, cancelled) =>
      new Promise<void>((res) => {
        log.push(`start ${x}`);
        open.set(x, () => {
          if (!cancelled()) log.push(`end ${x}`);
          open.delete(x);
          res();
        });
      }),
    () => {
      for (const [x, end] of open) {
        log.push(`cut ${x}`);
        open.delete(x);
        end();
      }
    },
  );
  const finish = async (x: string) => {
    open.get(x)?.();
    await new Promise((r) => setTimeout(r, 0));
  };
  return { ch, log, finish };
}

describe('voice channel', () => {
  it('queued speech waits for the current sentence instead of cutting it', async () => {
    const { ch, log, finish } = rig();
    void ch.say('title');
    void ch.say('intro');
    expect(log).toEqual(['start title']);
    await finish('title');
    expect(log).toEqual(['start title', 'end title', 'start intro']);
  });

  it('a newer queued request replaces an older one that has not started', async () => {
    const { ch, log, finish } = rig();
    void ch.say('title');
    let dropped = false;
    void ch.say('old prompt').then(() => {
      dropped = true;
    });
    void ch.say('new prompt');
    await new Promise((r) => setTimeout(r, 0));
    expect(dropped).toBe(true);
    await finish('title');
    expect(log).toEqual(['start title', 'end title', 'start new prompt']);
  });

  it("the child's own tap ('now') stops the current clip and clears the queue", async () => {
    const { ch, log, finish } = rig();
    void ch.say('instruction');
    void ch.say('waiting');
    void ch.say('three', 'now');
    expect(log).toEqual(['start instruction', 'cut instruction', 'start three']);
    await finish('three');
    expect(log.at(-1)).toBe('end three');
    expect(ch.busy()).toBe(false);
  });

  it("decoration ('idle') never interrupts and is dropped when busy", async () => {
    const { ch, log, finish } = rig();
    void ch.say('intro');
    await ch.say('hihi', 'idle');
    expect(log).toEqual(['start intro']);
    await finish('intro');
    void ch.say('hihi', 'idle');
    expect(log.at(-1)).toBe('start hihi');
  });

  it('stop() silences and settles every promise', async () => {
    const { ch, log } = rig();
    const a = ch.say('a');
    const b = ch.say('b');
    ch.stop();
    await Promise.all([a, b]);
    expect(log).toEqual(['start a', 'cut a']);
    expect(ch.busy()).toBe(false);
  });
});
