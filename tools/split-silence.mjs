// Cuts one long recording into N clips at its N-1 longest silences (ffmpeg silencedetect).
import { execFileSync, spawnSync } from 'node:child_process';

export function silences(file, noiseDb = -38, minDur = 0.35) {
  const r = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', file, '-af', `silencedetect=noise=${noiseDb}dB:d=${minDur}`, '-f', 'null', '-'],
    {
      encoding: 'utf8',
    },
  );
  const out = r.stderr;
  const starts = [...out.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...out.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((m) => ({
    end: Number(m[1]),
    dur: Number(m[2]),
  }));
  return ends.map((e, i) => ({ start: starts[i] ?? e.end - e.dur, end: e.end, dur: e.dur }));
}

export function duration(file) {
  return Number(
    execFileSync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      file,
    ]).toString(),
  );
}

/** Cut points (seconds) between n clips: the middle of the n-1 longest inner silences, in time order. */
export function cutPoints(sil, total, n) {
  const inner = sil.filter((s) => s.start > 0.15 && s.end < total - 0.15);
  if (inner.length < n - 1) return null;
  return [...inner]
    .sort((a, b) => b.dur - a.dur)
    .slice(0, n - 1)
    .sort((a, b) => a.start - b.start)
    .map((s) => (s.start + s.end) / 2);
}

/** Writes n clips; filter = extra ffmpeg audio filter for each clip. Returns false if it cannot split cleanly. */
export function splitInto(file, outs, filter) {
  const total = duration(file);
  const cuts = cutPoints(silences(file), total, outs.length);
  if (!cuts) return false;
  const bounds = [0, ...cuts, total];
  outs.forEach((out, i) => {
    execFileSync('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      '-i',
      file,
      // cut first (atrim), then trim the silences: output -ss/-to would run AFTER areverse on the whole file
      '-af',
      `atrim=${bounds[i]}:${bounds[i + 1]},asetpts=PTS-STARTPTS,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse${filter ? `,${filter}` : ''}`,
      '-ac',
      '1',
      '-ar',
      '44100',
      '-c:a',
      'aac',
      '-b:a',
      '56k',
      out,
    ]);
  });
  return true;
}
