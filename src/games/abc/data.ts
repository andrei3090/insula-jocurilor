import type { EmojiName } from '../../art/Emoji';
import type { LineId } from '../../voice/lines';

export type LetterItem = { id: string; glyph: string; word?: string; emoji?: EmojiName; inside?: boolean };

/** Romanian alphabet in the school teaching order, each with a word and a picture where there is a good one. */
export const LETTERS: LetterItem[] = [
  { id: 'A', glyph: 'A', word: 'albină', emoji: 'honeybee' },
  { id: 'M', glyph: 'M', word: 'măr', emoji: 'red-apple' },
  { id: 'U', glyph: 'U', word: 'urs', emoji: 'bear' },
  { id: 'N', glyph: 'N', word: 'nor', emoji: 'cloud' },
  { id: 'I', glyph: 'I', word: 'iepure', emoji: 'rabbit-face' },
  { id: 'E', glyph: 'E', word: 'elefant', emoji: 'elephant' },
  { id: 'R', glyph: 'R', word: 'rachetă', emoji: 'rocket' },
  { id: 'O', glyph: 'O', word: 'ou', emoji: 'egg' },
  { id: 'C', glyph: 'C', word: 'cal', emoji: 'horse-face' },
  { id: 'A2', glyph: 'Ă', word: 'rață', emoji: 'duck', inside: true },
  { id: 'L', glyph: 'L', word: 'leu', emoji: 'lion' },
  { id: 'T', glyph: 'T', word: 'tort', emoji: 'birthday-cake' },
  { id: 'S', glyph: 'S', word: 'soare', emoji: 'sun' },
  { id: 'P', glyph: 'P', word: 'panda', emoji: 'panda' },
  { id: 'V', glyph: 'V', word: 'vulpe', emoji: 'fox' },
  { id: 'D', glyph: 'D', word: 'delfin', emoji: 'dolphin' },
  { id: 'S2', glyph: 'Ș', word: 'șarpe', emoji: 'snake' },
  { id: 'I2', glyph: 'Î', word: 'înghețată', emoji: 'soft-ice-cream' },
  { id: 'A3', glyph: 'Â', word: 'pâine', emoji: 'bread', inside: true },
  { id: 'B', glyph: 'B', word: 'balon', emoji: 'balloon' },
  { id: 'J', glyph: 'J', word: 'jucărie', emoji: 'teddy-bear' },
  { id: 'H', glyph: 'H', word: 'hipopotam', emoji: 'hippopotamus' },
  { id: 'G', glyph: 'G', word: 'gogoașă', emoji: 'doughnut' },
  { id: 'T2', glyph: 'Ț', word: 'țestoasă', emoji: 'turtle' },
  { id: 'Z', glyph: 'Z', word: 'zebră', emoji: 'zebra' },
  { id: 'F', glyph: 'F', word: 'fluture', emoji: 'butterfly' },
  { id: 'X', glyph: 'X' },
  { id: 'K', glyph: 'K', word: 'koala', emoji: 'koala' },
  { id: 'Q', glyph: 'Q' },
  { id: 'W', glyph: 'W', word: 'kiwi', emoji: 'kiwi-fruit', inside: true },
  { id: 'Y', glyph: 'Y', word: 'yo-yo', emoji: 'yo-yo' },
];

/** English alphabet A–Z (the ABC song order), each with an English word and picture where there is a good one. */
export const LETTERS_EN: LetterItem[] = [
  { id: 'A', glyph: 'A', word: 'apple', emoji: 'red-apple' },
  { id: 'B', glyph: 'B', word: 'balloon', emoji: 'balloon' },
  { id: 'C', glyph: 'C', word: 'cat', emoji: 'cat-face' },
  { id: 'D', glyph: 'D', word: 'dolphin', emoji: 'dolphin' },
  { id: 'E', glyph: 'E', word: 'elephant', emoji: 'elephant' },
  { id: 'F', glyph: 'F', word: 'fox', emoji: 'fox' },
  { id: 'G', glyph: 'G', word: 'giraffe', emoji: 'giraffe' },
  { id: 'H', glyph: 'H', word: 'horse', emoji: 'horse-face' },
  { id: 'I', glyph: 'I', word: 'ice cream', emoji: 'soft-ice-cream' },
  { id: 'J', glyph: 'J', word: 'jellyfish', emoji: 'jellyfish' },
  { id: 'K', glyph: 'K', word: 'koala', emoji: 'koala' },
  { id: 'L', glyph: 'L', word: 'lion', emoji: 'lion' },
  { id: 'M', glyph: 'M', word: 'monkey', emoji: 'monkey-face' },
  { id: 'N', glyph: 'N', word: 'nest', emoji: 'nest-with-eggs' },
  { id: 'O', glyph: 'O', word: 'octopus', emoji: 'octopus' },
  { id: 'P', glyph: 'P', word: 'panda', emoji: 'panda' },
  { id: 'Q', glyph: 'Q' },
  { id: 'R', glyph: 'R', word: 'rocket', emoji: 'rocket' },
  { id: 'S', glyph: 'S', word: 'sun', emoji: 'sun' },
  { id: 'T', glyph: 'T', word: 'tiger', emoji: 'tiger-face' },
  { id: 'U', glyph: 'U', word: 'umbrella', emoji: 'umbrella' },
  { id: 'V', glyph: 'V', word: 'violin', emoji: 'violin' },
  { id: 'W', glyph: 'W', word: 'whale', emoji: 'spouting-whale' },
  { id: 'X', glyph: 'X' },
  { id: 'Y', glyph: 'Y', word: 'yo-yo', emoji: 'yo-yo' },
  { id: 'Z', glyph: 'Z', word: 'zebra', emoji: 'zebra' },
];

export const lettersFor = (lang: 'ro' | 'en') => (lang === 'en' ? LETTERS_EN : LETTERS);

export const sayLetter = (l: LetterItem): LineId =>
  l.word ? (`abc.word.${l.id}` as LineId) : (`letter.${l.id}` as LineId);

/** Pictures usable in "Ce începe cu…?": a word that STARTS with the letter. */
export const startsWith = (l: LetterItem) => !!(l.word && l.emoji && !l.inside);
