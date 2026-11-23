import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lines, linesEn } from './lines';
import { clipKey, clipKeyEn, speakerFor } from './speakers';

const hash = (id: string, text: string, e: 'ioana' | 'gemini') =>
  createHash('sha1')
    .update(clipKey(id, text, e))
    .digest('hex')
    .slice(0, 12);
const manifest: Record<string, string> = JSON.parse(readFileSync('public/audio/manifest.json', 'utf8'));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('character voices', () => {
  it('each island speaks with its guide', () => {
    expect(speakerFor('panda.give.3')).toBe('pufi');
    expect(speakerFor('praise.1')).toBe('pufi');
    expect(speakerFor('ursi.order')).toBe('bruno');
    expect(speakerFor('memorie.pair')).toBe('cenusareasa');
    expect(speakerFor('letter.S2')).toBe('marina');
    expect(speakerFor('desen.intro')).toBe('tavi');
  });
});

describe('voice clips', () => {
  it('every Romanian line has a natural (Gemini) clip matching its current text: no robotic voice left', () => {
    const stale = Object.entries(lines)
      .filter(
        ([id, text]) => manifest[id] !== hash(id, text, 'gemini') || !existsSync(`public/audio/${id}.m4a`),
      )
      .map(([id]) => id);
    expect(stale).toEqual([]);
  });

  it('every English line has a natural (Kokoro) clip matching its current text', () => {
    const en: Record<string, string> = JSON.parse(readFileSync('public/audio/en/manifest.json', 'utf8'));
    const h = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12);
    const stale = Object.entries(linesEn)
      .filter(([id, text]) => en[id] !== h(clipKeyEn(id, text)) || !existsSync(`public/audio/en/${id}.m4a`))
      .map(([id]) => id);
    expect(stale).toEqual([]);
  });

  it('every line id literal used in src exists in lines', () => {
    const used = new Set<string>();
    const re = /(?:say|prompt|titleVoice:|voiceId:)\(?\s*\[?\s*['"]([a-z0-9]+\.[\w.-]+)['"]/g;
    for (const f of walk('src').filter((x) => /\.tsx?$/.test(x) && !x.endsWith('.test.ts'))) {
      for (const m of readFileSync(f, 'utf8').matchAll(re)) used.add(m[1]);
    }
    const missing = [...used].filter((id) => !(id in lines));
    expect(missing).toEqual([]);
  });
});
