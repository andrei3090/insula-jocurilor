import { createElement } from 'react';
import { Bamboo } from '../../art/Bamboo';
import { Pufi } from '../../art/Pufi';
import type { GameManifest } from '../../core/types';
import { levelSpec, SKILLS } from './logic';

const Icon = ({ size = 120 }: { size?: number }) =>
  createElement(
    'div',
    { className: 'relative', style: { width: size, height: size } },
    createElement(Pufi, { size }),
    createElement(
      'div',
      { className: 'absolute bottom-0 right-0' },
      createElement(Bamboo, { height: size * 0.6 }),
    ),
  );

export const manifest: GameManifest = {
  id: 'panda',
  title: 'Hrănește-l pe Pufi',
  titleVoice: 'game.panda.title',
  island: 'bambus',
  ages: [4, 7],
  skills: SKILLS,
  icon: Icon,
  load: () => import('./Game'),
  levelSpec,
  roundSize: 5,
  promoteAfter: 3,
  startStep: (age) => (age <= 4 ? 0 : age === 5 ? 1 : age === 6 ? 3 : 5),
};
