// @vitest-environment node
// Verifies staged Gemini voice clips by CONTENT: Gemini transcribes each clip, we compare with the expected text.
// On demand only:  INSULA_VOICE_VERIFY=1 npx vitest run tools/voice-verify.test.ts
// (INSULA_VERIFY_MODEL=gemini-3.1-flash-lite picks another transcribing model, INSULA_VERIFY_CHUNK=1 one clip per request)
// Writes .voice-gemini/verified.json = { id: similarity 0..1 }.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { lines } from '../src/voice/lines';

const on = process.env.INSULA_VOICE_VERIFY === '1';
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Similarity of two short texts: 1 - (Levenshtein distance / longer length), on normalised words. */
function similarity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (!x && !y) return 1;
  const m = x.length;
  const n = y.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}

describe.runIf(on)('staged Gemini clips say the right text', () => {
  it('transcribes and scores every staged clip', { timeout: 3_600_000 }, async () => {
    const key = execFileSync('security', [
      'find-generic-password',
      '-a',
      'insula',
      '-s',
      'gemini-api-key',
      '-w',
    ])
      .toString()
      .trim();
    const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1beta' } });
    const dir = '.voice-gemini';
    const ids = Object.keys(lines).filter((id) => existsSync(`${dir}/${id}.m4a`));
    const scores: Record<string, number> = existsSync(`${dir}/verified.json`)
      ? JSON.parse(readFileSync(`${dir}/verified.json`, 'utf8'))
      : {};
    const todo = ids.filter((id) => scores[id] === undefined);
    // clips per request: 1 is slower but never pairs a transcript with the wrong clip
    const per = Number(process.env.INSULA_VERIFY_CHUNK ?? 20);
    for (let i = 0; i < todo.length; i += per) {
      const chunk = todo.slice(i, i + per);
      const content: Record<string, unknown>[] = [
        {
          type: 'text',
          text: `Transcrie exact, în română cu diacritice, ce se aude în fiecare dintre cele ${chunk.length} clipuri audio de mai jos, în ordine. Răspunde doar cu JSON: {"t": ["transcriere clip 1", ...]}.`,
        },
      ];
      for (const id of chunk)
        content.push({
          type: 'audio',
          data: readFileSync(`${dir}/${id}.m4a`).toString('base64'),
          mime_type: 'audio/m4a',
        });
      // the service is sometimes busy (503) or rate-limited (429): wait and try again
      const create = async (req: unknown, attempt = 1): Promise<unknown> => {
        try {
          return await ai.interactions.create(req as never);
        } catch (e) {
          if (attempt >= 6) throw e;
          await new Promise((r) => setTimeout(r, 10_000 * attempt));
          return create(req, attempt + 1);
        }
      };
      const it = await create({
        // another model can stand in while the default one is overloaded
        model: process.env.INSULA_VERIFY_MODEL ?? 'gemini-3.8-flash',
        input: [{ type: 'user_input', content }],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: {
            type: 'object',
            properties: { t: { type: 'array', items: { type: 'string' } } },
            required: ['t'],
          },
        },
        generation_config: { thinking_level: 'low' },
      });
      const t: string[] = JSON.parse((it as { output_text?: string }).output_text ?? '{"t":[]}').t ?? [];
      chunk.forEach((id, k) => {
        scores[id] = Math.round(similarity(lines[id as keyof typeof lines], t[k] ?? '') * 100) / 100;
        if (scores[id] < 0.75)
          console.log(`MISMATCH ${id}: expected «${lines[id as keyof typeof lines]}» heard «${t[k] ?? ''}»`);
      });
      writeFileSync(`${dir}/verified.json`, `${JSON.stringify(scores, null, 2)}\n`);
    }
    const good = Object.values(scores).filter((s) => s >= 0.75).length;
    console.log(`verified ${Object.keys(scores).length}, good ${good}`);
    expect(Object.keys(scores).length).toBeGreaterThan(0);
  });
});

describe('similarity', () => {
  it('is 1 for the same words regardless of diacritics and punctuation', () => {
    expect(similarity('Bravo! Ai reușit.', 'bravo, ai reusit')).toBe(1);
    expect(similarity('Mare, mijlociu, mic', 'Fiecare urs vrea castronul lui')).toBeLessThan(0.5);
  });
});
