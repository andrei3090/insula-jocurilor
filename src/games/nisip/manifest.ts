import { createElement } from 'react';
import { Marina } from '../../art/Marina';
import type { GameManifest } from '../../core/types';
import { levelSpec, SKILLS } from './logic';

export const manifest: GameManifest = {
  id: 'nisip',
  title: 'Scrie pe nisip',
  titleVoice: 'game.nisip.title',
  island: 'laguna',
  ages: [4, 8],
  skills: SKILLS,
  icon: ({ size = 120 }) => createElement(Marina, { size }),
  load: () => import('./Game'),
  levelSpec,
  roundSize: 4,
  promoteAfter: 8,
  startStep: (age) => (age <= 5 ? 0 : 1),
};
