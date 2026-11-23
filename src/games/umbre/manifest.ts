import { createElement } from 'react';
import { Emoji } from '../../art/Emoji';
import type { GameManifest } from '../../core/types';
import { levelSpec, SKILLS } from './logic';

const Icon = ({ size = 120 }: { size?: number }) =>
  createElement(
    'div',
    { className: 'relative', style: { width: size, height: size } },
    createElement(
      'span',
      { className: 'absolute right-0 bottom-0', style: { filter: 'brightness(0)', opacity: 0.75 } },
      createElement(Emoji, { name: 'elephant', size: size * 0.7 }),
    ),
    createElement(
      'span',
      { className: 'absolute top-0 left-0' },
      createElement(Emoji, { name: 'elephant', size: size * 0.62 }),
    ),
  );

export const manifest: GameManifest = {
  id: 'umbre',
  title: 'Umbrele animalelor',
  titleVoice: 'game.umbre.title',
  island: 'pestera',
  ages: [3, 4],
  skills: SKILLS,
  icon: Icon,
  load: () => import('./Game'),
  levelSpec,
  roundSize: 5,
  promoteAfter: 3,
};
