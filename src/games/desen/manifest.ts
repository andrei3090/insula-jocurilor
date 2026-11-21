import { createElement } from 'react';
import { Emoji } from '../../art/Emoji';
import type { GameManifest } from '../../core/types';
import { SKILLS } from './logic';

export const manifest: GameManifest = {
  id: 'desen',
  title: 'Atelierul de desen',
  titleVoice: 'game.desen.title',
  island: 'atelier',
  ages: [4, 10],
  skills: SKILLS,
  icon: ({ size = 120 }) => createElement(Emoji, { name: 'artist-palette', size }),
  load: () => import('./Game'),
  scored: false,
};
