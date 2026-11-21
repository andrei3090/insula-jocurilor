import { ACTIVITY_SCHEMA } from './ai';

export class GeminiError extends Error {}

/** Shrinks a photo to ≤ 1280 px JPEG (base64, no prefix) before it leaves the phone. */
export async function photoToJpeg(file: Blob, max = 1280): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', 0.8);
  return url.slice(url.indexOf(',') + 1);
}

/** One structured-output call to Gemini (Interactions API). Called only from the parent app. */
export async function generateJson(opts: {
  apiKey: string;
  model: string;
  prompt: string;
  jpegBase64?: string;
}): Promise<string> {
  if (!opts.apiKey) throw new GeminiError('Lipsește cheia Gemini. O pui în Setări.');
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: opts.apiKey, httpOptions: { apiVersion: 'v1beta' } });
  const content: Record<string, unknown>[] = [{ type: 'text', text: opts.prompt }];
  if (opts.jpegBase64) content.push({ type: 'image', data: opts.jpegBase64, mime_type: 'image/jpeg' });
  try {
    const it = await ai.interactions.create({
      model: opts.model,
      input: [{ type: 'user_input', content }],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: ACTIVITY_SCHEMA as unknown as Record<string, unknown>,
      },
    } as never);
    const text = (it as { output_text?: string }).output_text;
    if (!text) throw new GeminiError('Răspuns gol. Mai încearcă o dată.');
    return text;
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    const msg = String((e as Error)?.message ?? e);
    if (/401|403|API key|PERMISSION/i.test(msg))
      throw new GeminiError('Cheia nu e acceptată. Verifică-o în Setări.');
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg))
      throw new GeminiError('S-a atins limita de cereri. Încearcă peste câteva minute.');
    if (/404|not found/i.test(msg))
      throw new GeminiError('Modelul nu există. Verifică numele modelului în Setări.');
    if (/fetch|network|Failed/i.test(msg)) throw new GeminiError('Nu e conexiune la internet.');
    throw new GeminiError(`Nu a mers: ${msg.slice(0, 160)}`);
  }
}
