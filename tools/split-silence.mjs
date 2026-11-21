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

/**
 * Cut points aligned with the expected line lengths: boundary k should fall near total * (weights up to k) / (all
 * weights) (weights = syllables). Dynamic programming over the silences, in order, minimising the distance to the
 * expected boundary and preferring longer silences. Robust to a long pause inside one line.
 */
export function alignedCutPoints(sil, total, weights) {
  const n = weights.length;
  const cands = sil
    .filter((s) => s.start > 0.15 && s.end < total - 0.15 && s.dur >= 0.18)
    .map((s) => ({ c: (s.start + s.end) / 2, d: s.dur }));
  const m = cands.length;
  if (m < n - 1) return null;
  const sum = weights.reduce((a, b) => a + b, 0);
  const expected = [];
  let acc = 0;
  for (let k = 0; k < n - 1; k++) {
    acc += weights[k];
    expected.push((total * acc) / sum);
  }
  const cost = (k, j) => (Math.abs(cands[j].c - expected[k]) / total) * 12 - Math.min(cands[j].d, 1.5);
  // dp[k][j]: best cost with boundary k at candidate j
  let prev = cands.map((_, j) => cost(0, j));
  const from = [prev.map(() => -1)];
  for (let k = 1; k < n - 1; k++) {
    const cur = Array(m).fill(Number.POSITIVE_INFINITY);
    const back = Array(m).fill(-1);
    let best = Number.POSITIVE_INFINITY;
    let bestJ = -1;
    for (let j = 1; j < m; j++) {
      if (prev[j - 1] < best) {
        best = prev[j - 1];
        bestJ = j - 1;
      }
      if (bestJ >= 0) {
        cur[j] = best + cost(k, j);
        back[j] = bestJ;
      }
    }
    from.push(back);
    prev = cur;
  }
  let j = prev.indexOf(Math.min(...prev));
  if (!Number.isFinite(prev[j])) return null;
  const picks = [];
  for (let k = n - 2; k >= 0; k--) {
    picks.unshift(cands[j].c);
    j = from[k][j];
  }
  return picks;
}

/** Writes n clips; filter = extra ffmpeg audio filter for each clip; weights (syllables) enable aligned cutting. */
export function splitInto(file, outs, filter, weights) {
  const total = duration(file);
  const sil = silences(file);
  const cuts = weights ? alignedCutPoints(sil, total, weights) : cutPoints(sil, total, outs.length);
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
