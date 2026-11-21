import { describe, expect, it, vi } from 'vitest';
import { numberLine } from '../voice/numbers';
import { pickRoVoice, speakText } from './voice';

vi.stubGlobal(
  'SpeechSynthesisUtterance',
  class {
    lang = '';
    voice: unknown = null;
    rate = 1;
    pitch = 1;
    onend: ((e: Event) => void) | null = null;
    onerror: ((e: Event) => void) | null = null;
    constructor(public text: string) {}
  },
);

const v = (lang: string, name = lang, localService = true) => ({ lang, name, localService });

describe('voice selection', () => {
  it('never selects a non-ro voice', () => {
    expect(pickRoVoice([v('en-US'), v('en-GB'), v('de-DE')])).toBeNull();
  });

  it('accepts ro-RO and the Android ro_RO tag, preferring a local voice', () => {
    expect(pickRoVoice([v('en-US'), v('ro_RO', 'net', false), v('ro-RO', 'local', true)])?.name).toBe(
      'local',
    );
    expect(pickRoVoice([v('ro_RO', 'samsung', false)])?.name).toBe('samsung');
  });

  it('falls back to Web Speech only with a ro voice', async () => {
    const speak = vi.fn();
    const enOnly = { getVoices: () => [v('en-US')] as SpeechSynthesisVoice[], speak, cancel: vi.fn() };
    await speakText('Bună', enOnly);
    expect(speak).not.toHaveBeenCalled();

    const withRo = {
      getVoices: () => [v('ro-RO')] as SpeechSynthesisVoice[],
      speak: vi.fn((u: SpeechSynthesisUtterance) => u.onend?.(new Event('end') as SpeechSynthesisEvent)),
      cancel: vi.fn(),
    };
    await speakText('Bună', withRo);
    expect(withRo.speak).toHaveBeenCalledOnce();
    expect(withRo.speak.mock.calls[0][0].lang).toBe('ro-RO');
  });
});

describe('numberLine', () => {
  it('composes Romanian numbers from clips', () => {
    expect(numberLine(7)).toEqual(['num.7']);
    expect(numberLine(17)).toEqual(['num.17']);
    expect(numberLine(27)).toEqual(['num.20', 'si', 'num.7']);
    expect(numberLine(40)).toEqual(['num.40']);
    expect(numberLine(100)).toEqual(['num.100']);
    expect(() => numberLine(101)).toThrow();
  });
});
