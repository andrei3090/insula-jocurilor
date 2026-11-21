// @vitest-environment node
// Real-API smoke test for the parent app's AI. Runs ONLY on the Mac, on demand:
//   INSULA_AI_SMOKE=1 npx vitest run tools/ai-smoke.test.ts
// (key from the Keychain: -a insula -s gemini-api-key). Never runs in CI.
import { execFileSync } from 'node:child_process';
import { GoogleGenAI } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { ACTIVITY_SCHEMA, buildPrompt, DEFAULT_MODEL, parseActivities } from '../src/parinti/ai';

const on = process.env.INSULA_AI_SMOKE === '1';

describe.runIf(on)('parent AI against the real Gemini API', () => {
  it('returns 1–3 well-formed Romanian activities', { timeout: 90_000 }, async () => {
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
    const model = process.env.INSULA_AI_MODEL ?? DEFAULT_MODEL;
    const prompt = buildPrompt(
      { age: 4, where: 'acasa', maxMinutes: 15, skill: 'numere', theme: 'pufi' },
      'plouă afară, avem perne și o minge',
    );
    const t0 = Date.now();
    const it = await ai.interactions.create({
      model,
      input: [{ type: 'user_input', content: [{ type: 'text', text: prompt }] }],
      response_format: { type: 'text', mime_type: 'application/json', schema: ACTIVITY_SCHEMA },
      generation_config: process.env.INSULA_AI_THINK
        ? { thinking_level: process.env.INSULA_AI_THINK }
        : undefined,
    } as never);
    const text = (it as { output_text?: string }).output_text ?? '';
    const r = parseActivities(text, { age: 4, where: 'acasa', source: 'ai' });
    console.log(JSON.stringify({ model, ms: Date.now() - t0, activities: r.activities.length }));
    for (const a of r.activities)
      console.log(
        `\n## ${a.title} (${a.minutes} min, ${a.energy}) [${a.skills}]\nmateriale: ${a.materials.join('; ')}\njoc: ${a.play.join(' | ')}\nscop: ${a.goal}\n6-10: ${a.older}\nsiguranță: ${a.safety}`,
      );
    expect(r.activities.length).toBeGreaterThan(0);
  });
});
