// @vitest-environment node
// Real-API smoke tests for the parent app's AI. ONLY on the Mac, on demand:
//   INSULA_AI_SMOKE=1 npx vitest run tools/ai-smoke.test.ts            (all cases)
//   INSULA_AI_SMOKE=1 INSULA_AI_CASE=story npx vitest run tools/ai-smoke.test.ts
// Key from the Keychain (-a insula -s gemini-api-key). Never runs in CI.
import { execFileSync } from 'node:child_process';
import { GoogleGenAI } from '@google/genai';
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_SCHEMA,
  activitySchema,
  buildPrompt,
  buildRefinePrompt,
  buildStoryPrompt,
  buildWeekPrompt,
  DEFAULT_MODEL,
  parseActivities,
  parseStory,
  STORY_SCHEMA,
} from '../src/parinti/ai';
import { LIBRARY } from '../src/parinti/library';

const on = process.env.INSULA_AI_SMOKE === '1';
const only = process.env.INSULA_AI_CASE;
const profile = {
  nickname: 'Rița',
  interests: ['pandași', 'ocean', 'prințese'],
  learning: ['litere' as const, 'numere' as const],
  avoid: '',
};

async function call(prompt: string, schema: unknown) {
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
  const t0 = Date.now();
  const it = await ai.interactions.create({
    model: process.env.INSULA_AI_MODEL ?? DEFAULT_MODEL,
    input: [{ type: 'user_input', content: [{ type: 'text', text: prompt }] }],
    response_format: { type: 'text', mime_type: 'application/json', schema },
    generation_config: { thinking_level: process.env.INSULA_AI_THINK ?? 'low' },
  } as never);
  const text = (it as { output_text?: string }).output_text ?? '';
  console.log(`  ${Date.now() - t0} ms`);
  return text;
}

describe.runIf(on)('parent AI against the real Gemini API', () => {
  it.runIf(!only || only === 'ideas')('ideas (3)', { timeout: 120_000 }, async () => {
    const r = parseActivities(
      await call(
        buildPrompt({ age: 4, where: 'acasa', maxMinutes: 15 }, 'plouă', false, profile),
        ACTIVITY_SCHEMA,
      ),
      { age: 4, source: 'ai' },
    );
    console.log(r.activities.map((a) => `- ${a.title}`).join('\n'));
    expect(r.activities.length).toBeGreaterThan(0);
  });

  it.runIf(!only || only === 'refine')('refine one activity', { timeout: 120_000 }, async () => {
    const r = parseActivities(
      await call(buildRefinePrompt(LIBRARY[0], 'fara', 4, profile), activitySchema(1)),
      { age: 4, source: 'ai' },
    );
    console.log(`- ${r.activities[0]?.title}: ${r.activities[0]?.materials.join(', ')}`);
    expect(r.activities).toHaveLength(1);
  });

  it.runIf(!only || only === 'week')('week plan (7)', { timeout: 180_000 }, async () => {
    const r = parseActivities(await call(buildWeekPrompt(4, profile), activitySchema(7)), {
      age: 4,
      source: 'ai',
    });
    console.log(r.activities.map((a, i) => `${i + 1}. ${a.title} (${a.minutes} min)`).join('\n'));
    expect(r.activities.length).toBeGreaterThanOrEqual(5);
  });

  it.runIf(!only || only === 'story')('bedtime story', { timeout: 180_000 }, async () => {
    const s = parseStory(
      await call(
        buildStoryPrompt({ age: 4, topic: 'somn', minutes: 3, theme: 'pufi', profile }),
        STORY_SCHEMA,
      ),
    );
    console.log(`# ${s?.title}\n${s?.paragraphs.slice(0, 2).join('\n')}\n…\n? ${s?.questions.join(' | ')}`);
    const words = s?.paragraphs.join(' ').split(/\s+/).length ?? 0;
    console.log(`  ${words} words`);
    expect(s).not.toBeNull();
  });
});
