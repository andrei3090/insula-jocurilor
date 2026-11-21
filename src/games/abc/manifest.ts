import { createElement } from 'react';
import type { GameManifest } from '../../core/types';
import { SKILLS } from './logic';

const Icon = ({ size = 120 }: { size?: number }) =>
  createElement(
    'div',
    {
      className: 'grid place-items-center rounded-3xl bg-lagoon font-school font-bold text-white',
      style: { width: size * 0.85, height: size * 0.85, fontSize: size * 0.5 },
    },
    'A',
  );

export const manifest: GameManifest = {
  id: 'abc',
  title: 'Alfabetul animat',
  titleVoice: 'game.abc.title',
  island: 'laguna',
  ages: [4, 7],
  skills: SKILLS,
  icon: Icon,
  load: () => import('./Game'),
  roundSize: 5,
  promoteAfter: 6,
  startStep: (age) => (age <= 5 ? 0 : 1),
};
