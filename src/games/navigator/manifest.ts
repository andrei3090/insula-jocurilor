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
      { className: 'absolute top-0 right-0' },
      createElement(Emoji, { name: 'desert-island', size: size * 0.6 }),
    ),
    createElement(
      'span',
      { className: 'absolute bottom-0 left-0' },
      createElement(Emoji, { name: 'canoe', size: size * 0.6 }),
    ),
  );

export const manifest: GameManifest = {
  id: 'navigator',
  title: 'Navigatorul stelelor',
  titleVoice: 'game.navigator.title',
  island: 'laguna',
  ages: [6, 8],
  skills: SKILLS,
  icon: Icon,
  load: () => import('./Game'),
  levelSpec,
  roundSize: 4,
  promoteAfter: 3,
};
