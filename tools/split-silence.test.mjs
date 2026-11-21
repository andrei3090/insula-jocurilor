import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cutPoints, duration, splitInto } from './split-silence.mjs';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

describe('split on silence', () => {
  it('cutPoints picks the n-1 longest inner silences in time order', () => {
    const sil = [
      { start: 1, end: 1.3, dur: 0.3 },
      { start: 2, end: 3.2, dur: 1.2 },
      { start: 4, end: 4.4, dur: 0.4 },
      { start: 6, end: 7.1, dur: 1.1 },
    ];
    expect(cutPoints(sil, 9, 3)).toEqual([2.6, 6.55]);
    expect(cutPoints(sil, 9, 6)).toBeNull();
  });

  it.runIf(hasFfmpeg)(
    'splits a real recording of 3 "lines" (tones 0.6 s, 1.0 s, 0.4 s with 1.2 s pauses) into 3 clips',
    () => {
      const dir = mkdtempSync(join(tmpdir(), 'split-'));
      const src = join(dir, 'all.wav');
      const tone = (d) => `sine=f=330:d=${d}:sample_rate=24000`;
      const gap = 'anullsrc=r=24000:cl=mono,atrim=0:1.2';
      execFileSync('ffmpeg', [
        '-loglevel',
        'error',
        '-y',
        '-f',
        'lavfi',
        '-i',
        tone(0.6),
        '-f',
        'lavfi',
        '-i',
        gap,
        '-f',
        'lavfi',
        '-i',
        tone(1.0),
        '-f',
        'lavfi',
        '-i',
        gap,
        '-f',
        'lavfi',
        '-i',
        tone(0.4),
        '-filter_complex',
        'concat=n=5:v=0:a=1',
        '-ac',
        '1',
        src,
      ]);
      const outs = [0, 1, 2].map((i) => join(dir, `c${i}.m4a`));
      expect(splitInto(src, outs)).toBe(true);
      const d = outs.map(duration);
      expect(d[0]).toBeGreaterThan(0.45);
      expect(d[0]).toBeLessThan(0.8);
      expect(d[1]).toBeGreaterThan(0.85);
      expect(d[1]).toBeLessThan(1.2);
      expect(d[2]).toBeLessThan(0.6);
    },
  );
});
