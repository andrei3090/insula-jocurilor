import { createElement } from 'react';
import { Cenusareasa } from '../../art/Cenusareasa';
import type { GameManifest } from '../../core/types';
import { SKILLS } from './logic';

export const manifest: GameManifest = {
  id: 'memorie',
  title: 'Memorie la bal',
  titleVoice: 'game.memorie.title',
  island: 'castel',
  ages: [4, 10],
  skills: SKILLS,
  icon: ({ size = 120 }) => createElement(Cenusareasa, { size }),
  load: () => import('./Game'),
  roundSize: 3,
  promoteAfter: 2,
  startStep: (age) => (age <= 4 ? 0 : age <= 5 ? 1 : age <= 7 ? 2 : 3),
};
