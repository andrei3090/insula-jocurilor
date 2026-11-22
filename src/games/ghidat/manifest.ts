import { createElement } from 'react';
import { Pufi } from '../../art/Pufi';
import type { GameManifest } from '../../core/types';
import { SKILLS } from './logic';

export const manifest: GameManifest = {
  id: 'ghidat',
  title: 'Desenăm cu Pufi',
  titleVoice: 'game.ghidat.title',
  island: 'atelier',
  ages: [4, 8],
  skills: SKILLS,
  icon: ({ size = 120 }) => createElement(Pufi, { size }),
  load: () => import('./Game'),
  // one finished drawing is one round: a sticker for every drawing
  roundSize: 1,
};
