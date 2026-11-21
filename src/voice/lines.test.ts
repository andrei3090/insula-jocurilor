import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lines } from './lines';
import { clipKey, speakerFor } from './speakers';

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
  it('every LineId has a clip (Gemini, or the Ioana placeholder) matching its current text', () => {
    const stale = Object.entries(lines)
      .filter(
        ([id, text]) =>
          ![hash(id, text, 'gemini'), hash(id, text, 'ioana')].includes(manifest[id]) ||
          !existsSync(`public/audio/${id}.m4a`),
      )
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
