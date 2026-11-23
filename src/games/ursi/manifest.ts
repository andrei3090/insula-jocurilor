import { createElement } from 'react';
import { Bruno } from '../../art/Bruno';
import type { GameManifest } from '../../core/types';
import { levelSpec, SKILLS } from './logic';

export const manifest: GameManifest = {
  id: 'ursi',
  title: 'Mare, mijlociu, mic',
  titleVoice: 'game.ursi.title',
  island: 'pestera',
  ages: [4, 6],
  skills: SKILLS,
  icon: ({ size = 120 }) => createElement(Bruno, { size }),
  load: () => import('./Game'),
  levelSpec,
  roundSize: 5,
  promoteAfter: 3,
  startStep: (age) => (age <= 4 ? 0 : 1),
};
