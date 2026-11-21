// Generates one mono AAC clip per spoken line with the macOS "Ioana" (ro_RO) voice.
// Usage: npm run voice  (macOS only; needs `say` and `ffmpeg`). Unchanged lines are skipped.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lines } from '../src/voice/lines.ts';

const VOICE = 'Ioana';
const RATE = '150';
const outDir = new URL('../public/audio/', import.meta.url).pathname;
const manifestPath = join(outDir, 'manifest.json');

export const hashText = (text) =>
  createHash('sha1').update(`${VOICE}|${RATE}|${text}`).digest('hex').slice(0, 12);

mkdirSync(outDir, { recursive: true });
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const next = {};
let made = 0;
const tmp = join(tmpdir(), `insula-voice-${process.pid}.aiff`);

for (const [id, text] of Object.entries(lines)) {
  const h = hashText(text);
  const file = join(outDir, `${id}.m4a`);
  next[id] = h;
  if (manifest[id] === h && existsSync(file)) continue;
  execFileSync('say', ['-v', VOICE, '-r', RATE, '-o', tmp, text]);
  execFileSync('ffmpeg', [
    '-loglevel',
    'error',
    '-y',
    '-i',
    tmp,
    '-ac',
    '1',
    '-c:a',
    'aac',
    '-b:a',
    '48k',
    file,
  ]);
  made++;
}
rmSync(tmp, { force: true });

for (const id of Object.keys(manifest)) {
  if (!(id in next)) rmSync(join(outDir, `${id}.m4a`), { force: true });
}
writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`voice: ${made} new clip(s), ${Object.keys(next).length} total`);
