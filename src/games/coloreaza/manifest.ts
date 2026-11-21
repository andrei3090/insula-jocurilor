import { createElement } from 'react';
import { Emoji } from '../../art/Emoji';
import type { GameManifest } from '../../core/types';
import { SKILLS } from './logic';

export const manifest: GameManifest = {
  id: 'coloreaza',
  title: 'Colorează',
  titleVoice: 'game.coloreaza.title',
  island: 'atelier',
  ages: [4, 8],
  skills: SKILLS,
  icon: ({ size = 120 }) => createElement(Emoji, { name: 'crayon', size }),
  load: () => import('./Game'),
  scored: false,
};
