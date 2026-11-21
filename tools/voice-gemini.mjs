// Character voices with Gemini TTS (run on the Mac by the parent/developer only; the app never calls Gemini).
// The API key is read from the macOS Keychain:  security add-generic-password -a insula -s gemini-api-key -w
//
//   node --experimental-strip-types --no-warnings tools/voice-gemini.mjs samples   → ../docs/voci-gemini/<character>.m4a
//   node --experimental-strip-types --no-warnings tools/voice-gemini.mjs all [regex] → public/audio/*.m4a + manifest
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { lines } from '../src/voice/lines.ts';
import { GEMINI, speakerFor } from '../src/voice/speakers.ts';

const MODEL = 'gemini-3.8-flash-tts';
const key = execFileSync('security', ['find-generic-password', '-a', 'insula', '-s', 'gemini-api-key', '-w'])
  .toString()
  .trim();
const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1beta' } });
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tts(text, voice, style, attempt = 1) {
  try {
    const it = await ai.interactions.create({
      model: MODEL,
      input: [
        {
          type: 'user_input',
          content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }],
        },
      ],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice }] },
    });
    return Buffer.from(it.output_audio.data, 'base64');
  } catch (e) {
    if (attempt < 5) {
      await sleep(4000 * attempt);
      return tts(text, voice, style, attempt + 1);
    }
    throw e;
  }
}

function toM4a(wav, out, extra = []) {
  const tmp = join(tmpdir(), `insula-g-${process.pid}.wav`);
  writeFileSync(tmp, wav);
  execFileSync('ffmpeg', [
    '-loglevel',
    'error',
    '-y',
    '-i',
    tmp,
    ...extra,
    '-af',
    'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11',
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
  rmSync(tmp, { force: true });
}

const mode = process.argv[2] ?? 'samples';

if (mode === 'samples') {
  const dir = new URL('../../docs/voci-gemini/', import.meta.url).pathname;
  mkdirSync(dir, { recursive: true });
  for (const [who, cfg] of Object.entries(GEMINI)) {
    const parts = [];
    for (const voice of cfg.candidates) {
      const wav = await tts(cfg.sample, voice, cfg.style);
      const f = join(dir, `${who}-${voice}.m4a`);
      toM4a(wav, f);
      parts.push(f);
      console.log(`sample: ${who} / ${voice}`);
    }
  }
  console.log(`samples in ${dir}`);
} else {
  const outDir = new URL('../public/audio/', import.meta.url).pathname;
  const manifestPath = join(outDir, 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
  let made = 0;
  for (const [id, text] of Object.entries(lines)) {
    const cfg = GEMINI[speakerFor(id)];
    const style = id.startsWith('num.') || id === 'si' ? cfg.countStyle : cfg.style;
    const h = hash(`gemini|${MODEL}|${cfg.voice}|${style}|${text}`);
    const file = join(outDir, `${id}.m4a`);
    if (manifest[id] === h && existsSync(file)) continue;
    if (only && !only.test(id)) continue;
    toM4a(await tts(text, cfg.voice, style), file);
    manifest[id] = h;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    made++;
    process.stdout.write(`\r${made} clips`);
  }
  console.log(`\nvoice (gemini): ${made} new clip(s)`);
}
