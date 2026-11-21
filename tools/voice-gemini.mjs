// Character voices with Gemini TTS (run on the Mac by the parent/developer only; the app never calls Gemini).
// The API key is read from the macOS Keychain:  security add-generic-password -a insula -s gemini-api-key -w
//
//   node --experimental-strip-types --no-warnings tools/voice-gemini.mjs samples   → ../docs/voci-gemini/<character>.m4a
//   … voice-gemini.mjs batch [regex] → .voice-gemini/ (staging): up to 25 lines of one character per request,
//                                     split at the pauses (fits the free tier's ~10 requests/day)
//   … voice-gemini.mjs install        → copies a COMPLETE staging set into public/audio (then set ENGINE = 'gemini')
//   … voice-gemini.mjs all [regex]    → one request per line, straight into public/audio (paid tier)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { lines } from '../src/voice/lines.ts';
import { clipKey, GEMINI, GEMINI_MODEL, speakerFor } from '../src/voice/speakers.ts';
import { splitInto } from './split-silence.mjs';

const MODEL = GEMINI_MODEL;
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
const LOUD = 'loudnorm=I=-16:TP=-1.5:LRA=11';
const stageDir = new URL('../.voice-gemini/', import.meta.url).pathname;
const stageManifest = join(stageDir, 'manifest.json');
const readJson = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {});

if (mode === 'batch') {
  mkdirSync(stageDir, { recursive: true });
  const done = readJson(stageManifest);
  const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
  const pending = Object.entries(lines).filter(
    ([id, text]) => done[id] !== hash(clipKey(id, text, 'gemini')) && (!only || only.test(id)),
  );
  // group by character and by style (counting words get their own style)
  const groups = new Map();
  for (const [id, text] of pending) {
    const who = speakerFor(id);
    const counting = id.startsWith('num.') || id === 'si';
    const k = `${who}|${counting}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push([id, text]);
  }
  let requests = 0;
  outer: for (const [k, items] of groups) {
    const [who, counting] = k.split('|');
    const cfg = GEMINI[who];
    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25);
      const text = chunk.map(([, t]) => (/[.!?]$/.test(t) ? t : `${t}.`)).join(' <long pause> ');
      let wav;
      try {
        wav = await tts(text, cfg.voice, counting === 'true' ? cfg.countStyle : cfg.style);
      } catch (e) {
        console.log(
          `\nstopped (${String(e?.message ?? e).slice(0, 120)}); run again later, progress is kept`,
        );
        break outer;
      }
      requests++;
      const tmp = join(tmpdir(), `insula-batch-${process.pid}.wav`);
      writeFileSync(tmp, wav);
      const outs = chunk.map(([id]) => join(stageDir, `${id}.m4a`));
      // keep the raw take: it can be re-cut later without a new request
      mkdirSync(join(stageDir, 'raw'), { recursive: true });
      const rawName = `${who}-${counting === 'true' ? 'n' : 's'}-${Date.now()}`;
      writeFileSync(join(stageDir, 'raw', `${rawName}.wav`), wav);
      writeFileSync(join(stageDir, 'raw', `${rawName}.json`), JSON.stringify(chunk));
      const syl = (t) => (t.match(/[aeiouăâîAEIOUĂÂÎ]/g) ?? []).length || 1;
      if (
        splitInto(
          tmp,
          outs,
          LOUD,
          chunk.map(([, t]) => syl(t)),
        )
      ) {
        for (const [id, t] of chunk) done[id] = hash(clipKey(id, t, 'gemini'));
        writeFileSync(stageManifest, `${JSON.stringify(done, null, 2)}\n`);
        console.log(`ok: ${who} ${chunk.length} lines`);
      } else {
        writeFileSync(join(stageDir, `failed-${who}-${i}.wav`), wav);
        console.log(`could not split ${who} chunk ${i} (${chunk.length} lines); kept the audio for a look`);
      }
      rmSync(tmp, { force: true });
    }
  }
  const missing = Object.keys(lines).filter((id) => !done[id]).length;
  console.log(
    `batch: ${requests} request(s); ${Object.keys(lines).length - missing}/${Object.keys(lines).length} lines ready`,
  );
  process.exit(0);
}

if (mode === 'install-verified') {
  // install only staged clips that passed the content check (.voice-gemini/verified.json from
  // tools/voice-verify.test.ts) and the duration check; the others keep their current clip
  const done = readJson(stageManifest);
  const scores = readJson(join(stageDir, 'verified.json'));
  const outDir = new URL('../public/audio/', import.meta.url).pathname;
  const manifest = readJson(join(outDir, 'manifest.json'));
  const syllables = (t) => (t.match(/[aeiouăâîAEIOUĂÂÎ]/g) ?? []).length || 1;
  let ok = 0;
  const skipped = [];
  for (const [id, text] of Object.entries(lines)) {
    const f = join(stageDir, `${id}.m4a`);
    if (done[id] !== hash(clipKey(id, text, 'gemini')) || !existsSync(f)) continue;
    let d = 0;
    try {
      d = Number(
        execFileSync('ffprobe', [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'csv=p=0',
          f,
        ]).toString(),
      );
    } catch {}
    const syl = syllables(text);
    const durationOk = d >= syl / 8.5 && d <= syl / 2.2 + 0.9;
    // numbers come back as digits and letter names vary in transcripts: for those the duration decides
    const formatOnly = /^(num\.|si$|letter\.)/.test(id);
    const contentOk = (scores[id] ?? 0) >= 0.7 || formatOnly;
    if (!durationOk || !contentOk) {
      skipped.push(id);
      continue;
    }
    writeFileSync(join(outDir, `${id}.m4a`), readFileSync(f));
    manifest[id] = done[id];
    ok++;
  }
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `installed ${ok} Gemini clip(s); kept the current clip for ${skipped.length}: ${skipped.join(', ')}`,
  );
  process.exit(0);
}

if (mode === 'install') {
  const done = readJson(stageManifest);
  const missing = Object.entries(lines).filter(
    ([id, t]) => done[id] !== hash(clipKey(id, t, 'gemini')) || !existsSync(join(stageDir, `${id}.m4a`)),
  );
  if (missing.length) {
    console.log(
      `not complete: ${missing.length} line(s) missing, e.g. ${missing
        .slice(0, 5)
        .map(([id]) => id)
        .join(', ')}`,
    );
    process.exit(1);
  }
  // sanity: a clip must sound like its text (catches a pause tag read aloud or a bad split)
  const syllables = (t) => (t.match(/[aeiouăâîAEIOUĂÂÎ]/g) ?? []).length || 1;
  const odd = Object.entries(lines)
    .map(([id, t]) => {
      const d = Number(
        execFileSync('ffprobe', [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'csv=p=0',
          join(stageDir, `${id}.m4a`),
        ]).toString(),
      );
      return { id, d, rate: syllables(t) / d };
    })
    .filter((c) => c.d < 0.25 || c.rate < 1.2 || c.rate > 8);
  if (odd.length) {
    console.log(
      `suspicious clips (duration vs text), not installed: ${odd.map((c) => `${c.id} ${c.d.toFixed(1)}s`).join(', ')}`,
    );
    console.log('delete them from .voice-gemini/manifest.json and run batch again');
    process.exit(1);
  }
  const outDir = new URL('../public/audio/', import.meta.url).pathname;
  for (const id of Object.keys(lines))
    writeFileSync(join(outDir, `${id}.m4a`), readFileSync(join(stageDir, `${id}.m4a`)));
  writeFileSync(
    join(outDir, 'manifest.json'),
    `${JSON.stringify(Object.fromEntries(Object.keys(lines).map((id) => [id, done[id]])), null, 2)}\n`,
  );
  console.log("installed; now set ENGINE = 'gemini' in src/voice/speakers.ts and run the tests");
  process.exit(0);
}

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
} else if (mode === 'all') {
  const outDir = new URL('../public/audio/', import.meta.url).pathname;
  const manifestPath = join(outDir, 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
  let made = 0;
  for (const [id, text] of Object.entries(lines)) {
    const cfg = GEMINI[speakerFor(id)];
    const style = id.startsWith('num.') || id === 'si' ? cfg.countStyle : cfg.style;
    const h = hash(clipKey(id, text, 'gemini'));
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
} else {
  console.log(
    `unknown mode "${mode}". Use: samples | batch [regex] | install-verified | install | all [regex]`,
  );
  process.exit(1);
}
