// Generates one mono AAC clip per spoken line: macOS "Ioana" (ro_RO) + a per-character pitch shift.
// Usage: npm run voice  (macOS only; needs `say` and `ffmpeg`). Unchanged lines are skipped.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lines } from '../src/voice/lines.ts';
import { clipKey, SPEAKERS, speakerFor, VOICE } from '../src/voice/speakers.ts';

const outDir = new URL('../public/audio/', import.meta.url).pathname;
const manifestPath = join(outDir, 'manifest.json');
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/** pitch shift by resampling, then put the tempo back (and apply the character's speed) */
export const filterFor = (id) => {
  const { pitch, tempo } = SPEAKERS[speakerFor(id)];
  const t = tempo / pitch;
  const tempos = t < 0.5 ? [0.5, t / 0.5] : t > 2 ? [2, t / 2] : [t];
  return [
    `asetrate=22050*${pitch}`,
    'aresample=44100',
    ...tempos.map((x) => `atempo=${x.toFixed(4)}`),
    'highpass=f=70',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
  ].join(',');
};

mkdirSync(outDir, { recursive: true });
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const next = {};
let made = 0;
const tmp = join(tmpdir(), `insula-voice-${process.pid}.aiff`);
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;

for (const [id, text] of Object.entries(lines)) {
  const h = hash(clipKey(id, text, 'ioana'));
  const file = join(outDir, `${id}.m4a`);
  // never overwrite a clip that already has its natural Gemini voice
  if (manifest[id] === hash(clipKey(id, text, 'gemini')) && existsSync(file)) {
    next[id] = manifest[id];
    continue;
  }
  next[id] = h;
  if (manifest[id] === h && existsSync(file)) continue;
  if (only && !only.test(id)) {
    next[id] = manifest[id];
    continue;
  }
  execFileSync('say', ['-v', VOICE.name, '-r', String(VOICE.rate), '-o', tmp, text]);
  execFileSync('ffmpeg', [
    '-loglevel',
    'error',
    '-y',
    '-i',
    tmp,
    '-af',
    filterFor(id),
    '-ac',
    '1',
    '-ar',
    '44100',
    '-c:a',
    'aac',
    '-b:a',
    '48k',
    file,
  ]);
  made++;
}
rmSync(tmp, { force: true });
for (const id of Object.keys(manifest)) if (!(id in next)) rmSync(join(outDir, `${id}.m4a`), { force: true });
writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`voice: ${made} new clip(s), ${Object.keys(next).length} total`);
