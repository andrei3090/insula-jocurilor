import { createElement } from 'react';
import type { GameManifest } from '../../core/types';
import { SKILLS } from './logic';

const Icon = ({ size = 120 }: { size?: number }) =>
  createElement(
    'div',
    {
      className: 'grid place-items-center rounded-3xl bg-bamboo-deep font-school font-bold text-white',
      style: { width: size * 0.85, height: size * 0.85, fontSize: size * 0.5 },
    },
    '123'.slice(0, 2),
  );

export const manifest: GameManifest = {
  id: 'cifre',
  title: 'Cifrele vii',
  titleVoice: 'game.cifre.title',
  island: 'bambus',
  ages: [4, 6],
  skills: SKILLS,
  icon: Icon,
  load: () => import('./Game'),
  roundSize: 5,
  promoteAfter: 3,
  startStep: (age) => (age <= 4 ? 0 : 2),
};
